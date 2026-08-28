"use client"

import { useState, useEffect } from "react"

interface Friend {
  wallet:          string
  discordUsername: string | null
  wins:            number
  losses:          number
  totalBattles:    number
  since?:          string
}

interface OnlineUser {
  walletAddress:   string
  discordUsername: string | null
  status:          "online" | "in-battle"
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface FriendsModalProps {
  isOpen:  boolean
  onClose: () => void
  wallet:  string | null // full address
}

export function FriendsModal({ isOpen, onClose, wallet }: FriendsModalProps) {
  const [friends,    setFriends]    = useState<Friend[]>([])
  const [onlineMap,  setOnlineMap]  = useState<Map<string, OnlineUser>>(new Map())
  const [loading,    setLoading]    = useState(false)
  const [incoming,   setIncoming]   = useState<Friend[]>([])

  useEffect(() => {
    if (!isOpen || !wallet) return
    fetchAll()
    const interval = setInterval(fetchOnline, 15_000)
    return () => clearInterval(interval)
  }, [isOpen, wallet])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchFriends(), fetchOnline()])
    setLoading(false)
  }

  const fetchFriends = async () => {
    if (!wallet) return
    try {
      const res  = await fetch(`/api/friends?wallet=${wallet}`)
      const data = await res.json()
      setFriends(data.friends  || [])
      setIncoming(data.incoming || [])
    } catch (err) {
      console.error("Failed to fetch friends:", err)
    }
  }

  const fetchOnline = async () => {
    try {
      const res   = await fetch("/api/users")
      const data: OnlineUser[] = await res.json()
      const map   = new Map<string, OnlineUser>()
      for (const u of data) map.set(u.walletAddress.toLowerCase(), u)
      setOnlineMap(map)
    } catch (err) {
      console.error("Failed to fetch online users:", err)
    }
  }

  const acceptRequest = async (friendWallet: string) => {
    if (!wallet) return
    await fetch("/api/friends", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "accept", walletA: wallet, walletB: friendWallet }),
    })
    fetchFriends()
  }

  const declineRequest = async (friendWallet: string) => {
    if (!wallet) return
    await fetch("/api/friends", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "decline", walletA: wallet, walletB: friendWallet }),
    })
    fetchFriends()
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (isOpen) document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const onlineFriends  = friends.filter(f => onlineMap.has(f.wallet.toLowerCase()))
  const offlineFriends = friends.filter(f => !onlineMap.has(f.wallet.toLowerCase()))

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[500] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0c15] border-2 border-arena-purple w-full max-w-[480px] max-h-[85vh] flex flex-col shadow-[0_0_32px_rgba(119,51,204,0.33)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a28]">
          <div>
            <p className="text-[#bb55ff] text-[11px] tracking-[2px] [text-shadow:0_0_8px_#7733cc]">
              👥 FRIENDS
            </p>
            <p className="text-[#444] font-mono text-[9px] mt-0.5">
              {onlineFriends.length} online · {offlineFriends.length} offline
            </p>
          </div>
          <button onClick={onClose} className="text-[#444] text-[18px] hover:text-[#cc2222] transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {!wallet ? (
            <p className="text-[#444] font-mono text-xs text-center py-8">Connect your wallet to see friends.</p>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-7 h-7 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#444] font-mono text-xs animate-pulse">Loading friends...</p>
            </div>
          ) : (
            <>
              {/* Incoming requests */}
              {incoming.length > 0 && (
                <div>
                  <p className="text-[8px] text-[#ffaa00] tracking-[1px] uppercase mb-2">
                    ⚡ Friend Requests ({incoming.length})
                  </p>
                  {incoming.map(f => (
                    <div key={f.wallet} className="flex items-center gap-3 py-2 border-b border-[#111]">
                      <div className="w-8 h-8 bg-[#0e0e18] border border-[#ffaa0044] flex items-center justify-center text-sm flex-shrink-0">👤</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#ffaa00] font-mono text-[11px] truncate">
                          {f.discordUsername ? `@${f.discordUsername}` : shortenAddress(f.wallet)}
                        </p>
                        <p className="text-[#444] font-mono text-[9px]">{f.wins}W / {f.losses}L</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => declineRequest(f.wallet)}
                          className="text-[8px] font-mono px-2 py-1 border border-[#333] text-[#666] hover:border-[#ff4444] hover:text-[#ff4444] transition-colors"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => acceptRequest(f.wallet)}
                          className="text-[8px] font-mono px-2 py-1 border border-[#00aa00] text-[#00ff00] hover:bg-[#001a00] transition-colors"
                        >
                          ✓ ACCEPT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Online friends */}
              {onlineFriends.length > 0 && (
                <div>
                  <p className="text-[8px] text-[#00ff00] tracking-[1px] uppercase mb-2">
                    ● Online ({onlineFriends.length})
                  </p>
                  {onlineFriends.map(f => {
                    const onlineData = onlineMap.get(f.wallet.toLowerCase())
                    const inBattle   = onlineData?.status === "in-battle"
                    return (
                      <div key={f.wallet} className="flex items-center gap-3 py-2 border-b border-[#111]">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-[#0e0e18] border border-[#1a1a28] flex items-center justify-center text-sm">👤</div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${inBattle ? "bg-[#ff8800]" : "bg-[#00ff00]"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-mono text-[11px] truncate">
                            {f.discordUsername ? `@${f.discordUsername}` : shortenAddress(f.wallet)}
                          </p>
                          <p className={`font-mono text-[9px] ${inBattle ? "text-[#ff8800]" : "text-[#00aa00]"}`}>
                            {inBattle ? "⚔ In Battle" : "● Online"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#555] font-mono text-[9px]">{f.wins}W / {f.losses}L</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Offline friends */}
              {offlineFriends.length > 0 && (
                <div>
                  <p className="text-[8px] text-[#444] tracking-[1px] uppercase mb-2">
                    ○ Offline ({offlineFriends.length})
                  </p>
                  {offlineFriends.map(f => (
                    <div key={f.wallet} className="flex items-center gap-3 py-2 border-b border-[#111] opacity-50">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 bg-[#0e0e18] border border-[#1a1a28] flex items-center justify-center text-sm">👤</div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black bg-[#444]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#777] font-mono text-[11px] truncate">
                          {f.discordUsername ? `@${f.discordUsername}` : shortenAddress(f.wallet)}
                        </p>
                        <p className="text-[#333] font-mono text-[9px]">Offline</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#333] font-mono text-[9px]">{f.wins}W / {f.losses}L</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {friends.length === 0 && incoming.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-[#444] font-mono text-xs leading-relaxed">
                    No friends yet.<br />
                    Use the <span className="text-[#bb55ff]">ADD FRIEND</span> panel to find players.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}