"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useWalletClient, usePublicClient } from "wagmi"
import { parseEther } from "viem"
import { BattleCardModal } from "@/components/helios-arena/battle-card-modal"
import { upsertEntry, updateEntryStatus, type ImmortalizeStatus } from "@/components/helios-arena/immortalize-tracker"

interface Character {
  name: string
  class: string
  description: string
  skills: string[]
  powers: string[]
  health: number
  attack: number
  defense: number
  speed: number
}

interface MatchData {
  matchId: string
  playerA: string
  playerB?: string
  status: 'pending' | 'accepted'
  playerACharacter?: Character
  playerBCharacter?: Character
  matchState?: {
    playerACharacter?: Character
    playerBCharacter?: Character
  }
}

interface BattleResult {
  winner: string
  loser: string
  battleStory: string
  winnerNarrative: string
  loserNarrative: string
  judgment: string
  rarity?: string
  winStreak?: number
  winnerWallet?: string
}

const HELIOS_ABI = [
  {
    name: "recordBattleResult",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchIdStr",        type: "string"  },
      { name: "winner",            type: "address" },
      { name: "loser",             type: "address" },
      { name: "winnerFighterName", type: "string"  },
      { name: "loserFighterName",  type: "string"  },
      { name: "battleStory",       type: "string"  },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "generateBattleImage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "mintVictoryNFT",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "onChainMatchId", type: "uint256" }],
    outputs: [],
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
const MINT_DEPOSIT     = parseEther("0.15")
const POLL_INTERVAL_MS = 10_000
const POLL_TIMEOUT_MS  = 5 * 60 * 1000

type MintStep =
  | "idle"
  | "recording"
  | "confirming"
  | "requesting_image"
  | "waiting_image"
  | "done"
  | "error"

type Rarity = "COMMON" | "RARE" | "ULTRA_RARE" | "LEGENDARY"

const MINT_STEP_LABELS: Record<MintStep, string> = {
  idle:             "",
  recording:        "Step 1/3 — Recording battle on-chain...",
  confirming:       "Step 1/3 — Confirming record transaction...",
  requesting_image: "Step 2/3 — Requesting Ritual image generation...",
  waiting_image:    "Step 2/3 — Ritual AI is generating your battle card...",
  done:             "Image generation requested! ✨",
  error:            "Transaction failed",
}

export default function BattleGenerationPage() {
  const router = useRouter()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [matchData,       setMatchData]       = useState<MatchData | null>(null)
  const [wallet,          setWallet]          = useState<string | null>(null)
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [battleResult,    setBattleResult]    = useState<BattleResult | null>(null)
  const [generationStep,  setGenerationStep]  = useState(0)
  const [error,           setError]           = useState<string | null>(null)
  const [mintStep,        setMintStep]        = useState<MintStep>("idle")
  const [mintError,       setMintError]       = useState<string | null>(null)
  const [immortalizeId,   setImmortalizeId]   = useState<string | null>(null)
  const [cardOpen,        setCardOpen]        = useState(false)

  const pollRef      = useRef<NodeJS.Timeout | null>(null)
  const pollStartRef = useRef<number>(0)

  useEffect(() => {
    const storedWallet = localStorage.getItem('wallet')
    const storedMatch  = localStorage.getItem('current_match')
    if (storedWallet) setWallet(storedWallet)
    if (storedMatch) {
      const match = JSON.parse(storedMatch)
      const playerACharacter = match.matchState?.playerACharacter || match.playerACharacter
      const playerBCharacter = match.matchState?.playerBCharacter || match.playerBCharacter
      match.playerACharacter = playerACharacter
      match.playerBCharacter = playerBCharacter
      setMatchData(match)
      if (playerACharacter && playerBCharacter) {
        generateBattle(playerACharacter, playerBCharacter)
      } else {
        router.push('/waiting')
      }
    } else {
      router.push('/')
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [router])

  const generateBattle = async (playerAChar: Character, playerBChar: Character) => {
    setIsGenerating(true)
    setGenerationStep(1)
    try {
      setGenerationStep(2)
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerACharacter: playerAChar, playerBCharacter: playerBChar })
      })
      setGenerationStep(3)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Battle generation failed')
      }
      const data = await response.json()
      setGenerationStep(4)
      setBattleResult(data.result)
    } catch (err: any) {
      setError(err.message || 'Something went wrong generating the battle')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Main IMMORTALIZE handler — saves to localStorage so user can leave ────
  const handleImmortalize = async () => {
    if (!walletClient || !publicClient || !matchData || !battleResult || !wallet) return
    if (!CONTRACT_ADDRESS) { setMintError("Contract not deployed yet."); return }

    setMintStep("recording")
    setMintError(null)

    const entryId = `${matchData.matchId}-${wallet}`

    try {
      const isPlayerA       = wallet.toLowerCase() === matchData.playerA?.toLowerCase()
      const myCharacter     = isPlayerA ? matchData.playerACharacter : matchData.playerBCharacter
      const oppCharacter    = isPlayerA ? matchData.playerBCharacter : matchData.playerACharacter
      const opponentAddress = isPlayerA ? matchData.playerB : matchData.playerA
      if (!opponentAddress) throw new Error("Opponent address not found")

      // Save entry to localStorage immediately so user can track it from profile
      upsertEntry({
        id:             entryId,
        onChainMatchId: "0",
        status:         "recording",
        winnerName:     myCharacter?.name ?? "Unknown",
        loserName:      oppCharacter?.name ?? "Unknown",
        rarity:         battleResult.rarity || "COMMON",
        winStreak:      battleResult.winStreak || 1,
        createdAt:      Date.now(),
      })
      setImmortalizeId(entryId)

      // ── Step 1: record battle ────────────────────────────────────────────
      const recordHash = await walletClient.writeContract({
        address:      CONTRACT_ADDRESS,
        abi:          HELIOS_ABI,
        functionName: "recordBattleResult",
        args: [
          matchData.matchId,
          wallet as `0x${string}`,
          opponentAddress as `0x${string}`,
          myCharacter?.name  ?? "Unknown",
          oppCharacter?.name ?? "Unknown",
          battleResult.battleStory,
        ],
      })

      setMintStep("confirming")
      const recordReceipt = await publicClient.waitForTransactionReceipt({ hash: recordHash })

      let parsedMatchId: bigint = BigInt(0)
      for (const log of recordReceipt.logs) {
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics[1]) {
          parsedMatchId = BigInt(log.topics[1])
          break
        }
      }

      // Update entry with real on-chain match ID
      updateEntryStatus(entryId, {
        onChainMatchId:  parsedMatchId.toString(),
        status:          "requesting_image",
      })

      // ── Step 2: trigger image generation ────────────────────────────────
      setMintStep("requesting_image")
      const imageHash = await walletClient.writeContract({
        address:      CONTRACT_ADDRESS,
        abi:          HELIOS_ABI,
        functionName: "generateBattleImage",
        args:         [parsedMatchId],
      })
      await publicClient.waitForTransactionReceipt({ hash: imageHash })

      // Mark as waiting — ImmortalizeTracker in profile will poll from here
      updateEntryStatus(entryId, { status: "waiting_image" })
      setMintStep("done")

    } catch (err: any) {
      const msg = err.shortMessage || err.message || "Transaction failed"
      setMintError(msg)
      setMintStep("error")
      if (immortalizeId || entryId) {
        updateEntryStatus(entryId, { status: "error", errorMsg: msg })
      }
    }
  }

  if (!matchData || !wallet) {
    return (
      <div className="min-h-screen bg-[#06060f] text-white font-mono flex items-center justify-center">
        <p className="text-[#666] text-lg">Loading battle data...</p>
      </div>
    )
  }

  const isPlayerA         = wallet.toLowerCase() === matchData.playerA?.toLowerCase()
  const myCharacter       = isPlayerA ? matchData.playerACharacter : matchData.playerBCharacter
  const opponentCharacter = isPlayerA ? matchData.playerBCharacter : matchData.playerACharacter
  const iWon              = battleResult ? battleResult.winner === myCharacter?.name : false
  const rarity: Rarity    = (battleResult?.rarity as Rarity) || "COMMON"
  const isMintInProgress  = ["recording", "confirming", "requesting_image"].includes(mintStep)

  const steps = [
    "Analysing character abilities...",
    "Simulating combat scenarios...",
    "Generating battle narrative...",
    "Finalising results..."
  ]

  return (
    <div className="min-h-screen bg-[#06060f] text-white font-mono">
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-[#ff8800] font-pixel text-2xl text-center mb-8">
          ⚔️ AI BATTLE GENERATION ⚔️
        </h1>

        {/* Generating */}
        {isGenerating && (
          <div className="bg-[#0e0e18] border border-[#bb55ff] p-8 text-center">
            <div className="space-y-4 mb-8">
              {steps.map((step, i) => (
                <div key={i} className={`flex items-center justify-center gap-3 transition-all duration-500 ${
                  generationStep > i ? 'text-[#00ff00]' : generationStep === i + 1 ? 'text-[#ffaa00]' : 'text-[#333]'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    generationStep > i ? 'bg-[#00ff00]' : generationStep === i + 1 ? 'bg-[#ffaa00] animate-pulse' : 'bg-[#333]'
                  }`} />
                  <span className="font-pixel text-xs">{step}</span>
                </div>
              ))}
            </div>
            <div className="w-16 h-16 border-4 border-[#bb55ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#bb55ff] font-mono text-sm animate-pulse">AI is generating your epic battle...</p>
          </div>
        )}

        {/* Error */}
        {error && !isGenerating && (
          <div className="bg-[#0e0e18] border border-[#ff4444] p-8 text-center">
            <p className="text-[#ff4444] font-pixel text-sm mb-4">BATTLE GENERATION FAILED</p>
            <p className="text-[#888] font-mono text-xs mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null)
                if (matchData.playerACharacter && matchData.playerBCharacter)
                  generateBattle(matchData.playerACharacter, matchData.playerBCharacter)
              }}
              className="bg-[#bb55ff] border-2 border-[#9944ff] text-white font-pixel text-xs px-6 py-3 hover:bg-[#9944ff] transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Results */}
        {battleResult && !isGenerating && (
          <div className="space-y-6">

            {/* Winner banner */}
            <div className={`border-2 p-6 text-center ${iWon ? 'bg-[#001a00] border-[#00ff00]' : 'bg-[#1a0000] border-[#ff4444]'}`}>
              <div className="text-4xl mb-3">{iWon ? '🏆' : '💀'}</div>
              <h2 className={`font-pixel text-2xl mb-2 animate-pulse ${iWon ? 'text-[#00ff00]' : 'text-[#ff4444]'}`}>
                {iWon ? 'VICTORY!' : 'DEFEATED!'}
              </h2>
              <p className="text-white font-pixel text-sm">
                {battleResult.winner} defeats {battleResult.loser}
              </p>
              {iWon && battleResult.rarity && (
                <p className="text-[#ffaa00] font-mono text-xs mt-2 tracking-[2px]">
                  🔥 {battleResult.winStreak} WIN STREAK · {battleResult.rarity.replace(/_/g, " ")} CARD
                </p>
              )}
            </div>

            {/* Battle Story */}
            <div className="bg-[#0e0e18] border border-[#1a1a28] p-6">
              <h3 className="text-[#ff8800] font-pixel text-sm mb-4">⚔️ BATTLE STORY</h3>
              <p className="text-[#ddd] font-mono text-sm leading-relaxed">{battleResult.battleStory}</p>
            </div>

            {/* Narratives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0e0e18] border border-[#00aa00] p-4">
                <h4 className="text-[#00ff00] font-pixel text-xs mb-3">🏆 {battleResult.winner}</h4>
                <p className="text-[#bbb] font-mono text-xs leading-relaxed">{battleResult.winnerNarrative}</p>
              </div>
              <div className="bg-[#0e0e18] border border-[#aa0000] p-4">
                <h4 className="text-[#ff4444] font-pixel text-xs mb-3">💀 {battleResult.loser}</h4>
                <p className="text-[#bbb] font-mono text-xs leading-relaxed">{battleResult.loserNarrative}</p>
              </div>
            </div>

            {/* AI Judgment */}
            <div className="bg-[#0e0e18] border border-[#1a1a28] p-6">
              <h3 className="text-[#bb55ff] font-pixel text-sm mb-4">🤖 AI JUDGMENT</h3>
              <p className="text-[#ddd] font-mono text-sm leading-relaxed">{battleResult.judgment}</p>
            </div>

            {/* Character recap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0e0e18] border border-[#1a1a28] p-4">
                <h4 className="text-[#bb55ff] font-pixel text-xs mb-3">YOUR CHARACTER</h4>
                <p className="text-white font-mono text-sm">{myCharacter?.name}</p>
                <p className="text-[#666] font-mono text-xs">{myCharacter?.class}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-xs font-mono">
                  <span className="text-[#666]">HP: <span className="text-[#00ff00]">{myCharacter?.health}</span></span>
                  <span className="text-[#666]">ATK: <span className="text-[#ff4444]">{myCharacter?.attack}</span></span>
                  <span className="text-[#666]">DEF: <span className="text-[#4444ff]">{myCharacter?.defense}</span></span>
                  <span className="text-[#666]">SPD: <span className="text-[#ffaa00]">{myCharacter?.speed}</span></span>
                </div>
              </div>
              <div className="bg-[#0e0e18] border border-[#1a1a28] p-4">
                <h4 className="text-[#ff4444] font-pixel text-xs mb-3">OPPONENT CHARACTER</h4>
                <p className="text-white font-mono text-sm">{opponentCharacter?.name}</p>
                <p className="text-[#666] font-mono text-xs">{opponentCharacter?.class}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-xs font-mono">
                  <span className="text-[#666]">HP: <span className="text-[#00ff00]">{opponentCharacter?.health}</span></span>
                  <span className="text-[#666]">ATK: <span className="text-[#ff4444]">{opponentCharacter?.attack}</span></span>
                  <span className="text-[#666]">DEF: <span className="text-[#4444ff]">{opponentCharacter?.defense}</span></span>
                  <span className="text-[#666]">SPD: <span className="text-[#ffaa00]">{opponentCharacter?.speed}</span></span>
                </div>
              </div>
            </div>

            {/* ── IMMORTALIZE ── */}
            <div className={`border-2 p-6 ${iWon ? 'border-[#ffaa00] bg-[#0a0800]' : 'border-[#333] bg-[#0e0e18]'}`}>
              <h3 className="font-pixel text-sm mb-3 text-center" style={{ color: iWon ? '#ffaa00' : '#555' }}>
                ✨ IMMORTALIZE YOUR VICTORY
              </h3>

              {!iWon ? (
                <p className="text-[#555] font-mono text-xs text-center">Only the winner can mint this battle as an NFT.</p>

              ) : !CONTRACT_ADDRESS ? (
                <p className="text-[#ff4444] font-mono text-xs text-center">Contract not deployed. Add NEXT_PUBLIC_HELIOS_ARENA_CONTRACT to env vars.</p>

              ) : mintStep === "done" ? (
                // ── Sent off — user can now leave ──────────────────────────
                <div className="text-center space-y-3">
                  <div className="text-3xl">✨</div>
                  <p className="text-[#00ff00] font-pixel text-sm">Image generation requested!</p>
                  <div className="bg-[#0a1200] border border-[#00aa0044] p-4 max-w-sm mx-auto">
                    <p className="text-[#00cc00] font-mono text-xs leading-relaxed">
                      Ritual AI is generating your battle card in the background.
                      <br /><br />
                      <span className="text-white">You can leave this page.</span> Track progress and mint your NFT from your <span className="text-[#ffaa00]">Profile → ✨ Immortalize</span> tab.
                    </p>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem('current_match'); router.push('/') }}
                    className="bg-[#7733cc] border-2 border-[#9944ff] text-white font-pixel text-xs px-6 py-3 hover:bg-[#8844dd] transition-colors"
                  >
                    BACK TO ARENA
                  </button>
                </div>

              ) : isMintInProgress ? (
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-[#ffaa00] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[#ffaa00] font-mono text-xs animate-pulse">{MINT_STEP_LABELS[mintStep]}</p>
                </div>

              ) : (
                <div className="text-center space-y-3">
                  {battleResult.rarity && (
                    <p className="text-[#ffaa00] font-mono text-xs tracking-[2px]">
                      YOU WILL MINT A {battleResult.rarity.replace(/_/g, " ")} CARD
                      {battleResult.winStreak && battleResult.winStreak >= 30 ? " + BONUS CARD 🎁" : ""}
                    </p>
                  )}

                  <div className="text-[#666] font-mono text-[9px] space-y-1">
                    <p>Step 1 — Record battle on Ritual Chain</p>
                    <p>Step 2 — Ritual AI generates your battle card image (1–5 min)</p>
                    <p>Step 3 — Mint from your Profile once image is ready</p>
                  </div>

                  <p className="text-[#aaa] font-mono text-xs">Cost: ~0.15 RITUAL from your wallet</p>

                  {mintStep === "error" && mintError && (
                    <p className="text-[#ff4444] font-mono text-xs">{mintError}</p>
                  )}

                  {!walletClient ? (
                    <p className="text-[#ff4444] font-mono text-xs">Connect your wallet to mint.</p>
                  ) : (
                    <button
                      onClick={handleImmortalize}
                      className="bg-[#ffaa00] border-2 border-[#ffcc44] text-black font-pixel text-xs px-8 py-3 hover:bg-[#ffcc44] transition-colors"
                    >
                      {mintStep === "error" ? "⚡ RETRY" : "⚡ IMMORTALIZE BATTLE"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => { localStorage.removeItem('current_match'); localStorage.removeItem('wallet'); router.push('/') }}
                className="bg-[#7733cc] border-2 border-[#9944ff] text-white font-pixel text-xs px-6 py-3 hover:bg-[#8844dd] transition-colors"
              >
                BACK TO ARENA
              </button>
              <button
                onClick={() => { localStorage.removeItem('current_match'); router.push('/') }}
                className="bg-[#1a1a2a] border border-[#333] text-[#888] font-pixel text-xs px-6 py-3 hover:bg-[#22223a] transition-colors"
              >
                NEW BATTLE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}