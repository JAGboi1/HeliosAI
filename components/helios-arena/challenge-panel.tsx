"use client"

interface ChallengePanelProps {
  opponentInput: string
  setOpponentInput: (value: string) => void
  onSearch: () => void
  onBrowseOnline: () => void
}

export function ChallengePanel({
  opponentInput,
  setOpponentInput,
  onSearch,
  onBrowseOnline,
}: ChallengePanelProps) {
  return (
    <div className="bg-[#0c0c13] border border-[#1a1a28] p-5">
      <div className="text-[9px] text-[#777] tracking-[2px] mb-4 uppercase">
        ADD FRIEND
      </div>

      {/* Input Row */}
      <div className="flex gap-2 mb-[14px]">
        <input
          type="text"
          value={opponentInput}
          onChange={(e) => setOpponentInput(e.target.value)}
          placeholder="Search for a friend by wallet, username, Twitter, or Discord"
          className="flex-1 bg-black border border-[#242430] text-[#bbb] font-mono text-[13px] py-[9px] px-3 outline-none tracking-[0.3px] placeholder:text-[#2e2e38] focus:border-arena-purple focus:shadow-[0_0_8px_rgba(119,51,204,0.2)] transition-all"
        />
        <button className="w-[38px] h-[38px] flex-shrink-0 bg-[#0e0e18] border border-[#242430] text-[#555] cursor-pointer flex items-center justify-center text-[15px] hover:border-arena-purple hover:text-[#9944ee] transition-all">
          👥
        </button>
      </div>

      {/* Button Row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSearch}
          className="font-pixel text-[9px] py-[10px] px-[14px] cursor-pointer border-2 tracking-[1px] bg-[#26004a] border-arena-purple text-[#cc88ff] shadow-[0_0_10px_rgba(119,51,204,0.27)] hover:bg-[#360066] hover:shadow-[0_0_20px_rgba(119,51,204,0.53)] transition-all active:scale-[0.97] flex items-center gap-[6px]"
        >
          🔍&nbsp;SEARCH FRIEND
        </button>
        <span className="font-mono text-[14px] text-[#333]">OR</span>
        <button
          onClick={onBrowseOnline}
          className="font-pixel text-[9px] py-[10px] px-[14px] cursor-pointer border-2 tracking-[1px] bg-transparent border-[#2e2e3e] text-[#666] hover:border-[#555] hover:text-[#aaa] transition-all active:scale-[0.97] flex items-center gap-[6px]"
        >
          👥&nbsp;BROWSE ONLINE
        </button>
      </div>
    </div>
  )
}