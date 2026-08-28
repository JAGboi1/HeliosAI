// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRitualWallet {
    function deposit(uint256 lockDuration) external payable;
    function balanceOf(address user) external view returns (uint256);
    function lockUntil(address user) external view returns (uint256);
    function withdraw(uint256 amount) external;
}

interface ITEEServiceRegistry {
    struct TEEServiceNode {
        address paymentAddress;
        address teeAddress;
        uint8 teeType;
        bytes publicKey;
        string endpoint;
        bytes32 certPubKeyHash;
        uint8 capability;
    }
    struct TEEServiceContext {
        TEEServiceNode node;
        bool isValid;
        bytes32 workloadId;
    }
    function getServicesByCapability(
        uint8 capability,
        bool checkValidity
    ) external view returns (TEEServiceContext[] memory);
}

contract HeliosArena is ERC721, Ownable {

    // ── System contracts ──────────────────────────────────────────────────────
    address constant IMAGE_PRECOMPILE     = 0x0000000000000000000000000000000000000818;
    address constant RITUAL_WALLET        = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;
    address constant ASYNC_DELIVERY       = 0x5A16214fF555848411544b005f7Ac063742f39F6;
    address constant TEE_SERVICE_REGISTRY = 0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F;
    uint8   constant IMAGE_CAPABILITY     = 7;

    // ── Rarity tiers ──────────────────────────────────────────────────────────
    enum Rarity { COMMON, RARE, ULTRA_RARE, LEGENDARY }

    // streak < 10  → COMMON
    // streak >= 10 → RARE
    // streak >= 20 → ULTRA_RARE
    // streak >= 30 → LEGENDARY + 1x RARE bonus
    // streak >= 40 → LEGENDARY + 1x ULTRA_RARE bonus

    // ── Data structures ───────────────────────────────────────────────────────
    struct BattleResult {
        address winner;
        address loser;
        string  winnerFighterName;
        string  loserFighterName;
        string  battleStory;
        uint256 matchId;
        uint256 timestamp;
        string  imageUri;
        uint256 tokenId;
        uint256 bonusTokenId;       // second token for 30+/40+ streaks (0 if none)
        bool    imageGenerated;
        bool    minted;
        Rarity  rarity;
        uint256 winStreak;          // winner's streak at time of battle
    }

    struct ModalInput {
        uint8   inputType;
        bytes   data;
        string  uri;
        bytes32 contentHash;
        uint32  param1;
        uint32  param2;
        bool    encrypted;
    }

    struct OutputConfig {
        uint8   outputType;
        uint32  maxParam1;
        uint32  maxParam2;
        uint32  maxParam3;
        bool    encryptOutput;
        uint16  numInferenceSteps;
        uint16  guidanceScaleX100;
        uint32  seed;
        uint8   fps;
        string  negativePrompt;
    }

    // ── Storage ───────────────────────────────────────────────────────────────
    mapping(uint256 => BattleResult) public battleResults;
    mapping(address => uint256[])    public winnerBattles;
    mapping(address => uint256[])    public loserBattles;
    mapping(bytes32 => uint256)      public pendingImageForMatch;
    mapping(uint256 => bool)         public matchHasPendingImage;
    mapping(uint256 => string)       public tokenURIs;
    mapping(address => uint256)      public winStreaks;   // current streak per wallet
    mapping(address => uint256)      public maxWinStreaks; // all-time best streak

    uint256 public nextMatchId = 1;
    uint256 public nextTokenId = 1;

    bytes public encryptedPinataCredentials;

    // ── Events ────────────────────────────────────────────────────────────────
    event BattleRecorded(
        uint256 indexed matchId,
        address indexed winner,
        address indexed loser,
        string winnerFighterName,
        string loserFighterName,
        Rarity rarity,
        uint256 winStreak
    );
    event ImageGenerationRequested(uint256 indexed matchId, bytes32 indexed taskId);
    event ImageGenerated(uint256 indexed matchId, string imageUri, bytes32 contentHash);
    event ImageGenerationFailed(uint256 indexed matchId, string error);
    event VictoryNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed matchId,
        address indexed winner,
        string imageUri,
        Rarity rarity
    );
    event BonusNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed matchId,
        address indexed winner,
        Rarity bonusRarity
    );

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyAsyncDelivery() {
        require(msg.sender == ASYNC_DELIVERY, "Only async delivery");
        _;
    }

    modifier onlyWinner(uint256 matchId) {
        require(battleResults[matchId].winner == msg.sender, "Only winner can mint");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() ERC721("HeliosArena Victory", "HELIOS") Ownable(msg.sender) {}

    // ── Owner: set encrypted Pinata credentials ───────────────────────────────
    function setEncryptedCredentials(bytes calldata _encryptedCreds) external onlyOwner {
        encryptedPinataCredentials = _encryptedCreds;
    }

    // ── Internal: compute rarity from streak ──────────────────────────────────
    function _computeRarity(uint256 streak) internal pure returns (Rarity) {
        if (streak >= 20) return Rarity.ULTRA_RARE;
        if (streak >= 10) return Rarity.RARE;
        return Rarity.COMMON;
        // LEGENDARY is handled separately (30+/40+) since it also mints a bonus token
    }

    function _isLegendary(uint256 streak) internal pure returns (bool) {
        return streak >= 30;
    }

    function _bonusRarity(uint256 streak) internal pure returns (Rarity) {
        // 40+ → bonus is ULTRA_RARE, 30-39 → bonus is RARE
        return streak >= 40 ? Rarity.ULTRA_RARE : Rarity.RARE;
    }

    // ── Step 1: Record battle result ──────────────────────────────────────────
    function recordBattleResult(
        string calldata matchIdStr,
        address winner,
        address loser,
        string calldata winnerFighterName,
        string calldata loserFighterName,
        string calldata battleStory
    ) external returns (uint256 matchId) {
        require(winner != address(0) && loser != address(0), "Invalid addresses");
        require(winner != loser, "Winner and loser must differ");

        // Update streaks
        winStreaks[winner] += 1;
        winStreaks[loser]   = 0; // loss resets streak

        uint256 currentStreak = winStreaks[winner];
        if (currentStreak > maxWinStreaks[winner]) {
            maxWinStreaks[winner] = currentStreak;
        }

        // Determine rarity
        Rarity rarity = _isLegendary(currentStreak)
            ? Rarity.LEGENDARY
            : _computeRarity(currentStreak);

        matchId = nextMatchId++;

        battleResults[matchId] = BattleResult({
            winner:            winner,
            loser:             loser,
            winnerFighterName: winnerFighterName,
            loserFighterName:  loserFighterName,
            battleStory:       battleStory,
            matchId:           matchId,
            timestamp:         block.timestamp,
            imageUri:          "",
            tokenId:           0,
            bonusTokenId:      0,
            imageGenerated:    false,
            minted:            false,
            rarity:            rarity,
            winStreak:         currentStreak
        });

        winnerBattles[winner].push(matchId);
        loserBattles[loser].push(matchId);

        emit BattleRecorded(matchId, winner, loser, winnerFighterName, loserFighterName, rarity, currentStreak);
    }

    // ── Step 2: Winner triggers image generation ──────────────────────────────
    function generateBattleImage(uint256 matchId) external onlyWinner(matchId) {
        BattleResult storage battle = battleResults[matchId];
        require(!battle.imageGenerated,         "Image already generated");
        require(!matchHasPendingImage[matchId], "Generation in progress");
        require(encryptedPinataCredentials.length > 0, "Pinata credentials not set");

        ITEEServiceRegistry.TEEServiceContext[] memory services =
            ITEEServiceRegistry(TEE_SERVICE_REGISTRY)
                .getServicesByCapability(IMAGE_CAPABILITY, true);
        require(services.length > 0, "No image executors available");

        address executor = services[0].node.teeAddress;

        matchHasPendingImage[matchId] = true;

        // Build prompt based on rarity
        string memory prompt = _buildPrompt(battle);

        bytes memory requestData = _buildImageRequest(executor, prompt);
        (bool ok, bytes memory result) = IMAGE_PRECOMPILE.call(requestData);
        require(ok, "Image precompile call failed");

        string memory taskIdStr = abi.decode(result, (string));
        bytes32 taskId = keccak256(bytes(taskIdStr));
        pendingImageForMatch[taskId] = matchId;

        emit ImageGenerationRequested(matchId, taskId);
    }

    // ── Step 3: Winner mints NFT(s) after image is ready ─────────────────────
    function mintVictoryNFT(uint256 matchId) external payable onlyWinner(matchId) {
        BattleResult storage battle = battleResults[matchId];
        require(battle.imageGenerated, "Image not ready yet");
        require(!battle.minted,        "NFT already minted");

        // Deposit RITUAL for image fees
        if (msg.value > 0) {
            IRitualWallet(RITUAL_WALLET).deposit{value: msg.value}(100000);
        }

        uint256 tokenId = nextTokenId++;
        battle.tokenId = tokenId;
        battle.minted  = true;

        tokenURIs[tokenId] = _buildTokenURI(battle, battle.rarity);
        _safeMint(msg.sender, tokenId);

        emit VictoryNFTMinted(tokenId, matchId, msg.sender, battle.imageUri, battle.rarity);

        // Mint bonus token for 30+ streaks
        if (_isLegendary(battle.winStreak)) {
            Rarity bonus = _bonusRarity(battle.winStreak);
            uint256 bonusTokenId = nextTokenId++;
            battle.bonusTokenId = bonusTokenId;

            tokenURIs[bonusTokenId] = _buildTokenURI(battle, bonus);
            _safeMint(msg.sender, bonusTokenId);

            emit BonusNFTMinted(bonusTokenId, matchId, msg.sender, bonus);
        }
    }

    // ── Callback: Ritual delivers image URI ───────────────────────────────────
    function onImageReady(bytes32 jobId, bytes calldata responseData) external onlyAsyncDelivery {
        uint256 matchId = pendingImageForMatch[jobId];
        require(matchId > 0, "No pending image for job");

        delete pendingImageForMatch[jobId];
        matchHasPendingImage[matchId] = false;

        (
            bool hasError,
            ,
            string memory outputUri,
            bytes32 contentHash,
            ,,,, 
            string memory errorMessage
        ) = abi.decode(responseData, (bool, bytes, string, bytes32, bool, uint32, uint32, uint32, string));

        if (hasError) {
            emit ImageGenerationFailed(matchId, errorMessage);
            return;
        }

        battleResults[matchId].imageUri       = outputUri;
        battleResults[matchId].imageGenerated = true;

        emit ImageGenerated(matchId, outputUri, contentHash);
    }

    // ── Internal: build rarity-specific image prompt ──────────────────────────
    function _buildPrompt(BattleResult storage battle) internal view returns (string memory) {
        string memory rarityStyle;
        string memory rarityLabel;

        Rarity r = battle.rarity;

        if (r == Rarity.COMMON) {
            rarityStyle = "standard dark fantasy pixel art style, 16-bit RPG aesthetic, muted stone arena background, simple torch lighting";
            rarityLabel = "COMMON";
        } else if (r == Rarity.RARE) {
            rarityStyle = "detailed dark fantasy pixel art, glowing golden borders, 16-bit RPG style with rich gold and amber magical effects, ornate stone arena with golden runes";
            rarityLabel = "RARE";
        } else if (r == Rarity.ULTRA_RARE) {
            rarityStyle = "premium dark fantasy pixel art, shimmering silver and blue aura effects, 16-bit style with crystalline magical energy, ethereal arena with silver runes and ice effects, radiant blue glow";
            rarityLabel = "ULTRA RARE";
        } else {
            // LEGENDARY
            rarityStyle = "LEGENDARY dark fantasy pixel art, full cinematic composition, deep purples and blazing golds, 16-bit pixel art with dramatic god-ray lighting, ancient mythic arena, cosmic background with stars and nebula visible through arena ceiling, divine energy crackling around winner";
            rarityLabel = "LEGENDARY";
        }

        return string(abi.encodePacked(
            "A dark fantasy pixel art battle card NFT. ",
            rarityStyle, ". ",
            "Two warriors clash dramatically. The scene depicts: ", battle.battleStory, ". ",
            "Winner '", battle.winnerFighterName, "' stands victorious in the foreground with glowing energy aura. ",
            "Defeated warrior '", battle.loserFighterName, "' falls behind. ",
            "Top banner reads '", battle.winnerFighterName, " DEFEATS ", battle.loserFighterName, "' in pixel font. ",
            "Bottom badge shows '", rarityLabel, "' rarity tier in ornate pixel lettering. ",
            "Win streak flame counter shows '", _toString(battle.winStreak), " WINS' in corner. ",
            "Octopath Traveler inspired art direction. High contrast. Collectible NFT card format. Portrait orientation. Dark gothic atmosphere."
        ));
    }

    // ── Internal: build token URI ─────────────────────────────────────────────
    function _buildTokenURI(
        BattleResult storage battle,
        Rarity rarity
    ) internal view returns (string memory) {
        string memory rarityName = _rarityName(rarity);
        return string(abi.encodePacked(
            "data:application/json;charset=utf-8,",
            '{"name":"Helios Arena - ', rarityName, ' #', _toString(battle.matchId), '",',
            '"description":"', battle.battleStory, '",',
            '"image":"', battle.imageUri, '",',
            '"attributes":[',
            '{"trait_type":"Rarity","value":"',        rarityName,                '"},',
            '{"trait_type":"Win Streak","value":"',    _toString(battle.winStreak), '"},',
            '{"trait_type":"Winner","value":"',        battle.winnerFighterName,   '"},',
            '{"trait_type":"Loser","value":"',         battle.loserFighterName,    '"},',
            '{"trait_type":"Match ID","value":"',      _toString(battle.matchId),  '"}',
            ']}'
        ));
    }

    function _rarityName(Rarity r) internal pure returns (string memory) {
        if (r == Rarity.COMMON)     return "Common";
        if (r == Rarity.RARE)       return "Rare";
        if (r == Rarity.ULTRA_RARE) return "Ultra Rare";
        return "Legendary";
    }

    // ── View functions ────────────────────────────────────────────────────────
    function getBattle(uint256 matchId) external view returns (BattleResult memory) {
        return battleResults[matchId];
    }

    function getWinnerBattles(address winner) external view returns (uint256[] memory) {
        return winnerBattles[winner];
    }

    function getLoserBattles(address loser) external view returns (uint256[] memory) {
        return loserBattles[loser];
    }

    function hasPendingImage(uint256 matchId) external view returns (bool) {
        return matchHasPendingImage[matchId];
    }

    function getWalletInfo(address user) external view returns (uint256 balance, uint256 lockExpiry) {
        balance    = IRitualWallet(RITUAL_WALLET).balanceOf(user);
        lockExpiry = IRitualWallet(RITUAL_WALLET).lockUntil(user);
    }

    function getStreaks(address user) external view returns (uint256 current, uint256 best) {
        current = winStreaks[user];
        best    = maxWinStreaks[user];
    }

    function getRarityForStreak(uint256 streak) external pure returns (string memory) {
        if (streak >= 30) return "Legendary";
        if (streak >= 20) return "Ultra Rare";
        if (streak >= 10) return "Rare";
        return "Common";
    }

    function getTotalBattles() external view returns (uint256) {
        return nextMatchId - 1;
    }

    function getTotalNFTs() external view returns (uint256) {
        return nextTokenId - 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }

    function depositForFees(uint256 lockDuration) external payable {
        IRitualWallet(RITUAL_WALLET).deposit{value: msg.value}(lockDuration);
    }

    // ── Internal: build Ritual image precompile request ───────────────────────
    function _buildImageRequest(
        address executor,
        string memory prompt
    ) internal view returns (bytes memory) {
        ModalInput[] memory inputs = new ModalInput[](1);
        inputs[0] = ModalInput({
            inputType:   0,
            data:        bytes(prompt),
            uri:         "",
            contentHash: bytes32(0),
            param1:      0,
            param2:      0,
            encrypted:   false
        });

        OutputConfig memory output = OutputConfig({
            outputType:        1,
            maxParam1:         1024,
            maxParam2:         1024,
            maxParam3:         0,
            encryptOutput:     false,
            numInferenceSteps: 0,
            guidanceScaleX100: 0,
            seed:              0,
            fps:               0,
            negativePrompt:    ""
        });

        bytes[] memory encSecrets = new bytes[](1);
        encSecrets[0] = encryptedPinataCredentials;

        return abi.encode(
            executor,
            encSecrets,
            uint256(300),
            new bytes[](0),
            bytes(""),
            uint64(5),
            uint64(1000),
            "IMAGE_TASK",
            address(this),
            this.onImageReady.selector,
            uint256(500_000),
            uint256(1_000_000_000),
            uint256(100_000_000),
            uint256(0),
            "black-forest-labs/FLUX.2-klein-4B",
            inputs,
            output,
            abi.encode(
                "pinata",
                string(abi.encodePacked("helios-arena/battle-", _toString(block.timestamp))),
                "PINATA_CREDS"
            )
        );
    }

    // ── Internal: uint to string ──────────────────────────────────────────────
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ── Test helper (owner only) ──────────────────────────────────────────────
    function setPendingImageForTest(uint256 matchId, bytes32 jobId) external onlyOwner {
        matchHasPendingImage[matchId] = true;
        pendingImageForMatch[jobId]   = matchId;
    }

    receive() external payable {}
}
