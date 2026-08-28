"use client"

import { useEffect, useState } from "react"

type Rarity = "COMMON" | "RARE" | "ULTRA_RARE" | "LEGENDARY"

interface BattleCardModalProps {
  isOpen: boolean
  onClose: () => void
  winnerName: string
  winnerClass: string
  loserName: string
  loserClass: string
  battleStory: string
  rarity: Rarity
  winStreak: number
  tokenId: string
  bonusTokenId?: string
  imageUri?: string
  txHash?: string
}

const RARITY_CONFIG: Record<Rarity, {
  label: string
  border: string
  glow: string
  badge: string
  badgeText: string
  streakColor: string
  shimmer: string
  particles: string
}> = {
  COMMON: {
    label: "COMMON",
    border: "#888888",
    glow: "rgba(136,136,136,0.4)",
    badge: "linear-gradient(135deg, #555 0%, #888 50%, #555 100%)",
    badgeText: "#ddd",
    streakColor: "#aaa",
    shimmer: "rgba(200,200,200,0.1)",
    particles: "#888",
  },
  RARE: {
    label: "RARE",
    border: "#FFD700",
    glow: "rgba(255,215,0,0.5)",
    badge: "linear-gradient(135deg, #b8860b 0%, #FFD700 50%, #b8860b 100%)",
    badgeText: "#1a1000",
    streakColor: "#FFD700",
    shimmer: "rgba(255,215,0,0.12)",
    particles: "#FFD700",
  },
  ULTRA_RARE: {
    label: "ULTRA RARE",
    border: "#00BFFF",
    glow: "rgba(0,191,255,0.5)",
    badge: "linear-gradient(135deg, #005f8a 0%, #00BFFF 50%, #005f8a 100%)",
    badgeText: "#001a2e",
    streakColor: "#00BFFF",
    shimmer: "rgba(0,191,255,0.12)",
    particles: "#00BFFF",
  },
  LEGENDARY: {
    label: "LEGENDARY",
    border: "#9945FF",
    glow: "rgba(153,69,255,0.6)",
    badge: "linear-gradient(135deg, #4a00a0 0%, #9945FF 40%, #FFD700 60%, #9945FF 100%)",
    badgeText: "#fff",
    streakColor: "#FFD700",
    shimmer: "rgba(153,69,255,0.15)",
    particles: "#9945FF",
  },
}

const RARITY_ICONS: Record<Rarity, string> = {
  COMMON: "⚔️",
  RARE: "🌟",
  ULTRA_RARE: "💎",
  LEGENDARY: "👑",
}

export function BattleCardModal({
  isOpen,
  onClose,
  winnerName,
  winnerClass,
  loserName,
  loserClass,
  battleStory,
  rarity,
  winStreak,
  tokenId,
  bonusTokenId,
  imageUri,
  txHash,
}: BattleCardModalProps) {
  const [visible, setVisible] = useState(false)
  const [cardRevealed, setCardRevealed] = useState(false)

  const cfg = RARITY_CONFIG[rarity]

  useEffect(() => {
    if (isOpen) {
      // slight delay so CSS transition fires
      requestAnimationFrame(() => {
        setTimeout(() => setVisible(true), 50)
        setTimeout(() => setCardRevealed(true), 300)
      })
    } else {
      setVisible(false)
      setCardRevealed(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isLegendary = rarity === "LEGENDARY"

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: visible
          ? "rgba(0,0,0,0.92)"
          : "rgba(0,0,0,0)",
        backdropFilter: "blur(8px)",
        transition: "background 0.4s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Particle dots for LEGENDARY */}
      {isLegendary && visible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 4 + 2 + "px",
                height: Math.random() * 4 + 2 + "px",
                background: i % 2 === 0 ? "#9945FF" : "#FFD700",
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
                animation: `float-particle ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: Math.random() * 2 + "s",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Card container */}
      <div
        style={{
          opacity: cardRevealed ? 1 : 0,
          transform: cardRevealed ? "scale(1) translateY(0)" : "scale(0.85) translateY(40px)",
          transition: "opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Glow ring behind card */}
        <div
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{
            boxShadow: cardRevealed
              ? `0 0 60px 20px ${cfg.glow}, 0 0 120px 40px ${cfg.glow}`
              : "none",
            transition: "box-shadow 0.8s ease 0.3s",
          }}
        />

        {/* THE CARD */}
        <div
          className="relative overflow-hidden"
          style={{
            border: `2px solid ${cfg.border}`,
            background: "#06060f",
            fontFamily: "'VT323', 'Courier New', monospace",
          }}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, transparent 40%, ${cfg.shimmer} 50%, transparent 60%)`,
              backgroundSize: "200% 200%",
              animation: cardRevealed ? "shimmer-sweep 3s ease-in-out infinite" : "none",
            }}
          />

          {/* Top bar — rarity badge */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: `1px solid ${cfg.border}33` }}
          >
            <span
              className="text-[10px] tracking-[3px] font-mono"
              style={{ color: cfg.border }}
            >
              HELIOS ARENA
            </span>
            <div
              className="px-3 py-1 text-[11px] tracking-[2px] font-bold"
              style={{
                background: cfg.badge,
                color: cfg.badgeText,
                fontFamily: "'VT323', monospace",
                fontSize: "13px",
                letterSpacing: "2px",
              }}
            >
              {RARITY_ICONS[rarity]} {cfg.label}
            </div>
          </div>

          {/* Image area */}
          <div
            className="relative w-full flex items-center justify-center overflow-hidden"
            style={{
              height: "220px",
              background: imageUri
                ? "transparent"
                : `radial-gradient(ellipse at center, ${cfg.glow} 0%, #06060f 70%)`,
              borderBottom: `1px solid ${cfg.border}33`,
            }}
          >
            {imageUri ? (
              <img
                src={imageUri}
                alt="Battle card"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center space-y-3">
                <div
                  className="text-6xl"
                  style={{ filter: `drop-shadow(0 0 20px ${cfg.border})` }}
                >
                  {RARITY_ICONS[rarity]}
                </div>
                <p
                  className="text-[10px] tracking-[2px]"
                  style={{ color: cfg.border, fontFamily: "monospace" }}
                >
                  BATTLE CARD
                </p>
                <p className="text-[9px] text-[#444] font-mono">
                  Image generating on Ritual Chain...
                </p>
              </div>
            )}

            {/* Win streak badge — top left corner */}
            <div
              className="absolute top-2 left-2 px-2 py-1 text-[11px]"
              style={{
                background: "rgba(0,0,0,0.8)",
                border: `1px solid ${cfg.streakColor}`,
                color: cfg.streakColor,
                fontFamily: "'VT323', monospace",
                fontSize: "14px",
              }}
            >
              🔥 {winStreak} WIN STREAK
            </div>

            {/* Token ID — top right */}
            <div
              className="absolute top-2 right-2 px-2 py-1 text-[10px]"
              style={{
                background: "rgba(0,0,0,0.8)",
                border: `1px solid ${cfg.border}55`,
                color: cfg.border,
                fontFamily: "monospace",
              }}
            >
              #{tokenId}
            </div>
          </div>

          {/* Winner / Loser names */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: `1px solid ${cfg.border}22` }}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p
                  className="text-lg tracking-[1px]"
                  style={{
                    color: cfg.border,
                    fontFamily: "'VT323', monospace",
                    fontSize: "22px",
                    textShadow: `0 0 10px ${cfg.glow}`,
                  }}
                >
                  🏆 {winnerName}
                </p>
                <p className="text-[#555] font-mono text-[9px] tracking-[2px] uppercase">
                  {winnerClass} · VICTOR
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-[#444] tracking-[1px]"
                  style={{ fontFamily: "'VT323', monospace", fontSize: "18px" }}
                >
                  💀 {loserName}
                </p>
                <p className="text-[#333] font-mono text-[9px] tracking-[2px] uppercase">
                  {loserClass} · DEFEATED
                </p>
              </div>
            </div>
          </div>

          {/* Battle story excerpt */}
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${cfg.border}22` }}>
            <p
              className="text-[#666] font-mono text-[10px] leading-relaxed line-clamp-3"
              style={{ fontStyle: "italic" }}
            >
              "{battleStory.slice(0, 180)}{battleStory.length > 180 ? "..." : ""}"
            </p>
          </div>

          {/* Bonus token notice for LEGENDARY */}
          {bonusTokenId && (
            <div
              className="px-4 py-2 text-center"
              style={{
                background: "rgba(153,69,255,0.1)",
                borderBottom: `1px solid ${cfg.border}33`,
              }}
            >
              <p
                className="text-[11px] tracking-[1px]"
                style={{ color: "#FFD700", fontFamily: "'VT323', monospace", fontSize: "14px" }}
              >
                🎁 BONUS TOKEN #{bonusTokenId} MINTED TO YOUR WALLET
              </p>
            </div>
          )}

          {/* Footer — tx link + close */}
          <div className="px-4 py-3 flex items-center justify-between">
            {txHash ? (
              <a
                href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono tracking-[1px] underline hover:opacity-80 transition-opacity"
                style={{ color: cfg.border }}
              >
                VIEW ON RITUAL EXPLORER →
              </a>
            ) : (
              <span />
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] tracking-[2px] transition-all hover:opacity-80"
              style={{
                border: `1px solid ${cfg.border}`,
                color: cfg.border,
                background: "transparent",
                fontFamily: "'VT323', monospace",
                fontSize: "14px",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes shimmer-sweep {
          0%   { background-position: 200% 200%; }
          50%  { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
          33%       { transform: translateY(-20px) translateX(10px); opacity: 1; }
          66%       { transform: translateY(10px) translateX(-10px); opacity: 0.4; }
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}