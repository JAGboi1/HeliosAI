"use client"

import { useState } from "react"
import { useWallet } from "@/components/wallet-connector"

interface NavbarProps {
  wallet: string | null
  onConnectWallet: () => void
  onOpenProfile: () => void
  onOpenBattles: () => void
  onOpenLeaderboard: () => void
  onOpenFriends: () => void
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function Navbar({
  wallet,
  onConnectWallet,
  onOpenProfile,
  onOpenBattles,
  onOpenLeaderboard,
  onOpenFriends,
}: NavbarProps) {
  const [activeNav, setActiveNav] = useState("ARENA")
  const [menuOpen,  setMenuOpen]  = useState(false)
  const { isOnRitualChain, ritualBalance, switchToRitual, isConnecting } = useWallet()

  const navItems = [
    { label: "BATTLES",     action: onOpenBattles     },
    { label: "LEADERBOARD", action: onOpenLeaderboard },
    { label: "FRIENDS",     action: onOpenFriends     },
  ]

  const handleNav = (label: string, action: () => void) => {
    setActiveNav(label)
    setMenuOpen(false)
    action()
  }

  return (
    <>
      <nav className="bg-black border-b border-[#16162a] h-14 sm:h-16 flex items-center px-4 sm:px-7 justify-between sticky top-0 z-50">

        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-9 h-9 sm:w-[42px] sm:h-[42px] bg-[#180040] border-2 border-[#6633aa] flex items-center justify-center text-base sm:text-[19px] shadow-[0_0_10px_rgba(102,51,170,0.47)]">
            ⚔
          </div>
          <div>
            <span className="text-[9px] sm:text-[11px] text-white tracking-[2px] sm:tracking-[3px] block">
              HELIOS ARENA
            </span>
            <span className="text-[7px] sm:text-[9px] text-[#8844cc] tracking-[1px] sm:tracking-[2px] block mt-[2px]">
              AI BATTLE ENGINE
            </span>
          </div>
        </div>

        {/* Desktop nav items */}
        <div className="hidden md:flex gap-8 lg:gap-10 items-center">
          {navItems.map(({ label, action }) => (
            <span
              key={label}
              onClick={() => handleNav(label, action)}
              className={`text-[10px] tracking-[1px] cursor-pointer pb-[6px] border-b-2 transition-colors ${
                activeNav === label
                  ? "text-white border-arena-purple"
                  : "text-[#777] border-transparent hover:text-[#bbb]"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Right side */}
        <div className="flex gap-2 sm:gap-[10px] items-center">

          {/* Wrong network — abbreviated on mobile */}
          {wallet && !isOnRitualChain && (
            <button
              onClick={switchToRitual}
              className="bg-[#330000] border border-[#ff4444] text-[#ff4444] font-pixel text-[7px] sm:text-[8px] px-2 sm:px-3 py-1.5 sm:py-2 animate-pulse hover:bg-[#440000] transition-colors"
            >
              ⚠ <span className="hidden sm:inline">SWITCH TO </span>RITUAL
            </button>
          )}

          {/* Balance — desktop only */}
          {wallet && isOnRitualChain && ritualBalance && (
            <div className="hidden sm:block bg-[#0a0a18] border border-[#2a2a3a] px-3 py-2 text-center">
              <span className="text-[#ff8800] font-pixel text-[8px] block">
                {ritualBalance} RITUAL
              </span>
            </div>
          )}

          {/* Connect / address */}
          <button
            onClick={onConnectWallet}
            disabled={isConnecting}
            suppressHydrationWarning
            className={`bg-arena-purple border-2 border-[#9944ff] text-white font-pixel px-3 sm:px-[18px] py-2 sm:py-[11px] cursor-pointer tracking-[1px] shadow-[0_0_14px_rgba(119,51,204,0.4)] hover:bg-[#8844dd] transition-all disabled:opacity-60 ${wallet ? "text-[7px] sm:text-[8px]" : "text-[8px] sm:text-[9px]"}`}
          >
            {isConnecting ? "..." : wallet ? shortenAddress(wallet) : "CONNECT WALLET"}
          </button>

          {/* Profile icon — desktop only */}
          <button
            onClick={onOpenProfile}
            className="hidden sm:flex w-10 h-10 bg-[#0e0e16] border-2 border-[#2a2a3a] text-[#bbb] items-center justify-center cursor-pointer text-[17px] hover:border-arena-purple transition-colors"
          >
            👤
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden w-9 h-9 bg-[#0e0e16] border-2 border-[#2a2a3a] text-[#bbb] flex items-center justify-center cursor-pointer text-sm hover:border-arena-purple transition-colors"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-black border-b-2 border-arena-purple z-40 shadow-[0_4px_20px_rgba(119,51,204,0.3)]">
          {navItems.map(({ label, action }) => (
            <button
              key={label}
              onClick={() => handleNav(label, action)}
              className={`w-full text-left px-6 py-4 text-[11px] tracking-[2px] font-pixel border-b border-[#111] transition-colors ${
                activeNav === label
                  ? "text-white bg-[#0d0020]"
                  : "text-[#666] hover:text-[#bbb] hover:bg-[#0a0a12]"
              }`}
            >
              {label}
            </button>
          ))}
          {wallet && isOnRitualChain && ritualBalance && (
            <div className="px-6 py-3 border-b border-[#111]">
              <span className="text-[#ff8800] font-pixel text-[9px]">{ritualBalance} RITUAL</span>
            </div>
          )}
          <button
            onClick={() => { setMenuOpen(false); onOpenProfile() }}
            className="w-full text-left px-6 py-4 text-[11px] tracking-[2px] font-pixel text-[#666] hover:text-[#bbb] hover:bg-[#0a0a12] transition-colors"
          >
            👤 PROFILE
          </button>
        </div>
      )}
    </>
  )
}