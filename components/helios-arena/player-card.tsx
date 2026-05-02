"use client"

import { FighterCanvas } from "./fighter-canvas"

interface PlayerStats {
  wins: number
  battles: number
  rank: string
}

interface PlayerCardProps {
  type: "you" | "opponent"
  name: string
  status: string
  stats: PlayerStats
}

export function PlayerCard({ type, name, status, stats }: PlayerCardProps) {
  const isOpponent = type === "opponent"

  return (
    <div
      className={`border-2 p-[18px] relative ${
        isOpponent
          ? "border-[#aa1111] bg-[#0e0404]"
          : "border-[#008888] bg-[#04040e]"
      }`}
    >
      {/* Badge */}
      <span
        className={`absolute -top-[11px] left-[14px] text-[9px] bg-[#0a0a0f] border-2 px-[9px] py-[2px] tracking-[2px] ${
          isOpponent
            ? "border-[#aa1111] text-[#cc3333]"
            : "border-[#008888] text-[#00aaaa]"
        }`}
      >
        {isOpponent ? "OPPONENT" : "YOU"}
      </span>

      <div className="flex gap-[14px] items-start">
        {/* Fighter Sprite */}
        <div
          className={`w-[98px] h-[98px] flex-shrink-0 border pixel-render overflow-hidden ${
            isOpponent
              ? "bg-[#0f0505] border-[#2a0a0a]"
              : "bg-[#050510] border-[#14143a]"
          }`}
        >
          <FighterCanvas side={isOpponent ? "b" : "a"} size={98} />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="text-[10px] text-white tracking-[1px] mb-[5px]">
            {name}
          </div>
          <div
            className={`font-mono text-[13px] mb-[14px] tracking-[0.3px] ${
              isOpponent ? "text-[#cc4444]" : "text-[#00aaaa]"
            }`}
          >
            {status}
          </div>

          {/* Stats */}
          <div className="flex gap-[26px]">
            <div>
              <span className="text-[8px] text-[#444] block tracking-[1px] mb-[3px]">
                WINS
              </span>
              <span className="text-[18px] text-white block font-mono">
                {stats.wins}
              </span>
            </div>
            <div>
              <span className="text-[8px] text-[#444] block tracking-[1px] mb-[3px]">
                BATTLES
              </span>
              <span className="text-[18px] text-white block font-mono">
                {stats.battles}
              </span>
            </div>
            <div>
              <span className="text-[8px] text-[#444] block tracking-[1px] mb-[3px]">
                RANK
              </span>
              <span className="text-[18px] text-white block font-mono">
                {stats.rank}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
