"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Web3Modal from "web3modal"
import WalletConnectProvider from "@walletconnect/web3-provider"
import { BrowserProvider } from "ethers"
import { Navbar } from "@/components/helios-arena/navbar"
import { PlayerCard } from "@/components/helios-arena/player-card"
import { ChallengePanel } from "@/components/helios-arena/challenge-panel"
import { HowItWorks } from "@/components/helios-arena/how-it-works"
import { BattleParams } from "@/components/helios-arena/battle-params"
import { OnlinePanel } from "@/components/helios-arena/online-panel"
import { Footer } from "@/components/helios-arena/footer"
import { BootScreen } from "@/components/helios-arena/boot-screen"
import { ProfileModal } from "@/components/helios-arena/profile-modal"
import { BattleOverlay } from "@/components/helios-arena/battle-overlay"

interface Battle {
  fighterA: string
  fighterB: string
  winner: string
  timestamp: string
}

const ONLINE_NAMES = [
  "LegendSlayer",
  "CryptoNinja",
  "ShadowBlade99",
  "NeonWarlord",
  "PixelDemon",
]

export default function HeliosArena() {
  // State
  const [wallet, setWallet] = useState<string | null>(null)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [battles, setBattles] = useState<Battle[]>([])
  const [opponentInput, setOpponentInput] = useState("")
  const [battleType, setBattleType] = useState("duel")
  const [brutality, setBrutality] = useState(70)
  const [profileOpen, setProfileOpen] = useState(false)
  const [battleOpen, setBattleOpen] = useState(false)
  const [fighterA, setFighterA] = useState("")
  const [fighterB, setFighterB] = useState("")
  const [lastFighterA, setLastFighterA] = useState("")
  const [lastFighterB, setLastFighterB] = useState("")
  const [twitterHandle, setTwitterHandle] = useState("")
  const [discordHandle, setDiscordHandle] = useState("")

  const totalBattles = wins + losses

  const web3ModalRef = useRef<Web3Modal | null>(null)
  const providerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setTwitterHandle(localStorage.getItem("twitterHandle") ?? "")
    setDiscordHandle(localStorage.getItem("discordHandle") ?? "")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("twitterHandle", twitterHandle)
  }, [twitterHandle])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("discordHandle", discordHandle)
  }, [discordHandle])

  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: {
          1: "https://cloudflare-eth.com",
        },
        qrcode: true,
      },
    },
  }

  const getWeb3Modal = () => {
    if (!web3ModalRef.current) {
      web3ModalRef.current = new Web3Modal({
        cacheProvider: true,
        providerOptions,
      })
    }
    return web3ModalRef.current
  }

  const openSocialPopup = (provider: "twitter" | "discord") => {
    return new Promise<string>((resolve, reject) => {
      const popup = window.open(
        `/api/auth/${provider}`,
        `${provider}-auth`,
        "width=500,height=700"
      )

      if (!popup) {
        reject(new Error("Popup blocked"))
        return
      }

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
    try {
      const handle = await openSocialPopup("twitter")
      setTwitterHandle(handle)
    } catch (error) {
      console.error("Twitter connect failed:", error)
      alert("Unable to connect Twitter. Please try again.")
    }
  }

  const connectDiscord = async () => {
    try {
      const handle = await openSocialPopup("discord")
      setDiscordHandle(handle)
    } catch (error) {
      console.error("Discord connect failed:", error)
      alert("Unable to connect Discord. Please try again.")
    }
  }

  const handleDisconnect = async () => {
    const provider = providerRef.current
    if (provider?.removeListener) {
      provider.removeListener("accountsChanged", handleAccountsChanged)
      provider.removeListener("disconnect", handleDisconnect)
    }

    try {
      if (provider?.disconnect) {
        await provider.disconnect()
      } else if (provider?.close) {
        await provider.close()
      }
    } catch (error) {
      console.warn("Error while disconnecting wallet:", error)
    }

    getWeb3Modal().clearCachedProvider()
    providerRef.current = null
    setWallet(null)
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (Array.isArray(accounts) && accounts.length > 0) {
      setWallet(String(accounts[0]))
    } else {
      handleDisconnect()
    }
  }

  const connectWallet = async () => {
    if (wallet) {
      await handleDisconnect()
      return
    }

    const web3Modal = getWeb3Modal()

    try {
      const instance = await web3Modal.connect()
      providerRef.current = instance

      const provider = new BrowserProvider(instance)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWallet(address)

      if (instance.on) {
        instance.on("accountsChanged", handleAccountsChanged)
        instance.on("disconnect", handleDisconnect)
      }
    } catch (error) {
      console.error("Wallet connection failed:", error)
      alert("Wallet connection failed. Please try again.")
    }
  }

  useEffect(() => {
    const web3Modal = getWeb3Modal()
    if (web3Modal.cachedProvider) {
      connectWallet()
    }
  }, [])

  const handleSearch = () => {
    const value = opponentInput.trim()
    if (!value) {
      alert("Enter address or username")
      return
    }
    // Visual feedback would go here
  }

  const handleBrowseOnline = () => {
    const randomName = ONLINE_NAMES[Math.floor(Math.random() * ONLINE_NAMES.length)]
    setOpponentInput(randomName)
  }

  const launchBattle = () => {
    if (!wallet) {
      alert("Connect your wallet first!")
      return
    }

    const yourFighter = prompt("Your fighter name (e.g. Fire Samurai):", lastFighterA)?.trim()
    if (!yourFighter) return

    const opponent = opponentInput.trim() || "Opponent"
    const oppFighter = prompt(`${opponent}'s fighter name:`, lastFighterB)?.trim()
    if (!oppFighter) return

    setLastFighterA(yourFighter)
    setLastFighterB(oppFighter)
    setFighterA(yourFighter)
    setFighterB(oppFighter)
    setBattleOpen(true)
  }

  const handleBattleComplete = useCallback(
    (result: { winner: "A" | "B"; winnerName: string }) => {
      if (result.winner === "A") {
        setWins((prev) => prev + 1)
      } else {
        setLosses((prev) => prev + 1)
      }

      setBattles((prev) => [
        {
          fighterA,
          fighterB,
          winner: result.winnerName,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ])
    },
    [fighterA, fighterB]
  )

  const getRank = () => {
    if (wins > 5) return "S"
    if (wins > 2) return "A"
    return "B"
  }

  return (
    <>
      <BootScreen />

      <Navbar
        wallet={wallet}
        onConnectWallet={connectWallet}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <main className="max-w-[1320px] mx-auto px-7 py-[30px] pb-[88px]">
        {/* Title */}
        <div className="text-center mb-2">
          <span className="text-[20px] text-[#aa44ee] mx-[14px]">⚔</span>
          <h1 className="text-[20px] text-[#bb55ff] tracking-[3px] inline [text-shadow:0_0_18px_#8811cc,0_0_45px_#550088]">
            MULTIPLAYER ARENA
          </h1>
          <span className="text-[20px] text-[#aa44ee] mx-[14px]">⚔</span>
        </div>
        <p className="text-center font-mono text-[14px] text-[#555] tracking-[0.8px] mb-[26px]">
          Challenge another user to an epic AI-powered battle
        </p>

        {/* Players Row */}
        <div className="grid grid-cols-[1fr_112px_1fr] mb-4">
          <PlayerCard
            type="you"
            name="YOUR PROFILE"
            status={wallet || "Not connected"}
            stats={{ wins, battles: totalBattles, rank: wallet ? getRank() : "--" }}
          />

          <div className="flex items-center justify-center">
            <span className="text-[42px] text-[#9933ee] tracking-[2px] [text-shadow:0_0_22px_#6611bb,0_0_50px_#44007a] animate-vs-pulse">
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

        {/* Mid Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ChallengePanel
            opponentInput={opponentInput}
            setOpponentInput={setOpponentInput}
            onSearch={handleSearch}
            onBrowseOnline={handleBrowseOnline}
          />
          <HowItWorks />
        </div>

        {/* Battle Parameters */}
        <BattleParams
          battleType={battleType}
          setBattleType={setBattleType}
          brutality={brutality}
          setBrutality={setBrutality}
        />

        {/* Challenge Button */}
        <div className="flex justify-center mb-[22px]">
          <button
            onClick={launchBattle}
            className="w-full max-w-[780px] bg-transparent border-[3px] border-arena-purple text-[#bb55ff] font-pixel text-[15px] py-[22px] px-10 cursor-pointer tracking-[2px] text-center relative animate-challenge-pulse hover:bg-[rgba(119,51,204,0.09)] hover:shadow-[0_0_55px_rgba(119,51,204,0.8)] active:scale-[0.99] transition-colors"
          >
            <span className="absolute inset-[6px] border border-[rgba(119,51,204,0.2)] pointer-events-none" />
            <span className="text-[#ff8800] animate-flash">⚡</span> CHALLENGE
            OPPONENT <span className="text-[#ff8800] animate-flash">⚡</span>
            <span className="block font-mono text-[13px] text-[#444] mt-2">
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
        wallet={wallet}
        totalBattles={totalBattles}
        wins={wins}
        losses={losses}
        battles={battles}
        twitterHandle={twitterHandle}
        discordHandle={discordHandle}
        onConnectTwitter={connectTwitter}
        onConnectDiscord={connectDiscord}
      />

      <BattleOverlay
        isOpen={battleOpen}
        onClose={() => setBattleOpen(false)}
        fighterA={fighterA}
        fighterB={fighterB}
        onBattleComplete={handleBattleComplete}
      />
    </>
  )
}
