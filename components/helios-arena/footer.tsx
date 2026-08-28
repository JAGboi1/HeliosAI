interface FooterProps {
  totalBattles: number
}

export function Footer({ totalBattles }: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#1a1a28] h-10 flex items-center px-4 sm:px-7 justify-between z-50">
      <div className="text-[10px] sm:text-[11px] text-[#555] tracking-[1px] flex items-center gap-2">
        <div className="w-2 h-2 bg-[#22cc22] rounded-full shadow-[0_0_5px_#22cc22] animate-blink flex-shrink-0" />
        NETWORK: <span className="text-[#888] ml-1">TESTNET</span>
      </div>
      <div className="text-[10px] sm:text-[11px] text-[#555] tracking-[1px] hidden sm:block">
        TOTAL BATTLES: <span className="text-[#888] ml-1">{totalBattles}</span>
      </div>
      <div className="text-[10px] sm:text-[11px] text-[#555] tracking-[1px]">
        ACTIVE NOW: <span className="text-[#888] ml-1">24</span>
      </div>
      <div className="text-[10px] sm:text-[11px] text-[#555] tracking-[1px] hidden sm:block">
        VERSION: <span className="text-[#888] ml-1">v0.1.0</span>
      </div>
    </footer>
  )
}
