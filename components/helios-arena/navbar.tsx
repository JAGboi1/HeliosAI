"use client"

import { useState } from "react"

interface NavbarProps {
  wallet: string | null
  onConnectWallet: () => void
  onOpenProfile: () => void
}

export function Navbar({ wallet, onConnectWallet, onOpenProfile }: NavbarProps) {
  const [activeNav, setActiveNav] = useState("ARENA")

  const navItems = ["ARENA", "BATTLES", "LEADERBOARD", "PROFILE"]

  return (
    <nav className="bg-black border-b border-[#16162a] h-16 flex items-center px-7 justify-between sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-[42px] h-[42px] bg-[#180040] border-2 border-[#6633aa] flex items-center justify-center text-[19px] shadow-[0_0_10px_rgba(102,51,170,0.47)]">
          ⚔
        </div>
        <div>
          <span className="text-[11px] text-white tracking-[3px] block">
            HELIOS&nbsp; ARENA
          </span>
          <span className="text-[9px] text-[#8844cc] tracking-[2px] block mt-[3px]">
            AI BATTLE ENGINE
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex gap-10 items-center">
        {navItems.map((item) => (
          <span
            key={item}
            onClick={() => setActiveNav(item)}
            className={`text-[10px] tracking-[1px] cursor-pointer pb-[6px] border-b-2 transition-colors ${
              activeNav === item
                ? "text-white border-arena-purple"
                : "text-[#777] border-transparent hover:text-[#bbb]"
            }`}
          >
            {item}
          </span>
        ))}
      </div>

      {/* Right Side */}
      <div className="flex gap-[10px] items-center">
        <button
          onClick={onConnectWallet}
          className="bg-arena-purple border-2 border-[#9944ff] text-white font-pixel text-[9px] px-[18px] py-[11px] cursor-pointer tracking-[1px] shadow-[0_0_14px_rgba(119,51,204,0.4)] hover:bg-[#8844dd] hover:shadow-[0_0_24px_rgba(119,51,204,0.67)] transition-all"
          style={{ fontSize: wallet ? "8px" : "9px" }}
        >
          {wallet || "CONNECT WALLET"}
        </button>
        <button
          onClick={onOpenProfile}
          className="w-10 h-10 bg-[#0e0e16] border-2 border-[#2a2a3a] text-[#bbb] flex items-center justify-center cursor-pointer text-[17px] hover:border-arena-purple transition-colors"
        >
          👤
        </button>
      </div>
    </nav>
  )
}
