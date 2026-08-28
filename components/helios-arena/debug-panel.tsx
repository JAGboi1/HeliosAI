"use client"

import { useState } from "react"
import { useSocket } from "@/hooks/use-socket"

interface DebugPanelProps {
  wallet: string | null
}

export function DebugPanel({ wallet }: DebugPanelProps) {
  const [showDebug, setShowDebug] = useState(false)
  const { connected, searchResults, searchUsers } = useSocket(wallet)

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-[#1a1a2a] border border-[#333] text-[#666] font-mono text-[8px] px-2 py-1 hover:bg-[#22223a]"
        >
          DEBUG
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 bg-[#0e0e18] border border-[#1a1a28] p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[#bb55ff] font-mono text-xs">DEBUG PANEL</h4>
        <button
          onClick={() => setShowDebug(false)}
          className="text-[#666] font-mono text-[8px] hover:text-[#888]"
        >
          X
        </button>
      </div>

      <div className="space-y-2 text-[#888] font-mono text-[9px]">
        <div>
          <span className="text-[#666]">Wallet:</span> {wallet || "Not connected"}
        </div>
        <div>
          <span className="text-[#666]">Socket:</span> {connected ? "Connected" : "Disconnected"}
        </div>
        <div>
          <span className="text-[#666]">Connected Users:</span> {searchResults.length}
        </div>
        
        <button
          onClick={() => searchUsers("")}
          className="bg-[#1a1a2a] border border-[#333] text-[#888] font-mono text-[8px] px-2 py-1 hover:bg-[#22223a] mt-2"
        >
          REFRESH USERS
        </button>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[#666]">Online Users:</div>
            {searchResults.map((user) => (
              <div key={user.walletAddress} className="bg-[#0a0a0f] p-2 border border-[#2a2a3a]">
                <div>{user.walletAddress}</div>
                <div className="text-[#666] text-[8px]">
                  {user.username || "No username"} • {user.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
