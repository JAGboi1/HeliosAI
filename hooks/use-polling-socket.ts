import { useState, useEffect, useCallback, useRef } from "react"

interface User {
  walletAddress: string
  username?: string
  discordHandle?: string
  twitterHandle?: string
  status: 'online' | 'in-battle'
  wins?: number
  losses?: number
  winRate?: number
}

interface Challenge {
  id: string
  challenger: string
  challenged: string
  message: string
  battleType: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: number
}

export function usePollingSocket(walletAddress: string | null) {
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  // Update user status (keep them online)
  const updateStatus = useCallback(async (status: 'online' | 'in-battle' = 'online') => {
    if (!walletAddress) return
    
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          status,
          wins: 0, // Could get from user profile
          losses: 0
        })
      })
      setConnected(true)
    } catch (error) {
      console.error("Failed to update status:", error)
      setConnected(false)
    }
  }, [walletAddress])

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!walletAddress) return
    
    setIsSearching(true)
    try {
      const response = await fetch(`/api/users?query=${encodeURIComponent(query)}&wallet=${walletAddress}`)
      if (response.ok) {
        const users = await response.json()
        setOnlineUsers(users)
      }
    } catch (error) {
      console.error("Failed to search users:", error)
    } finally {
      setIsSearching(false)
    }
  }, [walletAddress])

  // Send challenge
  const sendChallenge = useCallback(async (targetWallet: string, message: string, battleType?: string) => {
    if (!walletAddress) return
    
    console.log("Sending challenge:", { walletAddress, targetWallet, message, battleType })
    
    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenger: walletAddress,
          challenged: targetWallet,
          message,
          battleType: battleType || '1v1'
        })
      })
      
      if (response.ok) {
        console.log("Challenge sent successfully")
        return true
      } else {
        const errorData = await response.json()
        console.error("Challenge send failed:", errorData)
      }
    } catch (error) {
      console.error("Failed to send challenge:", error)
    }
    return false
  }, [walletAddress])

  // Check for incoming challenges
  const checkChallenges = useCallback(async () => {
    if (!walletAddress) return
    
    console.log("Checking challenges for wallet:", walletAddress)
    
    try {
      const response = await fetch(`/api/challenges?wallet=${walletAddress}`)
      if (response.ok) {
        const data = await response.json()
        console.log("Received challenges data:", data)
        
        // Handle new API response format
        if (data.incomingChallenges) {
          setIncomingChallenges(data.incomingChallenges)
        } else {
          // Fallback for old format (if any)
          setIncomingChallenges(data)
        }
      } else {
        console.error("Failed to check challenges - response not ok:", response.status)
      }
    } catch (error) {
      console.error("Failed to check challenges:", error)
    }
  }, [walletAddress])

  // Accept challenge
  const acceptChallenge = useCallback(async (challengeId: string) => {
    try {
      const response = await fetch('/api/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          action: 'accept'
        })
      })
      
      if (response.ok) {
        setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId))
        console.log("Challenge accepted")
        return true
      }
    } catch (error) {
      console.error("Failed to accept challenge:", error)
    }
    return false
  }, [])

  // Decline challenge
  const declineChallenge = useCallback(async (challengeId: string) => {
    try {
      const response = await fetch('/api/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          action: 'decline'
        })
      })
      
      if (response.ok) {
        setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId))
        console.log("Challenge declined")
        return true
      }
    } catch (error) {
      console.error("Failed to decline challenge:", error)
    }
    return false
  }, [])

  // Set up polling when wallet is connected
  useEffect(() => {
    if (!walletAddress) {
      setConnected(false)
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
      return
    }

    // Initial status update
    updateStatus('online')
    
    // Set up polling every 5 seconds
    pollingInterval.current = setInterval(() => {
      updateStatus('online')
      checkChallenges()
    }, 5000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
      // Remove user from online list when disconnecting
      fetch(`/api/users?wallet=${walletAddress}`, { method: 'DELETE' })
    }
  }, [walletAddress, updateStatus, checkChallenges])

  return {
    connected,
    onlineUsers,
    incomingChallenges,
    isSearching,
    searchUsers,
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    updateStatus
  }
}
