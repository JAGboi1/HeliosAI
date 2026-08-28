export function HowItWorks() {
  const steps = [
    "1. Challenge another user to a battle",
    "2. Both players enter their fighters",
    "3. AI determines the winner",
    "4. Battle result is recorded on-chain",
  ]

  return (
    <div className="bg-[#0c0c13] border border-[#1a1a28] p-5">
      <div className="text-[9px] text-[#9944ee] tracking-[2px] mb-[14px] shadow-[0_0_8px_rgba(119,51,204,1)]">
        HOW IT WORKS
      </div>
      <ul className="flex flex-col gap-[11px]">
        {steps.map((step, i) => (
          <li
            key={i}
            className="font-mono text-[13px] text-[#999] flex items-center gap-[9px]"
          >
            <span>⚔</span> {step}
          </li>
        ))}
      </ul>
    </div>
  )
}
