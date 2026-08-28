"use client"

import { useState } from "react"
import { usePollingSocket } from "@/hooks/use-polling-socket"

interface DirectChallengeProps {
  wallet: string | null
}

export function DirectChallenge({ wallet }: DirectChallengeProps) {
  const [searchTerm,         setSearchTerm]         = useState("")
  const [challengeMessage,   setChallengeMessage]   = useState("")
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [selectedPlayer,     setSelectedPlayer]     = useState<any>(null)
  const [searchResults,      setSearchResults]      = useState<any[]>([])
  const [isSearching,        setIsSearching]        = useState(false)
  const [notFound,           setNotFound]           = useState(false)

  const { sendChallenge } = usePollingSocket(wallet)

  const handleSearch = async () => {
    const term = searchTerm.trim().replace(/^@/, "")
    if (!term) return
    setIsSearching(true)
    setNotFound(false)
    setSearchResults([])
    try {
      const res  = await fetch(`/api/users?query=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const filtered = data.filter((p: any) => p.walletAddress?.toLowerCase() !== wallet?.toLowerCase())
        setSearchResults(filtered)
        if (filtered.length === 0) setNotFound(true)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendChallenge = () => {
    if (!selectedPlayer) return
    sendChallenge(selectedPlayer.walletAddress, challengeMessage || "Let's battle!")
    setShowChallengeModal(false)
    setSelectedPlayer(null)
    setChallengeMessage("")
    setSearchTerm("")
    setSearchResults([])
  }

  if (!wallet) return null

  return (
    <div className="bg-[#0e0e18] border border-[#1a1a28] p-5 mb-4">
      <h3 className="text-[#bb55ff] font-pixel text-sm mb-1 tracking-[1px]">DIRECT CHALLENGE</h3>
      <p className="text-[#555] font-mono text-[11px] mb-4">
        Search a player by Discord username to challenge them directly
      </p>

      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex items-center bg-[#1a1a2a] border border-[#333] focus-within:border-[#7733cc] transition-colors">
          <span className="px-3 text-[#5865F2] font-mono text-sm select-none">#</span>
          <input
            type="text"
            placeholder="discord_username"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setNotFound(false); setSearchResults([]) }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-transparent text-[#ccc] font-mono text-[12px] py-2 pr-3 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim() || isSearching}
          className="bg-[#5865F2] border-2 border-[#7289da] text-white font-pixel text-[10px] px-4 py-2 disabled:opacity-50 hover:bg-[#7289da] transition-all"
        >
          {isSearching ? "..." : "SEARCH"}
        </button>
      </div>

      <p className="text-[#444] font-mono text-[10px] mb-3">
        Ask your friend for their Discord username — they can set it in their profile
      </p>

      {notFound && (
        <div className="bg-[#0a0a0f] border border-[#2a1a1a] p-3 text-center mb-3">
          <p className="text-[#ff4444] font-mono text-xs">
            No player found with Discord username "<span className="text-[#ff8888]">{searchTerm.replace(/^@/, "")}</span>"
          </p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((player) => (
            <div key={player.walletAddress} className="bg-[#0a0a0f] border border-[#2a2a3a] p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  player.status === "online" ? "bg-[#00ff00]" :
                  player.status === "in-battle" ? "bg-[#ffaa00]" : "bg-[#444]"
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#5865F2] font-mono text-[10px]">#</span>
                    <span className="text-white font-mono text-[12px] font-bold">{player.discordUsername}</span>
                    <span className={`font-mono text-[9px] px-1 py-0.5 ${
                      player.status === "online" ? "text-[#00ff00] bg-[#001a00]" :
                      player.status === "in-battle" ? "text-[#ffaa00] bg-[#1a1000]" : "text-[#555]"
                    }`}>
                      {player.status === "online" ? "ONLINE" : player.status === "in-battle" ? "IN BATTLE" : "OFFLINE"}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[#00ff00] font-mono text-[10px]">{player.wins}W</span>
                    <span className="text-[#ff4444] font-mono text-[10px]">{player.losses}L</span>
                    <span className="text-[#bb55ff] font-mono text-[10px]">{(player.winRate ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPlayer(player); setShowChallengeModal(true) }}
                disabled={player.status === "in-battle"}
                className={`font-pixel text-[9px] px-3 py-2 border transition-colors ${
                  player.status === "in-battle"
                    ? "border-[#333] text-[#555] cursor-not-allowed"
                    : "border-[#5865F2] text-[#7289da] hover:bg-[#1a1a3a] hover:text-white cursor-pointer"
                }`}
              >
                {player.status === "in-battle" ? "IN BATTLE" : "⚡ CHALLENGE"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showChallengeModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0e0e18] border border-[#1a1a28] p-6 max-w-md w-full mx-4">
            <h4 className="text-[#bb55ff] font-pixel text-sm mb-4">SEND CHALLENGE</h4>
            <div className="bg-[#0a0a0f] border border-[#2a2a3a] p-3 mb-4 flex items-center gap-3">
              <span className="text-[#5865F2] font-mono text-lg">#</span>
              <div>
                <p className="text-white font-mono text-sm font-bold">{selectedPlayer.discordUsername}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-[#00ff00] font-mono text-[10px]">{selectedPlayer.wins}W</span>
                  <span className="text-[#ff4444] font-mono text-[10px]">{selectedPlayer.losses}L</span>
                </div>
              </div>
            </div>
            <textarea
              placeholder="Let's battle! Bring your best NFT..."
              value={challengeMessage}
              onChange={(e) => setChallengeMessage(e.target.value)}
              className="w-full bg-[#1a1a2a] border border-[#333] text-[#ccc] font-mono text-[11px] px-3 py-2 h-20 resize-none focus:outline-none focus:border-[#7733cc] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowChallengeModal(false); setSelectedPlayer(null) }}
                className="flex-1 bg-[#1a1a2a] border border-[#333] text-[#888] font-pixel text-[10px] py-2 hover:bg-[#22223a] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleSendChallenge}
                className="flex-1 bg-[#5865F2] border-2 border-[#7289da] text-white font-pixel text-[10px] py-2 hover:bg-[#7289da] transition-all"
              >
                ⚡ SEND CHALLENGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}