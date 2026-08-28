"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface VsScreenProps {
  wallet: string | null
}

export function VsScreen({ wallet }: VsScreenProps) {
  const router = useRouter()
  const [activeMatch, setActiveMatch] = useState<any | null>(null)
  const [redirectTimer, setRedirectTimer] = useState(5)
  const redirectingRef = useRef(false)

  useEffect(() => {
    if (!wallet) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/challenges?wallet=${wallet}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.activeMatches && data.activeMatches.length > 0) {
          const match = data.activeMatches[0]
          // Supabase returns snake_case: match_state
          const ms = match.match_state || match.matchState
          if (!ms) return

          const normalized = {
            matchId: match.id,
            playerA: match.challenger,
            playerB: match.challenged,
            status: match.status,
            state: ms.state,
            playerAReady: ms.playerAReady || false,
            playerBReady: ms.playerBReady || false,
            playerACharacter: ms.playerACharacter || null,
            playerBCharacter: ms.playerBCharacter || null,
            acceptedAt: ms.acceptedAt,
            lastStateChange: ms.lastStateChange
          }

          setActiveMatch(normalized)
        } else {
          setActiveMatch(null)
        }
      } catch (e) {
        console.error("VS Screen poll error:", e)
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [wallet])

  // Handle redirect when match is found
  useEffect(() => {
    if (!activeMatch || redirectingRef.current) return

    const { state, status, playerB } = activeMatch

    // Battle already done — don't redirect to character creation
    if (state === "STARTING" || state === "IN_GAME") return

    // Both players connected and match is accepted
    const shouldRedirect =
      status === "accepted" &&
      playerB &&
      (state === "MATCH_FOUND" || state === "OPPONENT_CREATING" || !state)

    if (!shouldRedirect) return

    redirectingRef.current = true

    // Store correct match shape in localStorage
    const matchToStore = {
      matchId: activeMatch.matchId,
      playerA: activeMatch.playerA,
      playerB: activeMatch.playerB,
      status: activeMatch.status,
      matchState: {
        playerA: activeMatch.playerA,
        playerB: activeMatch.playerB,
        state: activeMatch.state || "MATCH_FOUND",
        acceptedAt: activeMatch.acceptedAt,
        playerACharacter: activeMatch.playerACharacter,
        playerBCharacter: activeMatch.playerBCharacter,
        playerAReady: activeMatch.playerAReady,
        playerBReady: activeMatch.playerBReady,
        lastStateChange: activeMatch.lastStateChange || Date.now()
      }
    }
    localStorage.setItem("current_match", JSON.stringify(matchToStore))
    localStorage.setItem("wallet", wallet || "")

    // Countdown then redirect
    let count = 5
    setRedirectTimer(count)
    const timer = setInterval(() => {
      count--
      setRedirectTimer(count)
      if (count <= 0) {
        clearInterval(timer)
        router.push("/character-creation")
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      redirectingRef.current = false
    }
  }, [activeMatch, wallet, router])

  if (!wallet || !activeMatch) return null

  const isPlayerA = wallet === activeMatch.playerA
  const opponent = isPlayerA ? activeMatch.playerB : activeMatch.playerA
  const matchAccepted = activeMatch.status === "accepted" && activeMatch.playerB
  const battleDone = activeMatch.state === "STARTING" || activeMatch.state === "IN_GAME"

  if (battleDone) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#0e0e18] border border-[#bb55ff] p-8 max-w-4xl w-full mx-4">
        <h2 className="text-[#ff8800] font-pixel text-2xl mb-8 text-center animate-pulse">
          ⚔️ VS BATTLE ⚔️
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
          {/* Player A */}
          <div className="text-center">
            <h3 className="text-[#bb55ff] font-pixel text-sm mb-4">
              {isPlayerA ? "YOU" : "OPPONENT"}
            </h3>
            <div className="bg-[#0a0a0f] border-2 border-[#bb55ff] p-6">
              <div className="w-16 h-16 bg-[#1a1a2a] rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#bb55ff]">
                <span className="text-white text-xs font-bold">{activeMatch.playerA.slice(2, 6)}</span>
              </div>
              <p className="text-white font-mono text-xs truncate">{activeMatch.playerA.slice(0, 14)}...</p>
              <div className="mt-3 text-[#00ff00] font-mono text-xs">● READY</div>
            </div>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="text-[#ff8800] font-pixel text-5xl animate-pulse mb-4">VS</div>
            <p className="text-[#666] font-mono text-xs">Match ID: {activeMatch.matchId?.slice(-8)}</p>
          </div>

          {/* Player B */}
          <div className="text-center">
            <h3 className="text-[#ff4444] font-pixel text-sm mb-4">
              {isPlayerA ? "OPPONENT" : "YOU"}
            </h3>
            <div className="bg-[#0a0a0f] border-2 border-[#ff4444] p-6">
              {opponent ? (
                <>
                  <div className="w-16 h-16 bg-[#1a1a2a] rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#ff4444]">
                    <span className="text-white text-xs font-bold">{opponent.slice(2, 6)}</span>
                  </div>
                  <p className="text-white font-mono text-xs truncate">{opponent.slice(0, 14)}...</p>
                  <div className="mt-3 text-[#00ff00] font-mono text-xs">● READY</div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-[#1a1a2a] rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#666]">
                    <span className="text-[#666] text-2xl animate-pulse">?</span>
                  </div>
                  <p className="text-[#666] font-mono text-xs animate-pulse">Waiting...</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {matchAccepted ? (
            <div className="space-y-4">
              <div className="bg-[#001800] border border-[#00cc00] p-4">
                <p className="text-[#00ff00] font-pixel text-sm animate-pulse">
                  ⚔️ MATCH ACCEPTED! REDIRECTING IN {redirectTimer}s...
                </p>
              </div>
              <button
                onClick={() => router.push("/character-creation")}
                className="bg-[#00ff00] border-2 border-[#00cc00] text-black font-pixel text-xs px-8 py-3 hover:bg-[#00dd00] transition-colors"
              >
                CREATE CHARACTER NOW →
              </button>
            </div>
          ) : (
            <p className="text-[#ffaa00] font-mono text-sm animate-pulse">
              Waiting for opponent to accept...
            </p>
          )}
        </div>

        {/* Leave button */}
        <div className="text-center mt-4">
          <button
            onClick={async () => {
              if (activeMatch?.matchId) {
                await fetch('/api/challenges', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ challengeId: activeMatch.matchId, action: 'complete' })
                }).catch(() => {})
              }
              localStorage.removeItem('current_match')
              setActiveMatch(null)
            }}
            className="bg-transparent border border-[#333] text-[#555] font-pixel text-xs px-6 py-2 hover:border-[#ff4444] hover:text-[#ff4444] transition-colors"
          >
            ✕ LEAVE MATCH
          </button>
        </div>

      </div>
    </div>
  )
}