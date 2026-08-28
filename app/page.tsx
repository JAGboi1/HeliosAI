"use client"

import { useState, useCallback, useEffect } from "react"
import { useWallet } from "@/components/wallet-connector"
import { Navbar } from "@/components/helios-arena/navbar"
import { PlayerCard } from "@/components/helios-arena/player-card"
import { FriendsPanel } from "@/components/helios-arena/friends-panel"
import { HowItWorks } from "@/components/helios-arena/how-it-works"
import { BattleParams } from "@/components/helios-arena/battle-params"
import { OnlinePanel } from "@/components/helios-arena/online-panel"
import { OnlinePlayers } from "@/components/helios-arena/online-players"
import { RankingSystem } from "@/components/helios-arena/ranking-system"
import { DirectChallenge } from "@/components/helios-arena/direct-challenge"
import { ChallengeNotification } from "@/components/helios-arena/challenge-notification"
import { DebugPanel } from "@/components/helios-arena/debug-panel"
import { Footer } from "@/components/helios-arena/footer"
import { BootScreen } from "@/components/helios-arena/boot-screen"
import { ProfileModal } from "@/components/helios-arena/profile-modal"
import { BattleOverlay } from "@/components/helios-arena/battle-overlay"
import { VsScreen } from "@/components/helios-arena/vs-screen"
import { BattlesFeedModal } from "@/components/helios-arena/battles-modal"
import { LeaderboardModal } from "@/components/helios-arena/leaderboard-modal"
import { FriendsModal } from "@/components/helios-arena/friends-modal"

interface Battle {
  fighterA: string
  fighterB: string
  winner: string
  timestamp: string
}

const ONLINE_NAMES = [
  "LegendSlayer", "CryptoNinja", "ShadowBlade99", "NeonWarlord", "PixelDemon",
]

export default function HeliosArena() {
  const { wallet, isConnecting, connectWallet, disconnectWallet } = useWallet()
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [battles, setBattles] = useState<Battle[]>([])
  const [opponentInput, setOpponentInput] = useState("")
  const [battleType, setBattleType] = useState("duel")
  const [brutality, setBrutality] = useState(70)
  const [fighterA, setFighterA] = useState("")
  const [fighterB, setFighterB] = useState("")
  const [lastFighterA, setLastFighterA] = useState("")
  const [lastFighterB, setLastFighterB] = useState("")
  const [twitterHandle, setTwitterHandle] = useState("")
  const [discordHandle, setDiscordHandle] = useState("")

  // Modal states
  const [profileOpen,     setProfileOpen]     = useState(false)
  const [battleOpen,      setBattleOpen]      = useState(false)
  const [battlesOpen,     setBattlesOpen]     = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [friendsOpen,     setFriendsOpen]     = useState(false)

  const totalBattles = wins + losses

  useEffect(() => {
    if (!wallet) return
    const fetchUserStats = async () => {
      try {
        const res = await fetch('/api/users?wallet=' + wallet + '&stats=true')
        if (!res.ok) return
        const data = await res.json()
        if (data.stats) {
          setWins(data.stats.wins || 0)
          setLosses(data.stats.losses || 0)
        }
        if (data.history && data.history.length > 0) {
          const mapped = data.history.map((h: any) => ({
            fighterA:  h.my_character,
            fighterB:  h.opponent_character,
            winner:    h.result === 'win' ? h.my_character : h.opponent_character,
            timestamp: new Date(h.created_at).toLocaleTimeString()
          }))
          setBattles(mapped)
        }
      } catch (err) { console.error('Failed to fetch user stats:', err) }
    }
    fetchUserStats()
  }, [wallet])

  useEffect(() => {
    if (!wallet) return
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: wallet, status: 'online', discordUsername: discordHandle || null })
    }).catch(console.error)
  }, [wallet, discordHandle])

  useEffect(() => {
    if (typeof window === "undefined") return
    setTwitterHandle(localStorage.getItem("twitterHandle") ?? "")
    setDiscordHandle(localStorage.getItem("discordHandle") ?? "")
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("twitterHandle", twitterHandle)
  }, [twitterHandle])

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("discordHandle", discordHandle)
  }, [discordHandle])

  const openSocialPopup = (provider: "twitter" | "discord") => {
    return new Promise<string>((resolve, reject) => {
      const popup = window.open(`/api/auth/${provider}`, `${provider}-auth`, "width=500,height=700")
      if (!popup) { reject(new Error("Popup blocked")); return }
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        const data = event.data
        if (data?.source === "social-oauth" && data.provider === provider) {
          window.removeEventListener("message", handleMessage)
          clearInterval(poll)
          resolve(String(data.handle))
        }
      }
      window.addEventListener("message", handleMessage)
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.removeEventListener("message", handleMessage)
          clearInterval(poll)
          reject(new Error("Popup closed or denied"))
        }
      }, 500)
    })
  }

  const connectTwitter = async () => {
    try { setTwitterHandle(await openSocialPopup("twitter")) }
    catch (e) { alert("Unable to connect Twitter. Please try again.") }
  }

  const connectDiscord = async () => {
    try { setDiscordHandle(await openSocialPopup("discord")) }
    catch (e) { alert("Unable to connect Discord. Please try again.") }
  }

  const launchBattle = () => {
    if (!wallet) { alert("Connect your wallet first!"); return }
    const yourFighter = prompt("Your fighter name (e.g. Fire Samurai):", lastFighterA)?.trim()
    if (!yourFighter) return
    const opponent   = opponentInput.trim() || "Opponent"
    const oppFighter = prompt(`${opponent}'s fighter name:`, lastFighterB)?.trim()
    if (!oppFighter) return
    setLastFighterA(yourFighter); setLastFighterB(oppFighter)
    setFighterA(yourFighter);     setFighterB(oppFighter)
    setBattleOpen(true)
  }

  const handleBattleComplete = useCallback(
    (result: { winner: "A" | "B"; winnerName: string }) => {
      if (result.winner === "A") setWins(p => p + 1)
      else setLosses(p => p + 1)
      setBattles(prev => [{ fighterA, fighterB, winner: result.winnerName, timestamp: new Date().toLocaleTimeString() }, ...prev])
    },
    [fighterA, fighterB]
  )

  const shortenAddress = (a: string) => a.length <= 12 ? a : `${a.slice(0, 6)}...${a.slice(-4)}`
  const displayWallet  = wallet ? shortenAddress(wallet) : null
  const getRank        = () => wins > 5 ? "S" : wins > 2 ? "A" : "B"

  return (
    <>
      <BootScreen />

      <Navbar
        wallet={displayWallet}
        onConnectWallet={connectWallet}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenBattles={() => setBattlesOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
      />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-7 py-5 sm:py-[30px] pb-[88px]">

        {/* Title */}
        <div className="text-center mb-2">
          <span className="text-[16px] sm:text-[20px] text-[#aa44ee] mx-[10px] sm:mx-[14px]">⚔</span>
          <h1 className="text-[16px] sm:text-[20px] text-[#bb55ff] tracking-[2px] sm:tracking-[3px] inline [text-shadow:0_0_18px_#8811cc,0_0_45px_#550088]">
            MULTIPLAYER ARENA
          </h1>
          <span className="text-[16px] sm:text-[20px] text-[#aa44ee] mx-[10px] sm:mx-[14px]">⚔</span>
        </div>
        <p className="text-center font-mono text-[12px] sm:text-[14px] text-[#555] tracking-[0.8px] mb-5 sm:mb-[26px]">
          Challenge another user to an epic AI-powered battle
        </p>

        {/* VS Row — stacks on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_1fr] lg:grid-cols-[1fr_112px_1fr] gap-3 sm:gap-0 mb-4">
          <PlayerCard
            type="you"
            name="YOUR PROFILE"
            status={displayWallet || "Not connected"}
            stats={{ wins, battles: totalBattles, rank: wallet ? getRank() : "--" }}
          />

          <div className="flex items-center justify-center py-2 sm:py-0">
            <span className="text-[32px] sm:text-[42px] text-[#9933ee] tracking-[2px] [text-shadow:0_0_22px_#6611bb,0_0_50px_#44007a] animate-vs-pulse">
              VS
            </span>
          </div>

          <PlayerCard
            type="opponent"
            name="OPPONENT PROFILE"
            status="Waiting for opponent..."
            stats={{ wins: 0, battles: 0, rank: "--" }}
          />
        </div>

        {/* Mid Row — stacks on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FriendsPanel wallet={wallet} />
          <HowItWorks />
        </div>

        <OnlinePlayers />
        <DirectChallenge wallet={wallet} />
        <RankingSystem />

        <BattleParams
          battleType={battleType}
          setBattleType={setBattleType}
          brutality={brutality}
          setBrutality={setBrutality}
        />

        <div className="flex justify-center mb-[22px]">
          <button
            onClick={launchBattle}
            className="w-full max-w-[780px] bg-transparent border-[3px] border-arena-purple text-[#bb55ff] font-pixel text-[12px] sm:text-[15px] py-4 sm:py-[22px] px-6 sm:px-10 cursor-pointer tracking-[2px] text-center relative animate-challenge-pulse hover:bg-[rgba(119,51,204,0.09)] hover:shadow-[0_0_55px_rgba(119,51,204,0.8)] active:scale-[0.99] transition-colors"
          >
            <span className="absolute inset-[6px] border border-[rgba(119,51,204,0.2)] pointer-events-none" />
            <span className="text-[#ff8800] animate-flash">⚡</span> CHALLENGE OPPONENT <span className="text-[#ff8800] animate-flash">⚡</span>
            <span className="block font-mono text-[11px] sm:text-[13px] text-[#444] mt-2">
              Both players must confirm to start
            </span>
          </button>
        </div>
      </main>

      <OnlinePanel />
      <Footer totalBattles={totalBattles} />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        wallet={displayWallet}
        fullWalletAddress={wallet}
        totalBattles={totalBattles}
        wins={wins}
        losses={losses}
        battles={battles}
        twitterHandle={twitterHandle}
        discordHandle={discordHandle}
        onConnectTwitter={connectTwitter}
        onConnectDiscord={connectDiscord}
      />

      <BattlesFeedModal isOpen={battlesOpen} onClose={() => setBattlesOpen(false)} />
      <LeaderboardModal isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} currentWallet={wallet} />
      <FriendsModal isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} wallet={wallet} />

      <ChallengeNotification wallet={wallet} />
      <VsScreen wallet={wallet} />
      <DebugPanel wallet={wallet} />

      {battleOpen && (
        <BattleOverlay
          isOpen={battleOpen}
          fighterA={fighterA}
          fighterB={fighterB}
          onClose={() => setBattleOpen(false)}
          onBattleComplete={handleBattleComplete}
        />
      )}
    </>
  )
}