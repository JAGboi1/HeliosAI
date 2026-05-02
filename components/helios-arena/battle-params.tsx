"use client"

interface BattleParamsProps {
  battleType: string
  setBattleType: (value: string) => void
  brutality: number
  setBrutality: (value: number) => void
}

function getBrutalityLabel(value: number): { label: string; color: string } {
  if (value < 25) return { label: "LOW", color: "#22cc22" }
  if (value < 50) return { label: "MEDIUM", color: "#dddd00" }
  if (value < 75) return { label: "HIGH", color: "#ff8800" }
  return { label: "INSANE", color: "#ff2222" }
}

export function BattleParams({
  battleType,
  setBattleType,
  brutality,
  setBrutality,
}: BattleParamsProps) {
  const brutalityInfo = getBrutalityLabel(brutality)

  return (
    <div className="bg-[#0c0c13] border border-[#1a1a28] py-[22px] px-6 mb-5">
      <div className="text-center text-[11px] text-[#9944ee] tracking-[4px] mb-[22px] [text-shadow:0_0_12px_#7733cc]">
        BATTLE PARAMETERS
      </div>

      <div className="grid grid-cols-2 gap-10 items-start">
        {/* Battle Type */}
        <div>
          <span className="text-[8px] text-[#444] tracking-[2px] block mb-[9px] uppercase">
            BATTLE TYPE
          </span>
          <div className="relative">
            <select
              value={battleType}
              onChange={(e) => setBattleType(e.target.value)}
              className="w-full bg-black border-2 border-arena-purple text-[#ddd] font-pixel text-[10px] py-[11px] pl-3 pr-9 cursor-pointer outline-none appearance-none tracking-[0.5px] shadow-[0_0_8px_rgba(119,51,204,0.13)]"
            >
              <option value="duel">⚔ Duel – 1v1 Combat</option>
              <option value="war">🏰 War – 5v5 Battle</option>
            </select>
            <span className="absolute right-[11px] top-1/2 -translate-y-1/2 text-arena-purple text-[9px] pointer-events-none">
              ▼
            </span>
          </div>
        </div>

        {/* Brutality */}
        <div>
          <div className="flex items-center gap-2 mb-[9px]">
            <span className="text-[8px] text-[#444] tracking-[2px] uppercase">
              BRUTALITY LEVEL:
            </span>
            <span
              className="text-[9px] tracking-[1px] ml-1"
              style={{ color: brutalityInfo.color }}
            >
              {brutalityInfo.label}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={brutality}
            onChange={(e) => setBrutality(Number(e.target.value))}
            className="w-full h-3 cursor-pointer rounded-[1px] border border-[#2a2a2a] outline-none"
            style={{
              background:
                "linear-gradient(to right, #22cc22 0%, #dddd00 45%, #ff8800 70%, #ff2222 100%)",
            }}
          />
          <div className="flex justify-between mt-[5px]">
            <span className="font-mono text-[13px] text-[#22cc22] [text-shadow:0_0_5px_#22cc22]">
              LOW
            </span>
            <span className="font-mono text-[13px] text-[#ff2222] [text-shadow:0_0_5px_#ff2222]">
              INSANE
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
