"use client"

import { useState, useEffect, useCallback } from "react"

interface FriendUser {
  wallet:          string
  discordUsername: string | null
  wins:            number
  losses:          number
  totalBattles:    number
  friendStatus?:   "none" | "pending" | "accepted"
  since?:          string
}

interface FriendsPanelProps {
  wallet: string | null // full wallet address
}

type View = "friends" | "search" | "requests"

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function WinRate({ wins, total }: { wins: number; total: number }) {
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0
  return (
    <span className={`text-[9px] font-mono ${rate >= 60 ? "text-[#00ff00]" : rate >= 40 ? "text-[#ffaa00]" : "text-[#ff4444]"}`}>
      {rate}% WR
    </span>
  )
}

function UserRow({
  user,
  wallet,
  onAction,
  actionLabel,
  actionStyle,
  secondAction,
  secondLabel,
}: {
  user: FriendUser
  wallet: string
  onAction: (u: FriendUser) => void
  actionLabel: string
  actionStyle: string
  secondAction?: (u: FriendUser) => void
  secondLabel?: string
}) {
  const [loading, setLoading] = useState(false)

  const handle = async (fn: (u: FriendUser) => void) => {
    setLoading(true)
    await fn(user)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#111] last:border-0">
      {/* Avatar placeholder */}
      <div className="w-8 h-8 flex-shrink-0 bg-[#0e0e18] border border-[#1a1a28] flex items-center justify-center text-sm">
        👤
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-mono text-[11px] truncate">
          {user.discordUsername ? (
            <><span className="text-[#bb55ff]">@{user.discordUsername}</span></>
          ) : (
            <span className="text-[#888]">{shortenAddress(user.wallet)}</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[#555] font-mono text-[9px]">{user.wins}W/{user.losses}L</span>
          <WinRate wins={user.wins} total={user.totalBattles} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {secondAction && secondLabel && (
          <button
            onClick={() => handle(secondAction)}
            disabled={loading}
            className="text-[8px] font-mono tracking-[0.5px] px-2 py-1 border border-[#333] text-[#666] hover:border-[#555] hover:text-[#aaa] transition-colors disabled:opacity-40"
          >
            {secondLabel}
          </button>
        )}
        <button
          onClick={() => handle(onAction)}
          disabled={loading}
          className={`text-[8px] font-mono tracking-[0.5px] px-2 py-1 border transition-colors disabled:opacity-40 ${actionStyle}`}
        >
          {loading ? "..." : actionLabel}
        </button>
      </div>
    </div>
  )
}

export function FriendsPanel({ wallet }: FriendsPanelProps) {
  const [view,        setView]        = useState<View>("friends")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [friends,     setFriends]     = useState<FriendUser[]>([])
  const [incoming,    setIncoming]    = useState<FriendUser[]>([])
  const [outgoing,    setOutgoing]    = useState<FriendUser[]>([])
  const [searching,   setSearching]   = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Load friends list
  const loadFriends = useCallback(async () => {
    if (!wallet) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/friends?wallet=${wallet}`)
      const data = await res.json()
      setFriends(data.friends  || [])
      setIncoming(data.incoming || [])
      setOutgoing(data.outgoing || [])
    } catch (err) {
      console.error("Failed to load friends:", err)
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    if (wallet) loadFriends()
  }, [wallet, loadFriends])

  // Search
  const handleSearch = async () => {
    if (!wallet || !searchQuery.trim()) return
    setSearching(true)
    try {
      const res  = await fetch(`/api/friends?wallet=${wallet}&search=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data)
      setView("search")
    } catch (err) {
      showToast("Search failed")
    } finally {
      setSearching(false)
    }
  }

  // API action helper
  const friendAction = async (action: string, targetWallet: string) => {
    if (!wallet) return
    const res = await fetch("/api/friends", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, walletA: wallet, walletB: targetWallet }),
    })
    return res.json()
  }

  const sendRequest = async (user: FriendUser) => {
    const res = await friendAction("send_request", user.wallet)
    if (res?.success) {
      showToast(`Friend request sent to ${user.discordUsername || shortenAddress(user.wallet)}!`)
      // Optimistically update search results
      setSearchResults(prev =>
        prev.map(u => u.wallet === user.wallet ? { ...u, friendStatus: "pending" } : u)
      )
      loadFriends()
    } else {
      showToast(res?.error || "Failed to send request")
    }
  }

  const acceptRequest = async (user: FriendUser) => {
    const res = await friendAction("accept", user.wallet)
    if (res?.success) {
      showToast(`You and ${user.discordUsername || shortenAddress(user.wallet)} are now friends!`)
      loadFriends()
    } else {
      showToast("Failed to accept request")
    }
  }

  const declineRequest = async (user: FriendUser) => {
    await friendAction("decline", user.wallet)
    loadFriends()
  }

  const removeFriend = async (user: FriendUser) => {
    const res = await friendAction("remove", user.wallet)
    if (res?.success) {
      showToast(`Removed ${user.discordUsername || shortenAddress(user.wallet)}`)
      loadFriends()
    }
  }

  const cancelRequest = async (user: FriendUser) => {
    await friendAction("decline", user.wallet)
    setOutgoing(prev => prev.filter(u => u.wallet !== user.wallet))
    showToast("Request cancelled")
  }

  if (!wallet) {
    return (
      <div className="bg-[#0c0c13] border border-[#1a1a28] p-5">
        <div className="text-[9px] text-[#777] tracking-[2px] mb-4 uppercase">ADD FRIEND</div>
        <p className="text-[#444] font-mono text-xs text-center py-4">Connect your wallet to add friends.</p>
      </div>
    )
  }

  const pendingCount = incoming.length

  return (
    <div className="bg-[#0c0c13] border border-[#1a1a28] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9px] text-[#777] tracking-[2px] uppercase">ADD FRIEND</div>
        <div className="flex gap-1">
          {(["friends", "requests", "search"] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[8px] font-mono tracking-[0.5px] px-2 py-1 border transition-colors ${
                view === v
                  ? "border-[#bb55ff] text-[#bb55ff] bg-[#1a0033]"
                  : "border-[#222] text-[#444] hover:text-[#777] hover:border-[#333]"
              }`}
            >
              {v === "friends"  ? `FRIENDS${friends.length > 0 ? ` (${friends.length})` : ""}` :
               v === "requests" ? `REQUESTS${pendingCount > 0 ? ` (${pendingCount})` : ""}` :
               "SEARCH"}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar — always visible */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search for a friend by wallet, username, Twitter, or Discord"
          className="flex-1 bg-black border border-[#242430] text-[#bbb] font-mono text-[13px] py-[9px] px-3 outline-none tracking-[0.3px] placeholder:text-[#2e2e38] focus:border-arena-purple focus:shadow-[0_0_8px_rgba(119,51,204,0.2)] transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="font-pixel text-[9px] py-[9px] px-[14px] cursor-pointer border-2 tracking-[1px] bg-[#26004a] border-arena-purple text-[#cc88ff] shadow-[0_0_10px_rgba(119,51,204,0.27)] hover:bg-[#360066] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {searching ? "..." : "🔍 SEARCH"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-[#0e1a0e] border border-[#00aa00] px-3 py-2 mb-3 font-mono text-[10px] text-[#00ff00]">
          {toast}
        </div>
      )}

      {/* ── SEARCH RESULTS ───────────────────────────────────────────────── */}
      {view === "search" && (
        <div>
          {searchResults.length === 0 ? (
            <p className="text-[#444] font-mono text-xs text-center py-4">No users found.</p>
          ) : (
            searchResults.map(user => (
              <UserRow
                key={user.wallet}
                user={user}
                wallet={wallet}
                actionLabel={
                  user.friendStatus === "accepted" ? "FRIENDS ✓" :
                  user.friendStatus === "pending"  ? "PENDING..."  :
                  "+ ADD"
                }
                actionStyle={
                  user.friendStatus === "accepted"
                    ? "border-[#00aa00] text-[#00ff00] cursor-default"
                    : user.friendStatus === "pending"
                    ? "border-[#555] text-[#555] cursor-default"
                    : "border-[#bb55ff] text-[#bb55ff] hover:bg-[#1a0033]"
                }
                onAction={
                  user.friendStatus === "none" ? sendRequest : async () => {}
                }
              />
            ))
          )}
        </div>
      )}

      {/* ── FRIENDS LIST ─────────────────────────────────────────────────── */}
      {view === "friends" && (
        <div>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-[#444] font-mono text-xs text-center py-4">
              No friends yet. Search for players to add!
            </p>
          ) : (
            friends.map(user => (
              <UserRow
                key={user.wallet}
                user={user}
                wallet={wallet}
                actionLabel="CHALLENGE"
                actionStyle="border-[#ff8800] text-[#ff8800] hover:bg-[#1a0800]"
                onAction={async (u) => {
                  // Copy wallet to clipboard so user can paste into challenge input
                  await navigator.clipboard.writeText(u.wallet)
                  showToast(`${u.discordUsername || shortenAddress(u.wallet)}'s address copied — paste it in the challenge field!`)
                }}
                secondAction={removeFriend}
                secondLabel="REMOVE"
              />
            ))
          )}
        </div>
      )}

      {/* ── REQUESTS ─────────────────────────────────────────────────────── */}
      {view === "requests" && (
        <div>
          {incoming.length === 0 && outgoing.length === 0 ? (
            <p className="text-[#444] font-mono text-xs text-center py-4">No pending requests.</p>
          ) : (
            <>
              {incoming.length > 0 && (
                <>
                  <p className="text-[8px] text-[#555] tracking-[1px] uppercase mb-2">Incoming</p>
                  {incoming.map(user => (
                    <UserRow
                      key={user.wallet}
                      user={user}
                      wallet={wallet}
                      actionLabel="ACCEPT ✓"
                      actionStyle="border-[#00aa00] text-[#00ff00] hover:bg-[#001a00]"
                      onAction={acceptRequest}
                      secondAction={declineRequest}
                      secondLabel="DECLINE"
                    />
                  ))}
                </>
              )}
              {outgoing.length > 0 && (
                <>
                  <p className="text-[8px] text-[#555] tracking-[1px] uppercase mb-2 mt-3">Sent</p>
                  {outgoing.map(user => (
                    <UserRow
                      key={user.wallet}
                      user={user}
                      wallet={wallet}
                      actionLabel="CANCEL"
                      actionStyle="border-[#444] text-[#666] hover:border-[#ff4444] hover:text-[#ff4444]"
                      onAction={cancelRequest}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}