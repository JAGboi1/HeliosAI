"use client"

import { useEffect, useRef } from "react"

interface FighterCanvasProps {
  side: "a" | "b"
  size?: number
  className?: string
}

export function FighterCanvas({ side, size = 32, className = "" }: FighterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = 32
    const H = 32

    ctx.clearRect(0, 0, W, H)

    if (side === "a") {
      // Cyan/blue fighter
      ctx.fillStyle = "#050510"
      ctx.fillRect(0, 0, W, H)
      // hood layers
      ctx.fillStyle = "#181848"
      ctx.fillRect(11, 3, 10, 2)
      ctx.fillStyle = "#1a1a50"
      ctx.fillRect(9, 5, 14, 3)
      ctx.fillStyle = "#20205a"
      ctx.fillRect(8, 8, 16, 7)
      // face shadow
      ctx.fillStyle = "#0c0c22"
      ctx.fillRect(10, 9, 12, 5)
      // eyes
      ctx.fillStyle = "#00eeff"
      ctx.fillRect(11, 11, 3, 2)
      ctx.fillRect(18, 11, 3, 2)
      ctx.fillStyle = "rgba(0,180,255,.18)"
      ctx.fillRect(10, 10, 5, 4)
      ctx.fillRect(17, 10, 5, 4)
      // body
      ctx.fillStyle = "#0e0e30"
      ctx.fillRect(9, 15, 14, 9)
      ctx.fillStyle = "#0c0c2a"
      ctx.fillRect(6, 15, 4, 7)
      ctx.fillRect(22, 15, 4, 7)
      // robe highlight
      ctx.fillStyle = "rgba(0,180,255,.32)"
      ctx.fillRect(9, 15, 2, 9)
      // belt
      ctx.fillStyle = "#08082a"
      ctx.fillRect(9, 24, 14, 2)
      // legs
      ctx.fillStyle = "#0a0a20"
      ctx.fillRect(10, 26, 5, 5)
      ctx.fillRect(17, 26, 5, 5)
    } else {
      // Red fighter
      ctx.fillStyle = "#0f0505"
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = "#3a1010"
      ctx.fillRect(11, 3, 10, 2)
      ctx.fillStyle = "#3a1212"
      ctx.fillRect(9, 5, 14, 3)
      ctx.fillStyle = "#440808"
      ctx.fillRect(8, 8, 16, 7)
      ctx.fillStyle = "#180404"
      ctx.fillRect(10, 9, 12, 5)
      ctx.fillStyle = "#ff1a00"
      ctx.fillRect(11, 11, 3, 2)
      ctx.fillRect(18, 11, 3, 2)
      ctx.fillStyle = "rgba(255,40,0,.18)"
      ctx.fillRect(10, 10, 5, 4)
      ctx.fillRect(17, 10, 5, 4)
      ctx.fillStyle = "#200606"
      ctx.fillRect(9, 15, 14, 9)
      ctx.fillStyle = "#1c0505"
      ctx.fillRect(6, 15, 4, 7)
      ctx.fillRect(22, 15, 4, 7)
      ctx.fillStyle = "rgba(255,20,0,.32)"
      ctx.fillRect(9, 15, 2, 9)
      ctx.fillStyle = "#140303"
      ctx.fillRect(9, 24, 14, 2)
      ctx.fillStyle = "#180404"
      ctx.fillRect(10, 26, 5, 5)
      ctx.fillRect(17, 26, 5, 5)
    }
  }, [side])

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      style={{ width: size, height: size }}
      className={`block pixel-render ${className}`}
    />
  )
}
