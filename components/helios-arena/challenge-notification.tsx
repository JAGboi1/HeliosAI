"use client"

import { usePollingSocket } from "@/hooks/use-polling-socket"

interface ChallengeNotificationProps {
  wallet: string | null
}

export function ChallengeNotification({ wallet }: ChallengeNotificationProps) {
  const { incomingChallenges, acceptChallenge, declineChallenge } = usePollingSocket(wallet)

  console.log("ChallengeNotification - wallet:", wallet, "incomingChallenges:", incomingChallenges)
  console.log("ChallengeNotification - incomingChallenges length:", incomingChallenges.length)

  // Override acceptChallenge to trigger battle
  const handleAcceptChallenge = async (challengeId: string) => {
    console.log("ChallengeNotification - accepting challenge:", challengeId)
    const success = await acceptChallenge(challengeId)
    if (success) {
      console.log("ChallengeNotification - challenge accepted, triggering VS screen")
      // Trigger a custom event to notify VS screen
      window.dispatchEvent(new CustomEvent('challengeAccepted', { detail: { challengeId } }))
    }
  }

  if (!incomingChallenges.length || !wallet) {
    console.log("ChallengeNotification - not rendering, conditions:", { wallet: !!wallet, challengesLength: incomingChallenges.length })
    return null
  }

  // Show only the first challenge
  const challenge = incomingChallenges[0]

  return (
    <div className="fixed top-4 right-4 bg-[#0e0e18] border border-[#bb55ff] p-4 max-w-sm z-50 shadow-[0_0_20px_rgba(119,51,204,0.3)]">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#1a1a2a] rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#bb55ff]">
          <div className="text-center">
            <div className="text-white text-xs font-bold truncate max-w-[40px]">
              {challenge.challenger.slice(0, 6)}
            </div>
            <div className="text-[#bb55ff] text-xs">
              VS
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="text-[#bb55ff] font-pixel text-xs mb-2">BATTLE CHALLENGE!</h4>
          
          <p className="text-[#ddd] font-mono text-xs mb-2">
            {challenge.challenger} has challenged you to a {challenge.battleType} battle!
          </p>
          
          {challenge.message && (
            <p className="text-[#888] font-mono text-xs italic mb-3">
              "{challenge.message}"
            </p>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => handleAcceptChallenge(challenge.id)}
              className="flex-1 bg-arena-purple border border-[#9944ff] text-white font-pixel text-[9px] py-2 hover:bg-[#8844dd] transition-colors"
            >
              ACCEPT
            </button>
            <button
              onClick={() => declineChallenge(challenge.id)}
              className="flex-1 bg-[#1a1a2a] border border-[#333] text-[#888] font-pixel text-[9px] py-2 hover:bg-[#22223a] transition-colors"
            >
              DECLINE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
