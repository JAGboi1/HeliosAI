import { useEffect, useRef, useState } from "react"

interface BattleState {
  battleId?: string
  opponent?: string
  isPlayer1?: boolean
  player1Health: number
  player2Health: number
  currentTurn: 'player1' | 'player2'
  battleState: 'waiting' | 'active' | 'finished'
  winner?: string
}

interface QueueStatus {
  inQueue: boolean
  position?: number
}

interface ChallengeNotification {
  challenger: string
  message: string
  battleType: string
  timestamp: string
}

export function useSocket(walletAddress: string | null) {
  const [socket, setSocket] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ inQueue: false })
  const [battleState, setBattleState] = useState<BattleState>({
    player1Health: 100,
    player2Health: 100,
    currentTurn: 'player1',
    battleState: 'waiting'
  })
  const [queueLength, setQueueLength] = useState(0)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeNotification | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!walletAddress) return

    // Import socket.io-client dynamically to avoid SSR issues
    import("socket.io-client").then(({ io }) => {
      const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || window.location.origin, {
        path: "/api/socket/io"
      })

      socketInstance.on("connect", () => {
        console.log("Connected to socket server")
        setConnected(true)
        
        // Send user profile data when joining
        const profileData = {
          walletAddress,
          username: null, // Could get from user profile
          discordHandle: null, // Could get from connected Discord
          twitterHandle: null, // Could get from connected Twitter
          wins: 0, // Could get from user stats
          losses: 0 // Could get from user stats
        }
        
        socketInstance.emit("join", profileData)
      })

      socketInstance.on("disconnect", () => {
        console.log("Disconnected from socket server")
        setConnected(false)
      })

      socketInstance.on("queue-status", (status: QueueStatus) => {
        setQueueStatus(status)
      })

      socketInstance.on("queue-update", (data: { queueLength: number }) => {
        setQueueLength(data.queueLength)
      })

      socketInstance.on("battle-found", (data: { battleId: string; opponent: string; isPlayer1: boolean }) => {
        setBattleState(prev => ({
          ...prev,
          battleId: data.battleId,
          opponent: data.opponent,
          isPlayer1: data.isPlayer1,
          battleState: 'waiting'
        }))
      })

      socketInstance.on("battle-start", (data: BattleState) => {
        setBattleState(data)
      })

      socketInstance.on("battle-update", (data: BattleState) => {
        setBattleState(data)
      })

      socketInstance.on("error", (error: string) => {
        console.error("Socket error:", error)
      })

      socketInstance.on("search-results", (results: any[]) => {
        setSearchResults(results)
        setIsSearching(false)
      })

      socketInstance.on("challenge-received", (challenge: ChallengeNotification) => {
        setIncomingChallenge(challenge)
      })

      socketInstance.on("challenge-sent", (data: { target: string }) => {
        console.log("Challenge sent to:", data.target)
      })

      socketInstance.on("challenge-error", (data: { message: string }) => {
        console.error("Challenge error:", data.message)
      })

      socketInstance.on("challenge-declined", (data: { decliner: string }) => {
        console.log("Challenge declined by:", data.decliner)
      })

      socketInstance.on("direct-battle-start", (data: BattleState) => {
        setBattleState(data)
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    })
  }, [walletAddress])

  const joinQueue = () => {
    if (socket && connected) {
      socket.emit("join-queue")
    }
  }

  const leaveQueue = () => {
    if (socket && connected) {
      socket.emit("leave-queue")
    }
  }

  const acceptBattle = () => {
    if (socket && battleState.battleId) {
      socket.emit("accept-battle", battleState.battleId)
    }
  }

  const performAction = (action: 'attack' | 'defend' | 'special') => {
    if (socket && battleState.battleId && battleState.battleState === 'active') {
      socket.emit("battle-action", {
        battleId: battleState.battleId,
        action
      })
    }
  }

  const isMyTurn = () => {
    if (!battleState.isPlayer1 || !battleState.currentTurn) return false
    return (battleState.isPlayer1 && battleState.currentTurn === 'player1') ||
           (!battleState.isPlayer1 && battleState.currentTurn === 'player2')
  }

  const searchUsers = (query: string) => {
    if (socket && connected && query.trim()) {
      setIsSearching(true)
      socket.emit("search-users", query)
    }
  }

  const sendChallenge = (targetWallet: string, message: string, battleType?: string) => {
    if (socket && connected) {
      socket.emit("send-challenge", { targetWallet, message, battleType })
    }
  }

  const acceptChallenge = (challenger: string, battleType?: string) => {
    if (socket && connected) {
      socket.emit("accept-challenge", { challenger, battleType })
      setIncomingChallenge(null)
    }
  }

  const declineChallenge = (challenger: string) => {
    if (socket && connected) {
      socket.emit("decline-challenge", { challenger })
      setIncomingChallenge(null)
    }
  }

  return {
    connected,
    queueStatus,
    queueLength,
    battleState,
    searchResults,
    incomingChallenge,
    isSearching,
    joinQueue,
    leaveQueue,
    acceptBattle,
    performAction,
    isMyTurn,
    searchUsers,
    sendChallenge,
    acceptChallenge,
    declineChallenge
  }
}
