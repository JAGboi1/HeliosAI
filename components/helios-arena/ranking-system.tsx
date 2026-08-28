"use client"

import { useState, useEffect } from "react"

interface PlayerRanking {
  rank: number
  walletAddress: string
  username?: string
  wins: number
  losses: number
  winRate: number
  totalBattles: number
  points: number
  streak: number
  lastBattle: string
  status: 'online' | 'offline' | 'in-battle'
}

interface BattleResult {
  id: string
  winner: string
  loser: string
  winnerScore: number
  loserScore: number
  duration: number
  timestamp: string
  battleType: '1v1' | 'tournament' | 'ranked'
  pointsGained: number
  pointsLost: number
}

export function RankingSystem() {
  const [activeTab, setActiveTab] = useState<'rankings' | 'recent-battles'>('rankings')
  const [rankings, setRankings] = useState<PlayerRanking[]>([])
  const [recentBattles, setRecentBattles] = useState<BattleResult[]>([])
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    const mockRankings: PlayerRanking[] = [
      { rank: 1, walletAddress: "0x1234...5678", username: "CryptoNinja",   wins: 42, losses: 8,  winRate: 84.0, totalBattles: 50, points: 2150, streak: 5,  lastBattle: "2 mins ago",  status: "online"    },
      { rank: 2, walletAddress: "0xabcd...efgh", username: "ShadowBlade",   wins: 38, losses: 12, winRate: 76.0, totalBattles: 50, points: 1980, streak: 3,  lastBattle: "5 mins ago",  status: "in-battle" },
      { rank: 3, walletAddress: "0x9876...5432", username: "NeonWarrior",   wins: 35, losses: 15, winRate: 70.0, totalBattles: 50, points: 1820, streak: -1, lastBattle: "1 hour ago",  status: "online"    },
      { rank: 4, walletAddress: "0x5678...9012", username: "PixelDemon",    wins: 32, losses: 18, winRate: 64.0, totalBattles: 50, points: 1650, streak: 2,  lastBattle: "3 hours ago", status: "offline"   },
      { rank: 5, walletAddress: "0x3456...7890", username: "LegendSlayer",  wins: 28, losses: 22, winRate: 56.0, totalBattles: 50, points: 1420, streak: 0,  lastBattle: "5 hours ago", status: "online"    },
    ]

    const mockBattles: BattleResult[] = [
      { id: "battle-001", winner: "0x1234...5678", loser: "0xabcd...efgh", winnerScore: 100, loserScore: 0,  duration: 125, timestamp: "2 mins ago",  battleType: "ranked", pointsGained: 25, pointsLost: 15 },
      { id: "battle-002", winner: "0x9876...5432", loser: "0x5678...9012", winnerScore: 45,  loserScore: 0,  duration: 89,  timestamp: "5 mins ago",  battleType: "1v1",    pointsGained: 18, pointsLost: 12 },
      { id: "battle-003", winner: "0x3456...7890", loser: "0x7890...1234", winnerScore: 100, loserScore: 15, duration: 156, timestamp: "12 mins ago", battleType: "ranked", pointsGained: 22, pointsLost: 18 },
    ]

    setRankings(mockRankings)
    setRecentBattles(mockBattles)
  }, [])

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-[#ffd700]'
    if (rank === 2) return 'text-[#c0c0c0]'
    if (rank === 3) return 'text-[#cd7f32]'
    return 'text-[#aaa]'
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getStatusDot = (status: PlayerRanking['status']) => {
    switch (status) {
      case 'online':    return 'bg-[#00ff00]'
      case 'in-battle': return 'bg-[#ffaa00]'
      case 'offline':   return 'bg-[#555]'
      default:          return 'bg-[#555]'
    }
  }

  return (
    <div className="bg-[#0e0e18] border border-[#1a1a28] p-5 sm:p-6 mb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[#bb55ff] font-pixel text-base sm:text-lg tracking-[1px]">RANKINGS & BATTLES</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-3 py-1.5 font-pixel text-[11px] border transition-colors ${
              activeTab === 'rankings'
                ? 'bg-arena-purple border-[#9944ff] text-white'
                : 'bg-[#1a1a2a] border-[#333] text-[#888] hover:bg-[#22223a]'
            }`}
          >
            RANKINGS
          </button>
          <button
            onClick={() => setActiveTab('recent-battles')}
            className={`px-3 py-1.5 font-pixel text-[11px] border transition-colors ${
              activeTab === 'recent-battles'
                ? 'bg-arena-purple border-[#9944ff] text-white'
                : 'bg-[#1a1a2a] border-[#333] text-[#888] hover:bg-[#22223a]'
            }`}
          >
            RECENT BATTLES
          </button>
        </div>
      </div>

      {/* Rankings tab */}
      {activeTab === 'rankings' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {(['all', 'today', 'week', 'month'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-2.5 py-1 font-mono text-[11px] border transition-colors ${
                    timeFilter === filter
                      ? 'bg-[#1a1a2a] border-arena-purple text-[#bb55ff]'
                      : 'bg-transparent border-[#333] text-[#777] hover:border-[#555] hover:text-[#aaa]'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-[#777] font-mono text-xs">
              Top {rankings.length} Players
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rankings.map((player) => (
              <div
                key={player.walletAddress}
                className="bg-[#0a0a0f] border border-[#2a2a3a] p-3 sm:p-4 hover:bg-[#111] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Rank badge */}
                    <div className={`text-xl font-bold flex-shrink-0 ${getRankColor(player.rank)}`}>
                      {getRankBadge(player.rank)}
                    </div>

                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDot(player.status)}`} />

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[13px] text-white font-semibold truncate">
                          {player.username || player.walletAddress}
                        </span>
                        {player.username && (
                          <span className="font-mono text-[11px] text-[#666] hidden sm:inline truncate">
                            {player.walletAddress}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[#00ff00] font-mono text-[12px] font-bold">{player.wins}W</span>
                        <span className="text-[#ff4444] font-mono text-[12px] font-bold">{player.losses}L</span>
                        <span className="text-[#bb55ff] font-mono text-[12px]">{(player.winRate ?? 0).toFixed(1)}%</span>
                        <span className="text-[#ffd700] font-mono text-[12px] font-bold">{player.points} pts</span>
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                        <span className={`font-mono text-[11px] ${
                          player.streak > 0 ? 'text-[#00ff00]' :
                          player.streak < 0 ? 'text-[#ff4444]' : 'text-[#666]'
                        }`}>
                          {player.streak > 0 ? '🔥' : player.streak < 0 ? '❄️' : ''}
                          {Math.abs(player.streak)} streak
                        </span>
                        <span className="text-[#666] font-mono text-[11px]">Last: {player.lastBattle}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side rank */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[#bb55ff] font-mono text-[12px] font-bold">Rank #{player.rank}</div>
                    <div className="text-[#666] font-mono text-[11px]">{player.totalBattles} battles</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent battles tab */}
      {activeTab === 'recent-battles' && (
        <div>
          <p className="text-[#777] font-mono text-[12px] mb-4">Latest battle results from the arena</p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentBattles.map((battle) => (
              <div
                key={battle.id}
                className="bg-[#0a0a0f] border border-[#2a2a3a] p-3 sm:p-4 hover:bg-[#111] transition-colors"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`px-2 py-1 font-mono text-[10px] border ${
                    battle.battleType === 'ranked'
                      ? 'bg-[#1a1a2a] border-[#bb55ff] text-[#bb55ff]'
                      : 'bg-[#1a1a2a] border-[#555] text-[#888]'
                  }`}>
                    {battle.battleType.toUpperCase()}
                  </span>
                  <span className="text-[#777] font-mono text-[11px]">{battle.timestamp}</span>
                  <span className="text-[#777] font-mono text-[11px]">
                    ⏱ {Math.floor(battle.duration / 60)}:{(battle.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00ff00] font-mono text-[13px] font-semibold truncate">🏆 {battle.winner}</span>
                      <span className="text-[#888] font-mono text-[11px] flex-shrink-0">+{battle.pointsGained} pts</span>
                    </div>
                    <div className="text-[#666] font-mono text-[11px] mt-0.5">Score: {battle.winnerScore} HP</div>
                  </div>

                  <div className="text-[#666] font-mono text-[12px] font-bold flex-shrink-0">VS</div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[#888] font-mono text-[11px] flex-shrink-0">-{battle.pointsLost} pts</span>
                      <span className="text-[#ff4444] font-mono text-[13px] truncate">{battle.loser}</span>
                    </div>
                    <div className="text-[#666] font-mono text-[11px] mt-0.5">Score: {battle.loserScore} HP</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}