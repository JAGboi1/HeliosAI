export function HowItWorks() {
  const steps = [
    { icon: "🖼", text: "Import any NFT from your wallet" },
    { icon: "⚔", text: "AI forges your NFT into a battle fighter" },
    { icon: "🧠", text: "Write your battle strategy using your fighter's powers" },
    { icon: "🤖", text: "AI narrates the battle and picks a winner" },
    { icon: "🏅", text: "Winner immortalizes victory as an NFT on Ritual Chain" },
  ]

  return (
    <div className="bg-[#0c0c13] border border-[#1a1a28] p-5">
      <div className="text-[9px] text-[#9944ee] tracking-[2px] mb-[14px] [text-shadow:0_0_8px_rgba(119,51,204,1)]">
        HOW IT WORKS
      </div>
      <ul className="flex flex-col gap-[10px]">
        {steps.map((step, i) => (
          <li
            key={i}
            className="font-mono text-[13px] text-[#999] flex items-center gap-[9px]"
          >
            <span className="flex-shrink-0">{step.icon}</span>
            <span>{step.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}