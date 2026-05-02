interface FooterProps {
  totalBattles: number
}

export function Footer({ totalBattles }: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#0e0e18] h-9 flex items-center px-7 justify-between z-50">
      <div className="text-[8px] text-[#3a3a4a] tracking-[1px] flex items-center gap-[6px]">
        <div className="w-[6px] h-[6px] bg-[#22cc22] rounded-full shadow-[0_0_5px_#22cc22] animate-blink" />
        &nbsp;NETWORK:<span className="text-[#555] ml-[3px]">TESTNET</span>
      </div>
      <div className="text-[8px] text-[#3a3a4a] tracking-[1px]">
        TOTAL BATTLES:<span className="text-[#555] ml-[3px]">{totalBattles}</span>
      </div>
      <div className="text-[8px] text-[#3a3a4a] tracking-[1px]">
        ACTIVE NOW:<span className="text-[#555] ml-[3px]">24</span>
      </div>
      <div className="text-[8px] text-[#3a3a4a] tracking-[1px]">
        VERSION:<span className="text-[#555] ml-[3px]">v0.1.0</span>
      </div>
    </footer>
  )
}
