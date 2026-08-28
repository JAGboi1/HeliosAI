// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HeliosArena} from "../src/HeliosArena.sol";

contract HeliosArenaTest is Test {
    HeliosArena public arena;
    address constant ASYNC_DELIVERY = 0x5A16214fF555848411544b005f7Ac063742f39F6;

    address public winner = address(0x1);
    address public loser  = address(0x2);
    address public owner  = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        arena = new HeliosArena();
        vm.stopPrank();
    }

    function test_RecordBattleResult() public {
        vm.prank(winner);
        uint256 matchId = arena.recordBattleResult(
            "match-001",
            winner, loser,
            "Dragon Warrior", "Phoenix Fighter",
            "Epic battle between fire and ice"
        );

        assertEq(matchId, 1);

        HeliosArena.BattleResult memory battle = arena.getBattle(matchId);
        assertEq(battle.winner, winner);
        assertEq(battle.loser, loser);
        assertEq(battle.winnerFighterName, "Dragon Warrior");
        assertEq(battle.loserFighterName, "Phoenix Fighter");
        assertEq(battle.battleStory, "Epic battle between fire and ice");
        assertEq(battle.matchId, 1);
        assertEq(battle.imageGenerated, false);
        assertEq(battle.winStreak, 1); // first win = streak of 1
        assertEq(uint8(battle.rarity), uint8(HeliosArena.Rarity.COMMON)); // streak 1 = COMMON
    }

    function test_CannotRecordInvalidBattle() public {
        vm.expectRevert("Invalid addresses");
        arena.recordBattleResult("m1", address(0), loser, "Dragon", "Phoenix", "Battle story");

        vm.expectRevert("Invalid addresses");
        arena.recordBattleResult("m2", winner, address(0), "Dragon", "Phoenix", "Battle story");

        vm.expectRevert("Winner and loser must differ");
        arena.recordBattleResult("m3", winner, winner, "Dragon", "Phoenix", "Battle story");
    }

    function test_WinnerBattleTracking() public {
        vm.prank(winner);
        uint256 matchId1 = arena.recordBattleResult("m1", winner, loser, "A", "B", "Story 1");
        vm.prank(winner);
        uint256 matchId2 = arena.recordBattleResult("m2", winner, loser, "C", "D", "Story 2");

        uint256[] memory winnerBattles = arena.getWinnerBattles(winner);
        assertEq(winnerBattles.length, 2);
        assertEq(winnerBattles[0], matchId1);
        assertEq(winnerBattles[1], matchId2);

        uint256[] memory loserBattles = arena.getLoserBattles(loser);
        assertEq(loserBattles.length, 2);
        assertEq(loserBattles[0], matchId1);
        assertEq(loserBattles[1], matchId2);
    }

    function test_OnlyWinnerCanMint() public {
        vm.prank(winner);
        uint256 matchId = arena.recordBattleResult("m1", winner, loser, "A", "B", "Story");

        vm.expectRevert("Only winner can mint");
        vm.prank(loser);
        arena.mintVictoryNFT(matchId);

        vm.expectRevert("Image not ready yet");
        vm.prank(winner);
        arena.mintVictoryNFT(matchId);
    }

    function test_CallbackOnlyFromAsyncDelivery() public {
        bytes32 jobId = bytes32("test_job");
        bytes memory responseData = abi.encode(
            false, bytes(""), "ipfs://test",
            bytes32("hash"), false,
            uint32(1000), uint32(512), uint32(512), ""
        );

        vm.expectRevert("Only async delivery");
        arena.onImageReady(jobId, responseData);

        vm.prank(ASYNC_DELIVERY);
        vm.expectRevert("No pending image for job");
        arena.onImageReady(jobId, responseData);
    }

    function test_ImageGenerationCallback() public {
        vm.prank(winner);
        uint256 matchId = arena.recordBattleResult("m1", winner, loser, "A", "B", "Story");

        bytes32 jobId = keccak256(abi.encodePacked("helios_job_", matchId));

        vm.prank(owner);
        arena.setPendingImageForTest(matchId, jobId);

        bytes memory responseData = abi.encode(
            false, bytes(""), "ipfs://test",
            bytes32(uint256(0x1234)), false,
            uint32(1000), uint32(512), uint32(512), ""
        );

        vm.prank(ASYNC_DELIVERY);
        arena.onImageReady(jobId, responseData);

        HeliosArena.BattleResult memory battle = arena.getBattle(matchId);
        assertEq(battle.imageUri, "ipfs://test");
        assertTrue(battle.imageGenerated);
        assertFalse(arena.hasPendingImage(matchId));
    }

    function test_ImageGenerationErrorCallback() public {
        vm.prank(winner);
        uint256 matchId = arena.recordBattleResult("m1", winner, loser, "A", "B", "Story");

        bytes32 jobId = keccak256(abi.encodePacked("helios_err_", matchId));

        vm.prank(owner);
        arena.setPendingImageForTest(matchId, jobId);

        bytes memory responseData = abi.encode(
            true, bytes(""), "",
            bytes32(0), false,
            uint32(0), uint32(0), uint32(0), "Generation failed"
        );

        vm.prank(ASYNC_DELIVERY);
        arena.onImageReady(jobId, responseData);

        assertFalse(arena.hasPendingImage(matchId));
        HeliosArena.BattleResult memory battle = arena.getBattle(matchId);
        assertEq(battle.imageUri, "");
        assertFalse(battle.imageGenerated);
    }

    function test_WalletInfo() public view {
        assertTrue(address(arena) != address(0));
    }

    function test_GetTotalCounts() public {
        assertEq(arena.getTotalBattles(), 0);
        assertEq(arena.getTotalNFTs(), 0);

        vm.prank(winner);
        arena.recordBattleResult("m1", winner, loser, "A", "B", "Story");

        assertEq(arena.getTotalBattles(), 1);
        assertEq(arena.getTotalNFTs(), 0);
    }

    function test_WinStreakAndRarity() public {
        // 1-9 wins = COMMON
        vm.prank(winner);
        uint256 m1 = arena.recordBattleResult("m1", winner, loser, "A", "B", "Story");
        HeliosArena.BattleResult memory b1 = arena.getBattle(m1);
        assertEq(uint8(b1.rarity), uint8(HeliosArena.Rarity.COMMON));
        assertEq(b1.winStreak, 1);

        // Simulate 9 more wins to hit streak 10 = RARE
        for (uint256 i = 2; i <= 10; i++) {
            vm.prank(winner);
            arena.recordBattleResult(
                string(abi.encodePacked("m", _toString(i))),
                winner, loser, "A", "B", "Story"
            );
        }
        HeliosArena.BattleResult memory b10 = arena.getBattle(10);
        assertEq(uint8(b10.rarity), uint8(HeliosArena.Rarity.RARE));
        assertEq(b10.winStreak, 10);

        // Streak resets on loss
        arena.recordBattleResult("loss1", loser, winner, "X", "Y", "Story"); // winner loses here
        (uint256 currentStreak, ) = arena.getStreaks(winner);
        assertEq(currentStreak, 0);
    }

    function test_LegendaryStreakMintsTwoTokens() public {
        // Build up 30 wins for winner
        for (uint256 i = 1; i <= 30; i++) {
            vm.prank(winner);
            arena.recordBattleResult(
                string(abi.encodePacked("m", _toString(i))),
                winner, loser, "A", "B", "Story"
            );
        }

        HeliosArena.BattleResult memory b30 = arena.getBattle(30);
        assertEq(uint8(b30.rarity), uint8(HeliosArena.Rarity.LEGENDARY));
        assertEq(b30.winStreak, 30);

        // Simulate image ready so we can mint
        bytes32 jobId = keccak256(abi.encodePacked("helios_job_30"));
        vm.prank(owner);
        arena.setPendingImageForTest(30, jobId);

        bytes memory responseData = abi.encode(
            false, bytes(""), "ipfs://legendary",
            bytes32(uint256(0xABCD)), false,
            uint32(1000), uint32(512), uint32(512), ""
        );
        vm.prank(ASYNC_DELIVERY);
        arena.onImageReady(jobId, responseData);

        // Winner mints — should get 2 tokens (LEGENDARY + RARE bonus)
        vm.prank(winner);
        arena.mintVictoryNFT(30);

        assertEq(arena.getTotalNFTs(), 2);

        HeliosArena.BattleResult memory minted = arena.getBattle(30);
        assertTrue(minted.tokenId > 0);
        assertTrue(minted.bonusTokenId > 0);
        assertTrue(minted.minted);
    }

    function test_RarityLookup() public view {
        assertEq(arena.getRarityForStreak(1),  "Common");
        assertEq(arena.getRarityForStreak(9),  "Common");
        assertEq(arena.getRarityForStreak(10), "Rare");
        assertEq(arena.getRarityForStreak(19), "Rare");
        assertEq(arena.getRarityForStreak(20), "Ultra Rare");
        assertEq(arena.getRarityForStreak(29), "Ultra Rare");
        assertEq(arena.getRarityForStreak(30), "Legendary");
        assertEq(arena.getRarityForStreak(40), "Legendary");
    }

    // ── Helper ────────────────────────────────────────────────────────────────
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
}



