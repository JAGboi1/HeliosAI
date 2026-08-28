"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export default function WaitingPage() {
  const router = useRouter()
  const [matchData, setMatchData] = useState<any | null>(null)
  const [wallet, setWallet] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const matchIdRef = useRef<string | null>(null)
  const walletRef = useRef<string | null>(null)
  const redirectingRef = useRef(false)

  // Load match + wallet from localStorage once on mount
  useEffect(() => {
    const storedWallet = localStorage.getItem("wallet")
    const storedMatch = localStorage.getItem("current_match")

    if (!storedWallet || !storedMatch) {
      router.push("/")
      return
    }

    const match = JSON.parse(storedMatch)
    walletRef.current = storedWallet
    matchIdRef.current = match.matchId

    setWallet(storedWallet)
    setMatchData(match)
  }, [router])

  // Polling — only depends on whether we have a matchId, NOT on matchData object
  useEffect(() => {
    if (!matchIdRef.current || !walletRef.current) return

    const poll = async () => {
      try {
        setIsPolling(true)
        const res = await fetch(`/api/challenges?matchId=${matchIdRef.current}`)
        if (!res.ok) return

        const data = await res.json()
        const ms = data.matchState
        if (!ms) return

        // Always persist freshest state to localStorage
        setMatchData((prev: any) => {
          if (!prev) return prev
          const updated = { ...prev, matchState: ms }
          localStorage.setItem("current_match", JSON.stringify(updated))
          return updated
        })

        const state = ms.state
        const w = walletRef.current!

        if (redirectingRef.current) return

        // Redirect to character creation if this player hasn't created yet
        if (state === "MATCH_FOUND" || state === "OPPONENT_CREATING") {
          const storedMatch = JSON.parse(localStorage.getItem("current_match") || "{}")
          const isPlayerA = w === storedMatch.playerA
          const myReady = isPlayerA ? ms.playerAReady : ms.playerBReady
          if (!myReady) {
            redirectingRef.current = true
            router.push("/character-creation")
            return
          }
        }

        // Both players submitted — go to battle
        if (state === "STARTING" || state === "IN_GAME") {
          redirectingRef.current = true
          router.push("/battle-generation")
        }
      } catch (e) {
        console.error("Waiting poll error:", e)
      } finally {
        setIsPolling(false)
      }
    }

    // Poll immediately then every 2s
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]) // Only router as dep — we use refs for matchId and wallet

  if (!matchData || !wallet) {
    return (
      <div className="min-h-screen bg-[#06060f] text-white flex items-center justify-center">
        <p className="text-[#666] font-mono text-lg">Loading match data...</p>
      </div>
    )
  }

  const ms = matchData.matchState || {}
  const isPlayerA = wallet === matchData.playerA
  const myCharacter = isPlayerA ? ms.playerACharacter : ms.playerBCharacter
  const opponentCharacter = isPlayerA ? ms.playerBCharacter : ms.playerACharacter
  const state = ms.state || "SEARCHING"

  const stateConfig: Record<string, { title: string; message: string; color: string }> = {
    SEARCHING:         { title: "SEARCHING FOR OPPONENT",      message: "Finding a worthy opponent...",                 color: "#ff8800" },
    MATCH_FOUND:       { title: "OPPONENT FOUND!",             message: "Redirecting to character creation...",         color: "#00ff00" },
    OPPONENT_CREATING: { title: "OPPONENT CREATING CHARACTER", message: "Your opponent is crafting their fighter...",   color: "#ffaa00" },
    READY:             { title: "BOTH PLAYERS READY!",         message: "Starting the battle soon...",                  color: "#00ff00" },
    STARTING:          { title: "STARTING BATTLE!",            message: "Battle is starting now...",                    color: "#bb55ff" },
    IN_GAME:           { title: "BATTLE IN PROGRESS",          message: "Generating the AI battle story...",            color: "#ff4444" },
  }

  const ui = stateConfig[state] || { title: state, message: "Please wait...", color: "#666" }

  return (
    <div className="min-h-screen bg-[#06060f] text-white font-mono flex items-center justify-center">
      <div className="text-center max-w-2xl w-full mx-4">
        <div className="bg-[#0e0e18] border border-[#bb55ff] p-8">
          <h1 className="font-pixel text-xl mb-8 animate-pulse" style={{ color: ui.color }}>
            {ui.title}
          </h1>

          {/* Your character */}
          <div className="mb-6">
            <h2 className="text-[#bb55ff] font-pixel text-sm mb-3">YOUR CHARACTER</h2>
            {myCharacter ? (
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] p-4 text-left">
                <p className="text-white font-pixel text-sm mb-1">{myCharacter.name}</p>
                <p className="text-[#888] font-mono text-xs mb-3">{myCharacter.class}</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-[#555]">HP</span><br /><span className="text-[#00ff00]">{myCharacter.health}</span></div>
                  <div><span className="text-[#555]">ATK</span><br /><span className="text-[#ff4444]">{myCharacter.attack}</span></div>
                  <div><span className="text-[#555]">DEF</span><br /><span className="text-[#4444ff]">{myCharacter.defense}</span></div>
                  <div><span className="text-[#555]">SPD</span><br /><span className="text-[#ffaa00]">{myCharacter.speed}</span></div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] p-4">
                <p className="text-[#ffaa00] font-pixel text-xs animate-pulse">Creating your character...</p>
              </div>
            )}
          </div>

          {/* Opponent status */}
          <div className="mb-8">
            <h2 className="text-[#ff4444] font-pixel text-sm mb-3">OPPONENT STATUS</h2>
            <div className="bg-[#0a0a0f] border border-[#2a2a3a] p-4">
              {opponentCharacter ? (
                <div>
                  <p className="text-[#00ff00] font-pixel text-xs animate-pulse mb-2">✓ OPPONENT READY!</p>
                  <p className="text-white font-mono text-sm">{opponentCharacter.name}</p>
                  <p className="text-[#666] font-mono text-xs">{opponentCharacter.class}</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-[#1a1a2a] rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#333]">
                    <span className="text-[#555] text-xl animate-pulse">?</span>
                  </div>
                  <p className="font-mono text-sm animate-pulse" style={{ color: ui.color }}>{ui.message}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[#444] font-mono text-xs">
            Match: {matchData.matchId?.slice(-8)} · {isPolling ? "⟳ syncing..." : "● live"}
          </p>
        </div>
      </div>
    </div>
  )
}