"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface NFT {
  contractAddress:  string
  tokenId:          string
  name:             string
  description:      string
  imageUrl:         string
  traits:           { trait_type: string; value: string }[]
  collectionName:   string
  collectionSymbol: string
  floorPrice?:      number | null
}

interface ForgedFighter {
  fighterName: string
  class:       string
  lore:        string
  powers:      string[]
  skills:      string[]
  stats: {
    health:  number
    attack:  number
    defense: number
    speed:   number
  }
  element:    string
  rarity:     string
  battleCry:  string
}

interface MatchData {
  matchId: string
  playerA: string
  playerB?: string
  status:  string
  matchState: {
    playerA:          string
    playerB?:         string
    state:            string
    playerACharacter: any
    playerBCharacter: any
    playerAReady:     boolean
    playerBReady:     boolean
    lastStateChange:  number
  }
}

const RARITY_COLOR: Record<string, string> = {
  "Common":     "#aaaaaa",
  "Rare":       "#ffcc44",
  "Ultra Rare": "#66aaff",
  "Legendary":  "#cc66ff",
}

const ELEMENT_EMOJI: Record<string, string> = {
  Fire: "🔥", Ice: "❄️", Lightning: "⚡", Shadow: "🌑",
  Light: "✨", Earth: "🌍", Wind: "🌪️", Void: "🌀",
}

type Step = "select_nft" | "forging" | "review_fighter" | "strategy"

export default function CharacterCreation() {
  const router = useRouter()

  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [wallet,    setWallet]    = useState<string | null>(null)
  const [step,      setStep]      = useState<Step>("select_nft")

  // NFT selection
  const [nfts,          setNfts]          = useState<NFT[]>([])
  const [loadingNfts,   setLoadingNfts]   = useState(false)
  const [nftError,      setNftError]      = useState<string | null>(null)
  const [selectedNft,   setSelectedNft]   = useState<NFT | null>(null)

  // Fighter forge
  const [fighter,       setFighter]       = useState<ForgedFighter | null>(null)
  const [forgeError,    setForgeError]    = useState<string | null>(null)

  // Battle strategy
  const [strategy,      setStrategy]      = useState("")
  const [submitting,    setSubmitting]    = useState(false)

  // Load match + wallet
  useEffect(() => {
    const storedWallet = localStorage.getItem("wallet")
    const storedMatch  = localStorage.getItem("current_match")

    if (!storedWallet || !storedMatch) { router.push("/"); return }

    const match = JSON.parse(storedMatch)
    if (!match.matchState) {
      match.matchState = {
        playerA: match.playerA, playerB: match.playerB,
        state: "MATCH_FOUND", playerAReady: false, playerBReady: false,
        lastStateChange: Date.now()
      }
    }
    setWallet(storedWallet)
    setMatchData(match)
    fetchNfts(storedWallet)
  }, [router])

  const fetchNfts = async (walletAddress: string) => {
    setLoadingNfts(true)
    setNftError(null)
    try {
      const res  = await fetch(`/api/nft-import?wallet=${walletAddress}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch NFTs")
      setNfts(data.nfts || [])
      if ((data.nfts || []).length === 0) {
        setNftError("No NFTs found in this wallet on Ethereum mainnet.")
      }
    } catch (err: any) {
      setNftError(err.message || "Failed to load your NFTs")
    } finally {
      setLoadingNfts(false)
    }
  }

  const handleSelectNft = (nft: NFT) => {
    setSelectedNft(nft)
  }

  const handleForge = async () => {
    if (!selectedNft) return
    setStep("forging")
    setForgeError(null)

    try {
      const res  = await fetch("/api/forge-fighter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nft: selectedNft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to forge fighter")
      setFighter(data.fighter)
      setStep("review_fighter")
    } catch (err: any) {
      setForgeError(err.message || "Something went wrong forging your fighter")
      setStep("select_nft")
    }
  }

  const handleSubmit = async () => {
    if (!wallet || !matchData || !fighter || !selectedNft) return
    setSubmitting(true)

    const characterData = {
      name:        fighter.fighterName,
      class:       fighter.class,
      description: fighter.lore,
      skills:      fighter.skills,
      powers:      fighter.powers,
      health:      fighter.stats.health,
      attack:      fighter.stats.attack,
      defense:     fighter.stats.defense,
      speed:       fighter.stats.speed,
      // Extra NFT + fighter metadata
      nftName:     selectedNft.name,
      nftImage:    selectedNft.imageUrl,
      collection:  selectedNft.collectionName,
      element:     fighter.element,
      rarity:      fighter.rarity,
      battleCry:   fighter.battleCry,
      strategy:    strategy,
    }

    localStorage.setItem(`character_${wallet}`, JSON.stringify(characterData))

    try {
      const res = await fetch("/api/challenges", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          challengeId: matchData.matchId,
          action:      "update-character",
          wallet:      wallet,
          character:   characterData,
        }),
      })
      const result = await res.json()
      if (res.ok && result.matchState) {
        const updatedMatch = { ...matchData, matchState: result.matchState }
        localStorage.setItem("current_match", JSON.stringify(updatedMatch))
      }
    } catch (err) {
      console.error("Failed to submit character:", err)
    }

    router.push("/waiting")
  }

  if (!matchData || !wallet) {
    return (
      <div className="min-h-screen bg-[#06060f] text-white font-mono flex items-center justify-center">
        <p className="text-[#666] text-lg">Loading match data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06060f] text-white font-mono">

      {/* Header */}
      <div className="bg-[#0e0e18] border-b border-[#1a1a28] p-4 sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between max-w-4xl">
          <div>
            <h1 className="text-[#ff8800] font-pixel text-base sm:text-xl">⚔ NFT BATTLE FORGE</h1>
            <p className="text-[#555] font-mono text-xs mt-0.5">Import your NFT · AI forges your fighter · Write your strategy</p>
          </div>
          <div className="text-[#444] font-mono text-xs">Match: {matchData.matchId.slice(-8)}</div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="container mx-auto max-w-4xl px-4 pt-6">
        <div className="flex items-center gap-2 mb-8">
          {[
            { id: "select_nft",     label: "1. SELECT NFT"     },
            { id: "forging",        label: "2. FORGE"          },
            { id: "review_fighter", label: "3. YOUR FIGHTER"   },
            { id: "strategy",       label: "4. STRATEGY"       },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`font-pixel text-[8px] sm:text-[9px] tracking-[1px] whitespace-nowrap ${
                step === s.id ? "text-[#ff8800]" :
                ["review_fighter", "strategy"].includes(step) && i < ["select_nft","forging","review_fighter","strategy"].indexOf(step)
                  ? "text-[#00aa00]" : "text-[#333]"
              }`}>
                {s.label}
              </div>
              {i < 3 && <div className={`flex-1 h-px ${step === s.id ? "bg-[#ff8800]" : "bg-[#1a1a28]"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-12">

        {/* ── STEP 1: SELECT NFT ──────────────────────────────────────────── */}
        {step === "select_nft" && (
          <div className="space-y-6">
            <div className="bg-[#0e0e18] border border-[#1a1a28] p-5">
              <h2 className="text-[#bb55ff] font-pixel text-sm mb-2">SELECT YOUR NFT</h2>
              <p className="text-[#666] font-mono text-xs mb-5">
                Choose an NFT from your Ethereum wallet. The AI will read its traits and forge your battle fighter.
              </p>

              {loadingNfts && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-[#bb55ff] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#555] font-mono text-xs animate-pulse">Scanning your wallet for NFTs...</p>
                </div>
              )}

              {nftError && !loadingNfts && (
                <div className="bg-[#0a0a12] border border-[#ff444433] p-4 text-center mb-4">
                  <p className="text-[#ff6666] font-mono text-xs mb-3">{nftError}</p>
                  <button
                    onClick={() => fetchNfts(wallet)}
                    className="bg-[#1a1a2a] border border-[#333] text-[#bbb] font-pixel text-[9px] px-4 py-2 hover:bg-[#22223a] transition-colors"
                  >
                    RETRY
                  </button>
                </div>
              )}

              {!loadingNfts && nfts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {nfts.map((nft) => (
                    <div
                      key={`${nft.contractAddress}-${nft.tokenId}`}
                      onClick={() => handleSelectNft(nft)}
                      className={`cursor-pointer border-2 transition-all duration-200 ${
                        selectedNft?.tokenId === nft.tokenId && selectedNft?.contractAddress === nft.contractAddress
                          ? "border-[#ff8800] bg-[#0a0800] shadow-[0_0_12px_rgba(255,136,0,0.3)]"
                          : "border-[#1a1a28] bg-[#0a0a12] hover:border-[#333]"
                      }`}
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={nft.imageUrl}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%231a1a2a'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23444' font-size='30'%3E%3F%3C/text%3E%3C/svg%3E"
                          }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-white font-mono text-[10px] truncate font-semibold">{nft.name}</p>
                        <p className="text-[#555] font-mono text-[9px] truncate">{nft.collectionName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected NFT preview + forge button */}
            {selectedNft && (
              <div className="bg-[#0a0800] border border-[#ff880033] p-5">
                <div className="flex gap-4 items-start mb-4">
                  <img
                    src={selectedNft.imageUrl}
                    alt={selectedNft.name}
                    className="w-20 h-20 object-cover border border-[#ff8800] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#ff8800] font-pixel text-sm mb-1">{selectedNft.name}</p>
                    <p className="text-[#666] font-mono text-xs mb-3">{selectedNft.collectionName}</p>
                    {selectedNft.traits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedNft.traits.slice(0, 6).map((t, i) => (
                          <span key={i} className="bg-[#1a1200] border border-[#ff880033] text-[#ff8800] font-mono text-[8px] px-2 py-0.5">
                            {t.trait_type}: {t.value}
                          </span>
                        ))}
                        {selectedNft.traits.length > 6 && (
                          <span className="text-[#444] font-mono text-[8px] px-1">+{selectedNft.traits.length - 6} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {forgeError && (
                  <p className="text-[#ff4444] font-mono text-xs mb-3">{forgeError}</p>
                )}

                <button
                  onClick={handleForge}
                  className="w-full bg-[#ff8800] border-2 border-[#ffaa00] text-black font-pixel text-sm py-3 hover:bg-[#ffaa00] transition-colors"
                >
                  ⚡ FORGE MY FIGHTER
                </button>
                <p className="text-[#444] font-mono text-[9px] text-center mt-2">
                  AI will analyze your NFT traits and forge a unique battle fighter
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: FORGING ─────────────────────────────────────────────── */}
        {step === "forging" && (
          <div className="bg-[#0e0e18] border border-[#bb55ff] p-12 text-center">
            <div className="text-5xl mb-6 animate-bounce">⚒️</div>
            <h2 className="text-[#ff8800] font-pixel text-lg mb-4 animate-pulse">FORGING YOUR FIGHTER...</h2>
            <p className="text-[#666] font-mono text-sm mb-8">
              The AI is analyzing your NFT traits and forging a unique battle fighter.
            </p>
            <div className="space-y-3 max-w-xs mx-auto text-left">
              {[
                "Reading NFT traits...",
                "Analyzing rarity and essence...",
                "Generating fighter lore...",
                "Calculating battle stats...",
                "Forging powers and skills...",
              ].map((msg, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#bb55ff] animate-pulse flex-shrink-0"
                    style={{ animationDelay: `${i * 0.3}s` }} />
                  <span className="text-[#666] font-mono text-xs">{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW FIGHTER ──────────────────────────────────────── */}
        {step === "review_fighter" && fighter && selectedNft && (
          <div className="space-y-4">
            {/* Fighter card */}
            <div className="bg-[#0e0e18] border-2 p-5"
              style={{ borderColor: RARITY_COLOR[fighter.rarity] || "#444" }}>

              <div className="flex items-center gap-2 mb-4">
                <span className="font-pixel text-[9px] px-2 py-1 border"
                  style={{ color: RARITY_COLOR[fighter.rarity], borderColor: RARITY_COLOR[fighter.rarity], backgroundColor: `${RARITY_COLOR[fighter.rarity]}22` }}>
                  {fighter.rarity.toUpperCase()}
                </span>
                <span className="text-[#555] font-mono text-[9px]">{ELEMENT_EMOJI[fighter.element]} {fighter.element}</span>
              </div>

              <div className="flex gap-4 mb-5">
                <img src={selectedNft.imageUrl} alt={selectedNft.name}
                  className="w-24 h-24 object-cover border flex-shrink-0"
                  style={{ borderColor: RARITY_COLOR[fighter.rarity] || "#444" }} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-pixel text-lg mb-1">{fighter.fighterName}</h2>
                  <p className="text-[#bb55ff] font-mono text-xs mb-1">{fighter.class} · from {selectedNft.name}</p>
                  <p className="text-[#ffaa00] font-mono text-xs italic">"{fighter.battleCry}"</p>
                </div>
              </div>

              {/* Lore */}
              <div className="bg-[#0a0a12] border border-[#1a1a28] p-3 mb-4">
                <p className="text-[#7a7a8a] font-mono text-[9px] uppercase tracking-[1px] mb-1">LORE</p>
                <p className="text-[#bbb] font-mono text-xs leading-relaxed">{fighter.lore}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "HP",  value: fighter.stats.health,  color: "#00ff00" },
                  { label: "ATK", value: fighter.stats.attack,  color: "#ff4444" },
                  { label: "DEF", value: fighter.stats.defense, color: "#4488ff" },
                  { label: "SPD", value: fighter.stats.speed,   color: "#ffaa00" },
                ].map(s => (
                  <div key={s.label} className="bg-[#0a0a12] border border-[#1a1a28] p-3 text-center">
                    <span className="text-[#555] font-mono text-[9px] block">{s.label}</span>
                    <span className="font-pixel text-lg" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Powers */}
              <div className="mb-4">
                <p className="text-[#7a7a8a] font-mono text-[9px] uppercase tracking-[1px] mb-2">POWERS</p>
                <div className="space-y-2">
                  {fighter.powers.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#ff8800] font-mono text-[9px] flex-shrink-0">⚡</span>
                      <span className="text-[#ccc] font-mono text-[11px]">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-[#7a7a8a] font-mono text-[9px] uppercase tracking-[1px] mb-2">SKILLS</p>
                <div className="space-y-2">
                  {fighter.skills.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#bb55ff] font-mono text-[9px] flex-shrink-0">⚔</span>
                      <span className="text-[#ccc] font-mono text-[11px]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("select_nft"); setFighter(null) }}
                className="flex-1 bg-[#1a1a2a] border border-[#333] text-[#888] font-pixel text-xs py-3 hover:bg-[#22223a] transition-colors"
              >
                ← CHOOSE DIFFERENT NFT
              </button>
              <button
                onClick={() => setStep("strategy")}
                className="flex-1 bg-[#ff8800] border-2 border-[#ffaa00] text-black font-pixel text-xs py-3 hover:bg-[#ffaa00] transition-colors"
              >
                SET BATTLE STRATEGY →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: BATTLE STRATEGY ─────────────────────────────────────── */}
        {step === "strategy" && fighter && selectedNft && (
          <div className="space-y-4">

            {/* Fighter summary */}
            <div className="bg-[#0a0a12] border border-[#1a1a28] p-4 flex gap-3 items-center">
              <img src={selectedNft.imageUrl} alt={selectedNft.name}
                className="w-12 h-12 object-cover border border-[#333] flex-shrink-0" />
              <div>
                <p className="text-white font-pixel text-sm">{fighter.fighterName}</p>
                <p className="text-[#666] font-mono text-xs">{fighter.class} · {ELEMENT_EMOJI[fighter.element]} {fighter.element}</p>
              </div>
            </div>

            {/* Powers reminder */}
            <div className="bg-[#0e0e18] border border-[#1a1a28] p-4">
              <p className="text-[#7a7a8a] font-mono text-[9px] uppercase tracking-[1px] mb-3">YOUR FIGHTER'S POWERS — USE THESE IN YOUR STRATEGY</p>
              <div className="space-y-1.5">
                {fighter.powers.map((p, i) => (
                  <p key={i} className="text-[#bbb] font-mono text-[11px]">
                    <span className="text-[#ff8800]">⚡</span> {p}
                  </p>
                ))}
                {fighter.skills.map((s, i) => (
                  <p key={i} className="text-[#bbb] font-mono text-[11px]">
                    <span className="text-[#bb55ff]">⚔</span> {s}
                  </p>
                ))}
              </div>
            </div>

            {/* Strategy input */}
            <div className="bg-[#0e0e18] border border-[#1a1a28] p-5">
              <h2 className="text-[#bb55ff] font-pixel text-sm mb-2">YOUR BATTLE STRATEGY</h2>
              <p className="text-[#666] font-mono text-xs mb-4 leading-relaxed">
                Write how your fighter will approach the battle. Use your powers and skills strategically.
                The AI will use your strategy + your fighter's stats to determine the outcome.
                A smart strategy for your fighter's strengths gives you an edge.
              </p>

              <div className="bg-[#0a0a12] border border-[#222] p-3 mb-4">
                <p className="text-[#555] font-mono text-[9px] uppercase tracking-[1px] mb-2">EXAMPLE STRATEGY</p>
                <p className="text-[#666] font-mono text-xs italic leading-relaxed">
                  "I'll open by activating {fighter.powers[0]?.split(":")[0] || "my primary power"} to catch my opponent off guard,
                  then use my speed advantage to stay mobile. If they go defensive I'll switch to
                  {fighter.skills[0]?.split(":")[0] || "my first skill"} to break through.
                  In the final phase I'll unleash {fighter.powers[2]?.split(":")[0] || fighter.powers[0]?.split(":")[0] || "my ultimate power"} for the finishing blow."
                </p>
              </div>

              <textarea
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                rows={6}
                className="w-full bg-[#0a0a12] border border-[#333] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#bb55ff] resize-none placeholder:text-[#333]"
                placeholder="Describe your battle strategy using your fighter's powers and skills..."
              />
              <p className="text-[#333] font-mono text-[9px] text-right mt-1">{strategy.length} chars</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("review_fighter")}
                className="flex-1 bg-[#1a1a2a] border border-[#333] text-[#888] font-pixel text-xs py-3 hover:bg-[#22223a] transition-colors"
              >
                ← BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={!strategy.trim() || submitting}
                className="flex-1 bg-[#00ff00] border-2 border-[#00cc00] text-black font-pixel text-xs py-3 hover:bg-[#00dd00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "SUBMITTING..." : "⚔ ENTER THE ARENA"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}