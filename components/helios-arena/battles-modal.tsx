"use client"

import { useState, useEffect } from "react"

interface BattleEntry {
  id:                 string
  match_id:           string
  wallet:             string
  opponent_wallet:    string
  my_character:       string
  opponent_character: string
  result:             string
  battle_story:       string | null
  rarity:             string | null
  win_streak:         number
  created_at:         number
}

const RARITY_COLOR: Record<string, string> = {
  COMMON:     "#aaaaaa",
  RARE:       "#ffcc44",
  ULTRA_RARE: "#66aaff",
  LEGENDARY:  "#cc66ff",
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - Math.floor(ts / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface BattlesFeedModalProps {
  isOpen:  boolean
  onClose: () => void
}

export function BattlesFeedModal({ isOpen, onClose }: BattlesFeedModalProps) {
  const [battles,  setBattles]  = useState<BattleEntry[]>([])
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    fetchBattles()
    // Refresh every 30 seconds while open
    const interval = setInterval(fetchBattles, 30_000)
    return () => clearInterval(interval)
  }, [isOpen])

  const fetchBattles = async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/battles-feed")
      const data = await res.json()
      setBattles(data || [])
    } catch (err) {
      console.error("Failed to fetch battles feed:", err)
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

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[500] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0c15] border-2 border-arena-purple w-full max-w-[560px] max-h-[85vh] flex flex-col shadow-[0_0_32px_rgba(119,51,204,0.33)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a28]">
          <div>
            <p className="text-[#bb55ff] text-[11px] tracking-[2px] [text-shadow:0_0_8px_#7733cc]">
              ⚔ LIVE BATTLE FEED
            </p>
            <p className="text-[#444] font-mono text-[9px] mt-0.5">Platform-wide battles · refreshes every 30s</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#444] text-[18px] hover:text-[#cc2222] transition-colors"
          >✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading && battles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-7 h-7 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#444] font-mono text-xs animate-pulse">Loading battles...</p>
            </div>
          ) : battles.length === 0 ? (
            <p className="text-[#444] font-mono text-xs text-center py-12">No battles recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {battles.map((b) => {
                const isWin      = b.result === "win"
                const winner     = isWin ? b.my_character     : b.opponent_character
                const loser      = isWin ? b.opponent_character : b.my_character
                const winnerAddr = isWin ? b.wallet           : b.opponent_wallet
                const rarityColor = b.rarity ? (RARITY_COLOR[b.rarity] || "#aaa") : "#aaa"
                const isExpanded  = expanded === b.id

                return (
                  <div
                    key={b.id}
                    className="bg-[#0a0a12] border border-[#1a1a28] overflow-hidden"
                  >
                    {/* Row */}
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#0e0e18] transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : b.id)}
                    >
                      {/* Result dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isWin ? "bg-[#00ff00]" : "bg-[#ff4444]"}`} />

                      {/* Fighters */}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] truncate">
                          <span className="text-[#00ff00]">{winner}</span>
                          <span className="text-[#333]"> defeats </span>
                          <span className="text-[#ff6666]">{loser}</span>
                        </p>
                        <p className="text-[#444] font-mono text-[9px] mt-0.5 truncate">
                          {shortenAddress(winnerAddr)}
                          {b.win_streak > 1 && (
                            <span className="text-[#ffaa00] ml-2">🔥 {b.win_streak} streak</span>
                          )}
                        </p>
                      </div>

                      {/* Rarity + time */}
                      <div className="text-right flex-shrink-0">
                        {b.rarity && (
                          <p
                            className="font-mono text-[8px] tracking-[0.5px]"
                            style={{ color: rarityColor }}
                          >
                            {b.rarity.replace("_", " ")}
                          </p>
                        )}
                        <p className="text-[#333] font-mono text-[8px] mt-0.5">{timeAgo(b.created_at)}</p>
                      </div>

                      <span className="text-[#333] text-[9px] flex-shrink-0" style={{ transform: isExpanded ? "rotate(180deg)" : undefined }}>▼</span>
                    </div>

                    {/* Expanded story */}
                    {isExpanded && b.battle_story && (
                      <div className="px-3 pb-3 border-t border-[#1a1a28]">
                        <p className="text-[#555] font-mono text-[9px] leading-relaxed mt-2">
                          {b.battle_story}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1a1a28] flex items-center justify-between">
          <p className="text-[#333] font-mono text-[9px]">{battles.length} battles loaded</p>
          <button
            onClick={fetchBattles}
            className="text-[#555] font-mono text-[9px] hover:text-[#bb55ff] transition-colors"
          >
            ↻ REFRESH
          </button>
        </div>
      </div>
    </div>
  )
}