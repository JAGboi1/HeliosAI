const onlinePlayers = [
  { name: "0x7A3...8F2B", status: "In Battle" },
  { name: "LegendSlayer", status: "Available" },
  { name: "CryptoNinja", status: "Available" },
]

export function OnlinePanel() {
  return (
    <div className="fixed bottom-10 right-[22px] bg-[#09090f] border border-[#18182a] w-[230px] p-3 z-50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-[10px]">
        <div className="w-2 h-2 bg-[#22cc22] rounded-full shadow-[0_0_6px_#22cc22] animate-blink" />
        <span className="text-[8px] text-[#444] tracking-[2px] flex-1">
          ONLINE PLAYERS
        </span>
        <span className="font-mono text-[19px] text-[#22cc22]">24</span>
      </div>

      {/* Player List */}
      {onlinePlayers.map((player, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-[5px] border-t border-[#121220]"
        >
          <span className="text-[11px] text-[#444]">⚔</span>
          <span className="font-mono text-[13px] text-[#bbb] flex-1">
            {player.name}
          </span>
          <span
            className={`font-mono text-[12px] ${
              player.status === "In Battle"
                ? "text-[#cc3333]"
                : "text-[#22cc22]"
            }`}
          >
            {player.status}
          </span>
        </div>
      ))}

      <div className="font-mono text-[12px] text-[#333] text-center pt-[5px] border-t border-[#121220]">
        .. ...
      </div>
    </div>
  )
}
