"use client"

import { useState, useEffect } from "react"

interface OnlinePlayer {
  walletAddress: string
  status: 'online' | 'in-queue' | 'in-battle' | 'spectating'
  currentBattle?: string
  queuePosition?: number
}

export function OnlinePlayers() {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const mockPlayers: OnlinePlayer[] = [
      { walletAddress: "0x1234...5678", status: "online" },
      { walletAddress: "0xabcd...efgh", status: "in-queue",  queuePosition: 1 },
      { walletAddress: "0x9876...5432", status: "in-battle", currentBattle: "battle-1234567890" },
      { walletAddress: "0x5678...9012", status: "online" },
      { walletAddress: "0x3456...7890", status: "in-queue",  queuePosition: 2 },
    ]
    setOnlinePlayers(mockPlayers)
  }, [])

  const filteredPlayers = onlinePlayers.filter(p =>
    p.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: OnlinePlayer['status']) => {
    switch (status) {
      case 'online':     return 'text-[#00ff00]'
      case 'in-queue':   return 'text-[#ffaa00]'
      case 'in-battle':  return 'text-[#ff4444]'
      case 'spectating': return 'text-[#aaaaaa]'
      default:           return 'text-[#777]'
    }
  }

  const getStatusDotColor = (status: OnlinePlayer['status']) => {
    switch (status) {
      case 'online':     return 'bg-[#00ff00]'
      case 'in-queue':   return 'bg-[#ffaa00]'
      case 'in-battle':  return 'bg-[#ff4444]'
      case 'spectating': return 'bg-[#aaaaaa]'
      default:           return 'bg-[#555]'
    }
  }

  const getStatusText = (status: OnlinePlayer['status']) => {
    switch (status) {
      case 'online':     return 'ONLINE'
      case 'in-queue':   return 'IN QUEUE'
      case 'in-battle':  return 'IN BATTLE'
      case 'spectating': return 'SPECTATING'
      default:           return 'UNKNOWN'
    }
  }

  return (
    <div className="bg-[#0e0e18] border border-[#1a1a28] p-5 sm:p-6 mb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
        <h3 className="text-[#bb55ff] font-pixel text-base sm:text-lg tracking-[1px]">ONLINE PLAYERS</h3>
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#1a1a2a] border border-[#333] text-[#ccc] font-mono text-[12px] px-3 py-2 w-48 focus:outline-none focus:border-arena-purple placeholder:text-[#444]"
        />
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#777] font-mono text-sm">No players found</p>
            <p className="text-[#555] font-mono text-xs mt-2">Try adjusting your search</p>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <div
              key={player.walletAddress}
              className="bg-[#0a0a0f] border border-[#2a2a3a] p-3 sm:p-4 flex items-center justify-between hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDotColor(player.status)}`} />

                <div className="min-w-0">
                  <div className="font-mono text-[13px] text-white font-semibold truncate">
                    {player.walletAddress}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${getStatusColor(player.status)}`}>
                    {getStatusText(player.status)}
                    {player.queuePosition && ` (#${player.queuePosition})`}
                    {player.currentBattle && ` · Battle: ${player.currentBattle.slice(-6)}`}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {player.status === 'online' && (
                  <button className="bg-[#1a1a2a] border border-[#333] text-[#aaa] font-pixel text-[10px] px-3 py-1.5 hover:bg-[#22223a] hover:text-white hover:border-[#555] transition-colors">
                    CHALLENGE
                  </button>
                )}
                {player.status === 'in-battle' && (
                  <button className="bg-[#1a1a2a] border border-[#333] text-[#aaa] font-pixel text-[10px] px-3 py-1.5 hover:bg-[#22223a] hover:text-white hover:border-[#555] transition-colors">
                    SPECTATE
                  </button>
                )}
                {player.status === 'spectating' && (
                  <button className="bg-[#1a1a2a] border border-[#333] text-[#aaa] font-pixel text-[10px] px-3 py-1.5 hover:bg-[#22223a] hover:text-white hover:border-[#555] transition-colors">
                    JOIN BATTLE
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-center">
        <p className="text-[#777] font-mono text-[12px]">
          {onlinePlayers.filter(p => p.status === 'online').length} online &nbsp;·&nbsp;
          {onlinePlayers.filter(p => p.status === 'in-queue').length} in queue &nbsp;·&nbsp;
          {onlinePlayers.filter(p => p.status === 'in-battle').length} battling
        </p>
      </div>
    </div>
  )
}