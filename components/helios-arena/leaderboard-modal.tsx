"use client"

import { useState, useEffect } from "react"

interface LeaderboardEntry {
  wallet:         string
  discord_username: string | null
  wins:           number
  losses:         number
  total_battles:  number
  win_streak:     number
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const RANK_STYLES = [
  { bg: "bg-[#1a1400]", border: "border-[#ffcc00]", label: "text-[#ffcc00]", crown: "👑" },
  { bg: "bg-[#0f0f0f]", border: "border-[#aaaaaa]", label: "text-[#aaaaaa]", crown: "🥈" },
  { bg: "bg-[#120a00]", border: "border-[#cc6600]", label: "text-[#cc6600]", crown: "🥉" },
]

interface LeaderboardModalProps {
  isOpen:        boolean
  onClose:       () => void
  currentWallet: string | null
}

export function LeaderboardModal({ isOpen, onClose, currentWallet }: LeaderboardModalProps) {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState<"streak" | "wins">("streak")

  useEffect(() => {
    if (!isOpen) return
    fetchLeaderboard()
  }, [isOpen, tab])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/leaderboard?sort=${tab}`)
      const data = await res.json()
      setPlayers(data || [])
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (isOpen) document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const myRank = currentWallet
    ? players.findIndex(p => p.wallet.toLowerCase() === currentWallet.toLowerCase()) + 1
    : 0

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[500] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0c15] border-2 border-arena-purple w-full max-w-[520px] max-h-[85vh] flex flex-col shadow-[0_0_32px_rgba(119,51,204,0.33)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a28]">
          <div>
            <p className="text-[#bb55ff] text-[11px] tracking-[2px] [text-shadow:0_0_8px_#7733cc]">
              🏆 LEADERBOARD
            </p>
            {myRank > 0 && (
              <p className="text-[#ffaa00] font-mono text-[9px] mt-0.5">Your rank: #{myRank}</p>
            )}
          </div>
          <button onClick={onClose} className="text-[#444] text-[18px] hover:text-[#cc2222] transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a28]">
          {(["streak", "wins"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[9px] tracking-[1px] uppercase font-mono transition-colors ${
                tab === t
                  ? "text-[#bb55ff] border-b-2 border-[#bb55ff] -mb-[2px]"
                  : "text-[#444] hover:text-[#777]"
              }`}
            >
              {t === "streak" ? "🔥 Win Streak" : "⚔ Total Wins"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-7 h-7 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#444] font-mono text-xs animate-pulse">Loading rankings...</p>
            </div>
          ) : players.length === 0 ? (
            <p className="text-[#444] font-mono text-xs text-center py-12">No players ranked yet.</p>
          ) : (
            <div className="space-y-2">
              {players.map((p, i) => {
                const rank    = i + 1
                const isMe    = currentWallet ? p.wallet.toLowerCase() === currentWallet.toLowerCase() : false
                const top3    = RANK_STYLES[i]
                const winRate = p.total_battles > 0 ? Math.round((p.wins / p.total_battles) * 100) : 0

                return (
                  <div
                    key={p.wallet}
                    className={`flex items-center gap-3 px-3 py-2.5 border transition-all ${
                      isMe
                        ? "bg-[#0d0020] border-[#bb55ff] shadow-[0_0_8px_rgba(187,85,255,0.2)]"
                        : top3
                        ? `${top3.bg} border ${top3.border}`
                        : "bg-[#0a0a12] border-[#1a1a28]"
                    }`}
                  >
                    {/* Rank number */}
                    <div className="w-7 text-center flex-shrink-0">
                      {top3 ? (
                        <span className="text-lg">{top3.crown}</span>
                      ) : (
                        <span className={`font-mono text-[11px] ${isMe ? "text-[#bb55ff]" : "text-[#444]"}`}>
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono text-[11px] truncate ${isMe ? "text-[#bb55ff]" : "text-white"}`}>
                        {p.discord_username
                          ? <><span className="text-[#bb55ff]">@</span>{p.discord_username}</>
                          : shortenAddress(p.wallet)
                        }
                        {isMe && <span className="text-[#555] ml-1 text-[9px]">(you)</span>}
                      </p>
                      <p className="text-[#444] font-mono text-[9px] mt-0.5">
                        {p.wins}W · {p.losses}L · {winRate}% WR
                      </p>
                    </div>

                    {/* Streak / wins stat */}
                    <div className="text-right flex-shrink-0">
                      {tab === "streak" ? (
                        <>
                          <p className="text-[#ffaa00] font-mono text-[13px] font-bold">
                            {p.win_streak}
                          </p>
                          <p className="text-[#555] font-mono text-[8px]">streak</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[#00ff00] font-mono text-[13px] font-bold">
                            {p.wins}
                          </p>
                          <p className="text-[#555] font-mono text-[8px]">wins</p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}