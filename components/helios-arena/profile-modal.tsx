"use client"

import { useEffect } from "react"

interface Battle {
  fighterA: string
  fighterB: string
  winner: string
  timestamp: string
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  wallet: string | null
  totalBattles: number
  wins: number
  losses: number
  battles: Battle[]
  twitterHandle: string
  discordHandle: string
  onConnectTwitter: () => void
  onConnectDiscord: () => void
}

export function ProfileModal({
  isOpen,
  onClose,
  wallet,
  totalBattles,
  wins,
  losses,
  battles,
  twitterHandle,
  discordHandle,
  onConnectTwitter,
  onConnectDiscord,
}: ProfileModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[500] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0c15] border-2 border-arena-purple p-4 sm:p-6 w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-[0_0_32px_rgba(119,51,204,0.33)]">
        <div className="text-[10px] sm:text-[12px] text-[#bb55ff] mb-3 sm:mb-4 [text-shadow:0_0_8px_#7733cc] flex justify-between items-center">
          PLAYER PROFILE
          <button
            onClick={onClose}
            className="bg-transparent border-none text-[#444] text-[16px] sm:text-[18px] cursor-pointer hover:text-[#cc2222]"
          >
            ✕
          </button>
        </div>

        <div className="font-mono text-[11px] sm:text-[13px] text-[#00aaaa] mb-3 sm:mb-[14px] truncate">
          {wallet || "Not connected"}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0e0e18] border border-[#1a1a28] p-3">
            <div className="text-[7px] text-[#333] tracking-[1px] uppercase mb-2">
              Twitter
            </div>
            <div className="font-mono text-[11px] sm:text-[13px] text-[#ddd] mb-3 truncate">
              {twitterHandle || "Not connected"}
            </div>
            <button
              onClick={onConnectTwitter}
              className="w-full bg-[#1a1a2a] border border-[#333] text-[#bbb] text-[9px] tracking-[1px] uppercase py-2 hover:bg-[#22223a] transition-colors"
            >
              {twitterHandle ? "Edit Twitter" : "Connect Twitter"}
            </button>
          </div>

          <div className="bg-[#0e0e18] border border-[#1a1a28] p-3">
            <div className="text-[7px] text-[#333] tracking-[1px] uppercase mb-2">
              Discord
            </div>
            <div className="font-mono text-[11px] sm:text-[13px] text-[#ddd] mb-3 truncate">
              {discordHandle || "Not connected"}
            </div>
            <button
              onClick={onConnectDiscord}
              className="w-full bg-[#1a1a2a] border border-[#333] text-[#bbb] text-[9px] tracking-[1px] uppercase py-2 hover:bg-[#22223a] transition-colors"
            >
              {discordHandle ? "Edit Discord" : "Connect Discord"}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 sm:p-3 text-center">
            <span className="text-[7px] sm:text-[8px] text-[#333] block tracking-[1px] mb-1">
              BATTLES
            </span>
            <span className="font-mono text-[18px] sm:text-[26px] text-[#ddd] block">
              {totalBattles}
            </span>
          </div>
          <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 sm:p-3 text-center">
            <span className="text-[7px] sm:text-[8px] text-[#333] block tracking-[1px] mb-1">
              WINS
            </span>
            <span className="font-mono text-[18px] sm:text-[26px] text-[#ddd] block">
              {wins}
            </span>
          </div>
          <div className="flex-1 bg-[#0e0e18] border border-[#1a1a28] p-2 sm:p-3 text-center">
            <span className="text-[7px] sm:text-[8px] text-[#333] block tracking-[1px] mb-1">
              LOSSES
            </span>
            <span className="font-mono text-[18px] sm:text-[26px] text-[#ddd] block">
              {losses}
            </span>
          </div>
        </div>

        {/* Battle History */}
        <div className="text-[7px] sm:text-[8px] text-[#333] tracking-[1px] sm:tracking-[2px] mb-2 sm:mb-[10px]">
          BATTLE HISTORY
        </div>
        <div className="font-mono text-[11px] sm:text-[13px] text-[#444]">
          {battles.length === 0 ? (
            "No battles yet..."
          ) : (
            battles.slice(0, 8).map((b, i) => (
              <div
                key={i}
                className="py-1 sm:py-[5px] border-b border-[#111] flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"
              >
                <span className="truncate">
                  <span className="text-[#bbb]">{b.fighterA}</span>
                  <span className="text-[#333]"> vs </span>
                  <span className="text-[#bbb]">{b.fighterB}</span>
                  <span className="text-[#00aaaa]"> → {b.winner}</span>
                </span>
                <span className="text-[#333] text-[10px] sm:text-[11px]">{b.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
