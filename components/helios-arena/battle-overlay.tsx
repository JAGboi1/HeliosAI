"use client"

import { useEffect, useState, useCallback } from "react"
import { FighterCanvas } from "./fighter-canvas"

interface BattleResult {
  winner: "A" | "B"
  winnerName: string
  reason: string
  story: string[]
}

interface BattleOverlayProps {
  isOpen: boolean
  onClose: () => void
  fighterA: string
  fighterB: string
  onBattleComplete: (result: BattleResult) => void
}

const REASONS = [
  "exploited a critical weakness",
  "landed the decisive blow",
  "outmaneuvered the opponent",
  "overwhelmed with raw power",
  "struck with perfect precision",
]

const STORIES = [
  [
    "The arena fell silent as {A} and {B} locked eyes.",
    "Steel clashed against steel in a blinding flurry.",
    "{loser}'s defenses shattered under relentless pressure.",
    "{winner} seized the moment with ruthless precision.",
    "The crowd erupted — the victor stood alone.",
  ],
  [
    "{A} charged first — bold and reckless.",
    "{B} countered with cold, calculated fury.",
    "The battle turned on a single heartbeat.",
    "{winner} channeled every ounce of power within.",
    "{loser} fell — defeated, but not forgotten.",
  ],
]

function simulateBattle(fighterA: string, fighterB: string): BattleResult {
  const winner = Math.random() > 0.5 ? "A" : "B"
  const winnerName = winner === "A" ? fighterA : fighterB
  const loserName = winner === "A" ? fighterB : fighterA
  const reason = `${winnerName} ${REASONS[Math.floor(Math.random() * REASONS.length)]}`
  const storyTemplate = STORIES[Math.floor(Math.random() * STORIES.length)]
  const story = storyTemplate.map((line) =>
    line
      .replace("{A}", fighterA)
      .replace("{B}", fighterB)
      .replace("{winner}", winnerName)
      .replace("{loser}", loserName)
  )

  return { winner, winnerName, reason, story }
}

export function BattleOverlay({
  isOpen,
  onClose,
  fighterA,
  fighterB,
  onBattleComplete,
}: BattleOverlayProps) {
  const [phase, setPhase] = useState<"init" | "combat" | "calc" | "result">("init")
  const [hpA, setHpA] = useState(100)
  const [hpB, setHpB] = useState(100)
  const [result, setResult] = useState<BattleResult | null>(null)
  const [storyText, setStoryText] = useState("")
  const [shaking, setShaking] = useState(false)
  const [immortalized, setImmortalized] = useState(false)

  const runBattle = useCallback(() => {
    setPhase("init")
    setHpA(100)
    setHpB(100)
    setResult(null)
    setStoryText("")
    setImmortalized(false)

    const battleResult = simulateBattle(fighterA, fighterB)
    setResult(battleResult)

    // Phase transitions
    setTimeout(() => setPhase("combat"), 1300)
    setTimeout(() => setPhase("calc"), 2900)
    setTimeout(() => {
      setPhase("result")
      onBattleComplete(battleResult)
    }, 4700)

    // HP animation
    let step = 0
    const hpInterval = setInterval(() => {
      step++
      if (step > 14) {
        clearInterval(hpInterval)
        return
      }

      if (battleResult.winner === "A") {
        setHpB((prev) => Math.max(0, prev - Math.random() * 13))
        setHpA((prev) => Math.max(16, prev - Math.random() * 4))
      } else {
        setHpA((prev) => Math.max(0, prev - Math.random() * 13))
        setHpB((prev) => Math.max(16, prev - Math.random() * 4))
      }

      if (step % 3 === 0) {
        setShaking(true)
        setTimeout(() => setShaking(false), 400)
      }
    }, 220)
  }, [fighterA, fighterB, onBattleComplete])

  useEffect(() => {
    if (isOpen && fighterA && fighterB) {
      runBattle()
    }
  }, [isOpen, fighterA, fighterB, runBattle])

  // Typewriter effect for story
  useEffect(() => {
    if (phase === "result" && result) {
      let lineIndex = 0
      let charIndex = 0
      let text = ""

      const typeInterval = setInterval(() => {
        if (lineIndex >= result.story.length) {
          clearInterval(typeInterval)
          return
        }

        if (charIndex < result.story[lineIndex].length) {
          text += result.story[lineIndex][charIndex]
          setStoryText(text)
          charIndex++
        } else {
          text += "\n"
          setStoryText(text)
          lineIndex++
          charIndex = 0
        }
      }, 28)

      return () => clearInterval(typeInterval)
    }
  }, [phase, result])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const phaseText =
    phase === "init"
      ? "INITIATING BATTLE…"
      : phase === "combat"
        ? "SIMULATING COMBAT…"
        : phase === "calc"
          ? "CALCULATING OUTCOME…"
          : "⚡ BATTLE COMPLETE ⚡"

  return (
    <div
      className={`fixed inset-0 bg-[#0a0a0f] z-[300] flex flex-col items-center justify-center ${
        shaking ? "animate-shake" : ""
      }`}
    >
      {/* Phase Text */}
      <div
        className={`text-[14px] text-[#bb55ff] [text-shadow:0_0_20px_#9922cc] text-center mb-[22px] min-h-[22px] ${
          phase !== "result" ? "animate-glitch-fast" : ""
        }`}
      >
        {phaseText}
      </div>

      {/* HP Bars */}
      {phase !== "result" && (
        <div className="flex gap-[22px] items-center w-[560px] mb-[26px]">
          <div className="flex-1">
            <div className="text-[8px] text-[#444] mb-1 tracking-[1px]">
              {fighterA.toUpperCase()}
            </div>
            <div className="bg-[#181818] h-[13px] border border-[#2a2a2a] overflow-hidden">
              <div
                className="h-full bg-[#00aaaa] shadow-[0_0_6px_#00aaaa] transition-[width] duration-[220ms]"
                style={{ width: `${hpA}%` }}
              />
            </div>
          </div>
          <div className="text-[12px] text-[#888] font-mono">VS</div>
          <div className="flex-1">
            <div className="text-[8px] text-[#444] mb-1 tracking-[1px]">
              {fighterB.toUpperCase()}
            </div>
            <div className="bg-[#181818] h-[13px] border border-[#2a2a2a] overflow-hidden">
              <div
                className="h-full bg-[#bb1111] shadow-[0_0_6px_#bb1111] transition-[width] duration-[220ms]"
                style={{ width: `${hpB}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fighters */}
      {phase !== "result" && (
        <div className="flex gap-[90px] items-end mb-[26px]">
          <div className="text-center">
            <div className="font-mono text-[16px] mb-[6px] text-[#00aaaa]">
              {fighterA.toUpperCase()}
            </div>
            <FighterCanvas side="a" size={80} />
          </div>
          <div className="text-center">
            <div className="font-mono text-[16px] mb-[6px] text-[#cc2222]">
              {fighterB.toUpperCase()}
            </div>
            <FighterCanvas side="b" size={80} />
          </div>
        </div>
      )}

      {/* Result */}
      {phase === "result" && result && (
        <div className="text-center">
          <div
            className={`text-[18px] text-center border-[3px] py-[18px] px-[30px] mb-3 animate-glitch tracking-[2px] ${
              result.winner === "A"
                ? "text-[#00aaaa] border-[#00aaaa] shadow-[0_0_30px_#00aaaa]"
                : "text-[#cc2222] border-[#cc2222] shadow-[0_0_30px_#cc2222]"
            }`}
          >
            WINNER: {result.winnerName.toUpperCase()}
          </div>
          <div className="font-mono text-[14px] text-[#555] mb-[10px]">
            {result.reason}
          </div>
          <div className="font-mono text-[14px] text-[#999] max-w-[500px] text-center leading-[1.7] mb-5 min-h-[88px] whitespace-pre-line">
            {storyText}
          </div>

          {/* Buttons */}
          <div className="flex gap-[10px] flex-wrap justify-center">
            <button
              onClick={() => setImmortalized(true)}
              disabled={immortalized}
              className={`font-pixel text-[7px] sm:text-[9px] py-2 sm:py-[10px] px-2 sm:px-[14px] cursor-pointer border-2 tracking-[1px] transition-all active:scale-[0.97] flex items-center gap-1 sm:gap-[6px] ${
                immortalized
                  ? "bg-[#26004a] border-[#22cc22] text-[#22cc22]"
                  : "bg-[#26004a] border-arena-purple text-[#cc88ff] shadow-[0_0_10px_rgba(119,51,204,0.27)] hover:bg-[#360066] hover:shadow-[0_0_20px_rgba(119,51,204,0.53)]"
              }`}
            >
              {immortalized ? "✓ RECORDED" : "⛓ IMMORTALIZE"}
            </button>
            <button
              onClick={runBattle}
              className="font-pixel text-[7px] sm:text-[9px] py-2 sm:py-[10px] px-2 sm:px-[14px] cursor-pointer border-2 tracking-[1px] bg-[#001c1c] border-[#00aaaa] text-[#00aaaa] transition-all active:scale-[0.97] flex items-center gap-1 sm:gap-[6px]"
            >
              ↺ REMATCH
            </button>
            <button
              onClick={() => {
                const text = `${fighterA} vs ${fighterB} — Winner: ${result.winnerName} #HeliosArena`
                navigator.clipboard?.writeText(text).then(() => alert("Copied!"))
              }}
              className="font-pixel text-[7px] sm:text-[9px] py-2 sm:py-[10px] px-2 sm:px-[14px] cursor-pointer border-2 tracking-[1px] bg-transparent border-[#2e2e3e] text-[#666] hover:border-[#555] hover:text-[#aaa] transition-all active:scale-[0.97] flex items-center gap-1 sm:gap-[6px]"
            >
              📤 SHARE
            </button>
            <button
              onClick={onClose}
              className="font-pixel text-[7px] sm:text-[9px] py-2 sm:py-[10px] px-2 sm:px-[14px] cursor-pointer border-2 tracking-[1px] bg-[#1c0000] border-[#cc2222] text-[#cc2222] transition-all active:scale-[0.97] flex items-center gap-1 sm:gap-[6px]"
            >
              ✕ CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
