"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWalletClient, usePublicClient } from "wagmi"
import { parseEther } from "viem"

// ── Types ─────────────────────────────────────────────────────────────────────
export type ImmortalizeStatus =
  | "recording"        // Step 1 tx in progress
  | "requesting_image" // Step 2 tx in progress
  | "waiting_image"    // Polling for image
  | "ready_to_mint"    // Image ready, waiting for user to mint
  | "minting"          // Step 3 tx in progress
  | "minted"           // Done
  | "error"

export interface ImmortalizeEntry {
  id:                string   // unique — use matchId from Supabase
  onChainMatchId:    string   // bigint stored as string
  status:            ImmortalizeStatus
  winnerName:        string
  loserName:         string
  rarity:            string
  winStreak:         number
  imageUri?:         string
  tokenId?:          string
  bonusTokenId?:     string
  txHash?:           string
  errorMsg?:         string
  createdAt:         number
}

const STORAGE_KEY   = "helios_immortalizations"
const POLL_INTERVAL = 12_000
const MINT_DEPOSIT  = parseEther("0.15")

const HELIOS_ABI = [
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
          { name: "winner",         type: "address" },
          { name: "loser",          type: "address" },
          { name: "winnerFighterName", type: "string" },
          { name: "loserFighterName",  type: "string" },
          { name: "battleStory",    type: "string"  },
          { name: "matchId",        type: "uint256" },
          { name: "timestamp",      type: "uint256" },
          { name: "imageUri",       type: "string"  },
          { name: "tokenId",        type: "uint256" },
          { name: "bonusTokenId",   type: "uint256" },
          { name: "imageGenerated", type: "bool"    },
          { name: "minted",         type: "bool"    },
          { name: "rarity",         type: "uint8"   },
          { name: "winStreak",      type: "uint256" },
        ],
      },
    ],
  },
] as const

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HELIOS_ARENA_CONTRACT as `0x${string}` | undefined

// ── localStorage helpers ──────────────────────────────────────────────────────
export function loadEntries(): ImmortalizeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveEntries(entries: ImmortalizeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function upsertEntry(entry: ImmortalizeEntry) {
  const entries = loadEntries()
  const idx = entries.findIndex(e => e.id === entry.id)
  if (idx >= 0) entries[idx] = entry
  else entries.unshift(entry)
  saveEntries(entries)
}

export function updateEntryStatus(id: string, patch: Partial<ImmortalizeEntry>) {
  const entries = loadEntries()
  const idx = entries.findIndex(e => e.id === id)
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...patch }
    saveEntries(entries)
  }
}

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ImmortalizeStatus, { label: string; color: string; pulse: boolean }> = {
  recording:        { label: "Step 1 — Recording on-chain...",       color: "#ffaa00", pulse: true  },
  requesting_image: { label: "Step 2 — Requesting image gen...",     color: "#ffaa00", pulse: true  },
  waiting_image:    { label: "Step 2 — Generating image (1-5 min)", color: "#bb55ff", pulse: true  },
  ready_to_mint:    { label: "Step 3 — Ready to Mint! ✨",           color: "#00ff00", pulse: false },
  minting:          { label: "Step 3 — Minting NFT...",              color: "#ffaa00", pulse: true  },
  minted:           { label: "Minted! 🏅",                           color: "#00ff00", pulse: false },
  error:            { label: "Failed",                                color: "#ff4444", pulse: false },
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#aaa", RARE: "#ffcc44", ULTRA_RARE: "#66aaff", LEGENDARY: "#cc66ff",
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ImmortalizeTrackerProps {
  fullWalletAddress: string | null
}

export function ImmortalizeTracker({ fullWalletAddress }: ImmortalizeTrackerProps) {
  const { data: walletClient } = useWalletClient()
  const publicClient           = usePublicClient()
  const [entries, setEntries]  = useState<ImmortalizeEntry[]>([])
  const [minting, setMinting]  = useState<string | null>(null)
  const pollRef                = useRef<NodeJS.Timeout | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  // Poll for waiting_image entries
  const pollPending = useCallback(async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return
    const current = loadEntries()
    const pending  = current.filter(e => e.status === "waiting_image")
    if (pending.length === 0) return

    for (const entry of pending) {
      try {
        const battle = await publicClient.readContract({
          address:      CONTRACT_ADDRESS,
          abi:          HELIOS_ABI,
          functionName: "getBattle",
          args:         [BigInt(entry.onChainMatchId)],
        }) as any

        if (battle.minted) {
          updateEntryStatus(entry.id, {
            status:       "minted",
            imageUri:     battle.imageUri || undefined,
            tokenId:      battle.tokenId?.toString(),
            bonusTokenId: battle.bonusTokenId > 0n ? battle.bonusTokenId.toString() : undefined,
          })
        } else if (battle.imageGenerated) {
          updateEntryStatus(entry.id, {
            status:   "ready_to_mint",
            imageUri: battle.imageUri || undefined,
          })
        }
      } catch (err) {
        console.error("Poll error for", entry.id, err)
      }
    }

    setEntries(loadEntries())
  }, [publicClient])

  useEffect(() => {
    pollPending()
    pollRef.current = setInterval(pollPending, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pollPending])

  const handleMint = async (entry: ImmortalizeEntry) => {
    if (!walletClient || !publicClient || !CONTRACT_ADDRESS) return
    setMinting(entry.id)
    updateEntryStatus(entry.id, { status: "minting" })
    setEntries(loadEntries())

    try {
      const mintHash = await walletClient.writeContract({
        address:      CONTRACT_ADDRESS,
        abi:          HELIOS_ABI,
        functionName: "mintVictoryNFT",
        args:         [BigInt(entry.onChainMatchId)],
        value:        MINT_DEPOSIT,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash })

      const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      const transfers     = receipt.logs.filter(l => l.topics[0] === transferTopic)
      const tokenId       = transfers[0]?.topics[3] ? BigInt(transfers[0].topics[3]).toString() : undefined
      const bonusTokenId  = transfers[1]?.topics[3] ? BigInt(transfers[1].topics[3]).toString() : undefined

      updateEntryStatus(entry.id, {
        status: "minted",
        txHash: mintHash,
        tokenId,
        bonusTokenId,
      })
    } catch (err: any) {
      updateEntryStatus(entry.id, {
        status:   "error",
        errorMsg: err.shortMessage || err.message || "Mint failed",
      })
    } finally {
      setMinting(null)
      setEntries(loadEntries())
    }
  }

  const handleRemove = (id: string) => {
    const updated = loadEntries().filter(e => e.id !== id)
    saveEntries(updated)
    setEntries(updated)
  }

  if (!fullWalletAddress) {
    return (
      <p className="text-[#444] font-mono text-xs text-center py-6">
        Connect your wallet to track immortalizations.
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-3">✨</p>
        <p className="text-[#444] font-mono text-xs leading-relaxed">
          No immortalizations yet.<br />
          Win a battle and click <span className="text-[#ffaa00]">IMMORTALIZE</span> to start.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const cfg        = STATUS_CONFIG[entry.status]
        const rarityColor = RARITY_COLOR[entry.rarity] || "#aaa"
        const isWorking  = ["recording", "requesting_image", "waiting_image", "minting"].includes(entry.status)

        return (
          <div
            key={entry.id}
            className="bg-[#0a0a12] border border-[#1a1a28] p-3 space-y-2"
          >
            {/* Top row — fighters + rarity */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] text-white truncate">
                  <span className="text-[#00ff00]">{entry.winnerName}</span>
                  <span className="text-[#333]"> vs </span>
                  <span className="text-[#ff6666]">{entry.loserName}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[8px]" style={{ color: rarityColor }}>
                    {entry.rarity.replace(/_/g, " ")}
                  </span>
                  {entry.winStreak > 1 && (
                    <span className="text-[#ffaa00] font-mono text-[8px]">
                      🔥 {entry.winStreak} streak
                    </span>
                  )}
                </div>
              </div>

              {/* Remove button for done/error */}
              {(entry.status === "minted" || entry.status === "error") && (
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-[#333] hover:text-[#ff4444] text-[10px] transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status row */}
            <div className="flex items-center gap-2">
              {isWorking && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: cfg.color }}
                />
              )}
              <p
                className={`font-mono text-[9px] ${cfg.pulse ? "animate-pulse" : ""}`}
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </p>
            </div>

            {/* Error message */}
            {entry.status === "error" && entry.errorMsg && (
              <p className="text-[#ff4444] font-mono text-[8px]">{entry.errorMsg}</p>
            )}

            {/* Minted info */}
            {entry.status === "minted" && (
              <div className="space-y-1">
                {entry.imageUri && (
                  <img
                    src={entry.imageUri}
                    alt="Battle card"
                    className="w-full max-h-32 object-contain border border-[#1a1a28]"
                  />
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[#555] font-mono text-[8px]">
                    Token #{entry.tokenId}
                    {entry.bonusTokenId && ` + Bonus #${entry.bonusTokenId}`}
                  </p>
                  {entry.txHash && (
                    <a
                      href={`https://explorer.ritualfoundation.org/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#bb55ff] font-mono text-[8px] underline hover:text-[#dd77ff]"
                    >
                      Explorer →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* MINT button when ready */}
            {entry.status === "ready_to_mint" && (
              <button
                onClick={() => handleMint(entry)}
                disabled={!!minting}
                className="w-full bg-[#ffaa00] border-2 border-[#ffcc44] text-black font-pixel text-[9px] py-2 hover:bg-[#ffcc44] transition-colors disabled:opacity-50"
              >
                {minting === entry.id ? "MINTING..." : "⚡ MINT NOW"}
              </button>
            )}

            {/* Retry button on error */}
            {entry.status === "error" && (
              <button
                onClick={() => handleMint(entry)}
                disabled={!!minting}
                className="w-full bg-[#1a1a2a] border border-[#ff4444] text-[#ff4444] font-pixel text-[9px] py-2 hover:bg-[#2a0000] transition-colors disabled:opacity-50"
              >
                ↻ RETRY MINT
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}