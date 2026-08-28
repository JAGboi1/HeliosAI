"use client"
 
import { useState, useEffect } from "react"
import { usePublicClient } from "wagmi"
 
// ── ABI (only what we need) ───────────────────────────────────────────────────
const HELIOS_ABI = [
  {
    name: "getWinnerBattles",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "winner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getStreaks",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "current", type: "uint256" },
      { name: "best",    type: "uint256" },
    ],
  },
  {
    name: "getBattle",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "winner",            type: "address" },
          { name: "loser",             type: "address" },
          { name: "winnerFighterName", type: "string"  },
          { name: "loserFighterName",  type: "string"  },
          { name: "battleStory",       type: "string"  },
          { name: "matchId",           type: "uint256" },
          { name: "timestamp",         type: "uint256" },
          { name: "imageUri",          type: "string"  },
          { name: "tokenId",           type: "uint256" },
          { name: "bonusTokenId",      type: "uint256" },
          { name: "imageGenerated",    type: "bool"    },
          { name: "minted",            type: "bool"    },
          { name: "rarity",            type: "uint8"   },
          { name: "winStreak",         type: "uint256" },
        ],
      },
    ],
  },
] as const
 
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HELIOS_ARENA_CONTRACT as `0x${string}` | undefined
 
// ── Rarity config ─────────────────────────────────────────────────────────────
const RARITY_CONFIG = {
  0: { label: "COMMON",     color: "#aaaaaa", glow: "rgba(170,170,170,0.3)", border: "#444" },
  1: { label: "RARE",       color: "#ffcc44", glow: "rgba(255,204,68,0.35)",  border: "#996600" },
  2: { label: "ULTRA RARE", color: "#66aaff", glow: "rgba(102,170,255,0.4)",  border: "#224488" },
  3: { label: "LEGENDARY",  color: "#cc66ff", glow: "rgba(204,102,255,0.5)",  border: "#660099" },
} as const
 
type RarityKey = keyof typeof RARITY_CONFIG
 
interface MintedNFT {
  matchId:           bigint
  tokenId:           bigint
  bonusTokenId:      bigint
  winnerFighterName: string
  loserFighterName:  string
  battleStory:       string
  imageUri:          string
  rarity:            number
  winStreak:         bigint
  timestamp:         bigint
}
 
interface NftGalleryProps {
  walletAddress: string // full address (not shortened)
}
 
export function NftGallery({ walletAddress }: NftGalleryProps) {
  const publicClient = usePublicClient()
 
  const [nfts,         setNfts]         = useState<MintedNFT[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [streaks,      setStreaks]      = useState<{ current: bigint; best: bigint } | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
 
  useEffect(() => {
    if (!walletAddress || !publicClient || !CONTRACT_ADDRESS) return
    fetchNFTs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, publicClient])
 
  const fetchNFTs = async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return
    setLoading(true)
    setError(null)
 
    try {
      const addr = walletAddress as `0x${string}`
 
      // Fetch win streak alongside battles
      const [matchIds, streakData] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi:     HELIOS_ABI,
          functionName: "getWinnerBattles",
          args:    [addr],
        }) as Promise<bigint[]>,
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi:     HELIOS_ABI,
          functionName: "getStreaks",
          args:    [addr],
        }) as Promise<[bigint, bigint]>,
      ])
 
      setStreaks({ current: streakData[0], best: streakData[1] })
 
      if (matchIds.length === 0) {
        setNfts([])
        return
      }
 
      // Fetch all battles in parallel
      const battles = await Promise.all(
        matchIds.map((id) =>
          publicClient.readContract({
            address: CONTRACT_ADDRESS!,
            abi:     HELIOS_ABI,
            functionName: "getBattle",
            args:    [id],
          }) as Promise<any>
        )
      )
 
      // Keep only minted ones, newest first
      const minted: MintedNFT[] = battles
        .filter((b) => b.minted)
        .map((b) => ({
          matchId:           b.matchId,
          tokenId:           b.tokenId,
          bonusTokenId:      b.bonusTokenId,
          winnerFighterName: b.winnerFighterName,
          loserFighterName:  b.loserFighterName,
          battleStory:       b.battleStory,
          imageUri:          b.imageUri,
          rarity:            Number(b.rarity),
          winStreak:         b.winStreak,
          timestamp:         b.timestamp,
        }))
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
 
      setNfts(minted)
    } catch (err: any) {
      console.error("NFT fetch error:", err)
      setError("Failed to load NFTs. Make sure your wallet is on Ritual Chain.")
    } finally {
      setLoading(false)
    }
  }
 
  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-8 h-8 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#555] font-mono text-xs animate-pulse">Loading your NFTs from Ritual Chain...</p>
      </div>
    )
  }
 
  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-[#0e0e18] border border-[#ff444433] p-4 text-center">
        <p className="text-[#ff4444] font-mono text-xs mb-3">{error}</p>
        <button
          onClick={fetchNFTs}
          className="bg-[#1a1a2a] border border-[#333] text-[#bbb] text-[9px] tracking-[1px] uppercase py-2 px-4 hover:bg-[#22223a] transition-colors"
        >
          RETRY
        </button>
      </div>
    )
  }
 
  // ── No contract ───────────────────────────────────────────────────────────
  if (!CONTRACT_ADDRESS) {
    return (
      <p className="text-[#444] font-mono text-xs text-center py-6">
        Contract not configured. Add NEXT_PUBLIC_HELIOS_ARENA_CONTRACT to env vars.
      </p>
    )
  }
 
  // ── Streak banner (show if we have data) ─────────────────────────────────
  const streakBanner = streaks && (streaks.current > 0n || streaks.best > 0n) ? (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 text-center">
        <span className="text-[7px] text-[#555] block tracking-[1px] mb-1">CURRENT STREAK</span>
        <span className="font-mono text-[18px] text-[#ffaa00]">{streaks.current.toString()}</span>
        <span className="text-[#555] text-[9px] ml-1">🔥</span>
      </div>
      <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 text-center">
        <span className="text-[7px] text-[#555] block tracking-[1px] mb-1">BEST STREAK</span>
        <span className="font-mono text-[18px] text-[#bb55ff]">{streaks.best.toString()}</span>
        <span className="text-[#555] text-[9px] ml-1">⚡</span>
      </div>
      <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 text-center">
        <span className="text-[7px] text-[#555] block tracking-[1px] mb-1">NFTS MINTED</span>
        <span className="font-mono text-[18px] text-[#00aaaa]">{nfts.length}</span>
        <span className="text-[#555] text-[9px] ml-1">🏅</span>
      </div>
    </div>
  ) : null
 
  // ── Empty state ───────────────────────────────────────────────────────────
  if (nfts.length === 0) {
    return (
      <div>
        {streakBanner}
        <div className="bg-[#0e0e18] border border-[#1a1a28] p-8 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-[#555] font-mono text-xs leading-relaxed">
            No victory NFTs yet.<br />
            Win a battle and click <span className="text-[#ffaa00]">IMMORTALIZE</span> to mint your first one.
          </p>
        </div>
      </div>
    )
  }
 
  // ── NFT Cards ─────────────────────────────────────────────────────────────
  return (
    <div>
      {streakBanner}
 
      <div className="space-y-3">
        {nfts.map((nft) => {
          const r = RARITY_CONFIG[nft.rarity as RarityKey] ?? RARITY_CONFIG[0]
          const cardKey = nft.tokenId.toString()
          const isExpanded = expandedCard === cardKey
          const date = new Date(Number(nft.timestamp) * 1000).toLocaleDateString()
          const isLegendary = nft.rarity === 3
 
          return (
            <div
              key={cardKey}
              className="bg-[#0a0a12] border overflow-hidden transition-all duration-300"
              style={{
                borderColor: r.border,
                boxShadow: `0 0 12px ${r.glow}`,
              }}
            >
              {/* Card header — always visible */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#0e0e18] transition-colors"
                onClick={() => setExpandedCard(isExpanded ? null : cardKey)}
              >
                {/* Image thumbnail */}
                <div
                  className="w-12 h-12 flex-shrink-0 border flex items-center justify-center overflow-hidden"
                  style={{ borderColor: r.border }}
                >
                  {nft.imageUri ? (
                    <img
                      src={nft.imageUri}
                      alt={`${nft.winnerFighterName} NFT`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <span className="text-xl">⚔️</span>
                  )}
                </div>
 
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[8px] font-mono tracking-[1px] px-1.5 py-0.5 border"
                      style={{ color: r.color, borderColor: r.border, backgroundColor: `${r.glow}` }}
                    >
                      {r.label}
                    </span>
                    {isLegendary && nft.bonusTokenId > 0n && (
                      <span className="text-[7px] text-[#ffaa00] font-mono">+BONUS</span>
                    )}
                    <span className="text-[#333] text-[8px] font-mono ml-auto">{date}</span>
                  </div>
                  <p className="text-white font-mono text-xs truncate">
                    {nft.winnerFighterName}
                    <span className="text-[#444]"> vs </span>
                    {nft.loserFighterName}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[#555] font-mono text-[9px]">
                      Token #{nft.tokenId.toString()}
                    </span>
                    <span className="text-[#ffaa00] font-mono text-[9px]">
                      {nft.winStreak.toString()} win streak
                    </span>
                  </div>
                </div>
 
                {/* Expand chevron */}
                <span
                  className="text-[#444] text-xs transition-transform duration-200 flex-shrink-0"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▼
                </span>
              </div>
 
              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-3 space-y-3" style={{ borderColor: r.border }}>
                  {/* Full image */}
                  {nft.imageUri && (
                    <div className="flex justify-center">
                      <img
                        src={nft.imageUri}
                        alt="Battle card"
                        className="max-h-48 object-contain border"
                        style={{ borderColor: r.border }}
                      />
                    </div>
                  )}
 
                  {/* Battle story */}
                  <div>
                    <p className="text-[7px] text-[#333] tracking-[1px] uppercase mb-1">Battle Story</p>
                    <p className="text-[#666] font-mono text-[10px] leading-relaxed line-clamp-4">
                      {nft.battleStory}
                    </p>
                  </div>
 
                  {/* Token IDs + explorer link */}
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[#444] font-mono text-[9px]">
                        Main token: <span style={{ color: r.color }}>#{nft.tokenId.toString()}</span>
                      </p>
                      {nft.bonusTokenId > 0n && (
                        <p className="text-[#444] font-mono text-[9px]">
                          Bonus token: <span className="text-[#ffaa00]">#{nft.bonusTokenId.toString()}</span>
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://explorer.ritualfoundation.org/token/${CONTRACT_ADDRESS}/instance/${nft.tokenId.toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#bb55ff] font-mono text-[9px] underline hover:text-[#dd77ff] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Explorer →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}