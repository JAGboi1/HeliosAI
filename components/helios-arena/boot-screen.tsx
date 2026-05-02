"use client"

import { useEffect, useState } from "react"

export function BootScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), 600)
    }, 3500)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 bg-black z-[2000] flex flex-col items-center justify-center gap-5 ${
        fadeOut ? "animate-fade-out" : ""
      }`}
    >
      <div className="text-[24px] text-[#9933ee] tracking-[3px] [text-shadow:0_0_22px_#7711bb,0_0_55px_#550088] mb-[18px] animate-glitch">
        ⚔ HELIOS ARENA ⚔
      </div>
      <BootLine delay={0.05}>INITIALIZING ARENA…</BootLine>
      <BootLine delay={0.85}>LOADING COMBAT AI…</BootLine>
      <BootLine delay={1.75}>SYNCING BATTLE PROTOCOLS…</BootLine>
    </div>
  )
}

function BootLine({ children, delay }: { children: string; delay: number }) {
  return (
    <div
      className="font-mono text-[16px] text-[#00bbbb] whitespace-nowrap overflow-hidden w-0 border-r-2 border-[#00bbbb] [text-shadow:0_0_10px_#00bbbb]"
      style={{
        animation: `typewriter 0.7s steps(26) ${delay}s forwards`,
      }}
    >
      {children}
    </div>
  )
}
