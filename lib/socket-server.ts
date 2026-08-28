import { Server as NetServer } from "http"
import { NextApiRequest, NextApiResponse } from "next"
import { Server as ServerIO } from "socket.io"

export const config = {
  api: {
    bodyParser: false,
  },
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponse & { socket: any }) => {
  if (res.socket.server.io) {
    console.log("Socket is already running")
  } else {
    console.log("Socket is initializing")
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    // Battle queue management
    const battleQueue: string[] = []
    const activeBattles = new Map<string, {
      player1: string
      player2: string
      state: 'waiting' | 'active' | 'finished'
      currentTurn: 'player1' | 'player2'
      player1Health: number
      player2Health: number
      createdAt: number
    }>()

    // Handle socket connections
    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`)

      // User joins with their wallet address
      socket.on("join", (walletAddress: string) => {
        socket.data.walletAddress = walletAddress
        socket.join(walletAddress)
        console.log(`User ${walletAddress} joined with socket ${socket.id}`)
      })

      // Join battle queue
      socket.on("join-queue", () => {
        const walletAddress = socket.data.walletAddress
        if (!walletAddress) {
          socket.emit("error", "Wallet address required")
          return
        }

        // Check if user is already in queue
        if (battleQueue.includes(walletAddress)) {
          socket.emit("queue-status", { inQueue: true, position: battleQueue.indexOf(walletAddress) + 1 })
          return
        }

        // Add to queue
        battleQueue.push(walletAddress)
        socket.emit("queue-status", { inQueue: true, position: battleQueue.length })
        socket.broadcast.emit("queue-update", { queueLength: battleQueue.length })

        // Try to match players
        if (battleQueue.length >= 2) {
          const player1 = battleQueue.shift()!
          const player2 = battleQueue.shift()!
          
          const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          // Create battle room
          activeBattles.set(battleId, {
            player1,
            player2,
            state: 'waiting',
            currentTurn: 'player1',
            player1Health: 100,
            player2Health: 100,
            createdAt: Date.now()
          })

          // Join both players to battle room
          const player1Socket = [...io.sockets.sockets.values()].find(s => s.data.walletAddress === player1)
          const player2Socket = [...io.sockets.sockets.values()].find(s => s.data.walletAddress === player2)

          if (player1Socket && player2Socket) {
            player1Socket.join(battleId)
            player2Socket.join(battleId)
            
            // Notify both players
            player1Socket.emit("battle-found", { battleId, opponent: player2, isPlayer1: true })
            player2Socket.emit("battle-found", { battleId, opponent: player1, isPlayer1: false })
            
            // Update queue status
            battleQueue.forEach((wallet, index) => {
              const userSocket = [...io.sockets.sockets.values()].find(s => s.data.walletAddress === wallet)
              if (userSocket) {
                userSocket.emit("queue-status", { inQueue: true, position: index + 1 })
              }
            })
          }
        }
      })

      // Leave battle queue
      socket.on("leave-queue", () => {
        const walletAddress = socket.data.walletAddress
        if (walletAddress) {
          const index = battleQueue.indexOf(walletAddress)
          if (index > -1) {
            battleQueue.splice(index, 1)
            socket.emit("queue-status", { inQueue: false })
            socket.broadcast.emit("queue-update", { queueLength: battleQueue.length })
          }
        }
      })

      // Accept battle
      socket.on("accept-battle", (battleId: string) => {
        const battle = activeBattles.get(battleId)
        if (!battle) return

        const walletAddress = socket.data.walletAddress
        const isPlayer1 = battle.player1 === walletAddress
        const opponentSocket = [...io.sockets.sockets.values()].find(s => 
          s.data.walletAddress === (isPlayer1 ? battle.player2 : battle.player1)
        )

        if (opponentSocket) {
          battle.state = 'active'
          io.to(battleId).emit("battle-start", {
            battleId,
            player1: battle.player1,
            player2: battle.player2,
            currentTurn: battle.currentTurn,
            player1Health: battle.player1Health,
            player2Health: battle.player2Health
          })
        }
      })

      // Battle action (attack, defend, special)
      socket.on("battle-action", (data: { battleId: string; action: string; damage?: number }) => {
        const battle = activeBattles.get(data.battleId)
        if (!battle || battle.state !== 'active') return

        const walletAddress = socket.data.walletAddress
        const isPlayer1 = battle.player1 === walletAddress
        const isPlayerTurn = (isPlayer1 && battle.currentTurn === 'player1') || 
                            (!isPlayer1 && battle.currentTurn === 'player2')

        if (!isPlayerTurn) {
          socket.emit("error", "Not your turn")
          return
        }

        // Process action
        let damage = 0
        switch (data.action) {
          case 'attack':
            damage = Math.floor(Math.random() * 20) + 10 // 10-30 damage
            break
          case 'special':
            damage = Math.floor(Math.random() * 30) + 20 // 20-50 damage
            break
          case 'defend':
            damage = 0
            break
        }

        // Apply damage
        if (isPlayer1) {
          battle.player2Health = Math.max(0, battle.player2Health - damage)
        } else {
          battle.player1Health = Math.max(0, battle.player1Health - damage)
        }

        // Check for winner
        let winner = null
        if (battle.player1Health <= 0) {
          winner = battle.player2
          battle.state = 'finished'
        } else if (battle.player2Health <= 0) {
          winner = battle.player1
          battle.state = 'finished'
        }

        // Switch turns
        if (battle.state === 'active') {
          battle.currentTurn = battle.currentTurn === 'player1' ? 'player2' : 'player1'
        }

        // Broadcast battle update
        io.to(data.battleId).emit("battle-update", {
          action: data.action,
          damage,
          player1Health: battle.player1Health,
          player2Health: battle.player2Health,
          currentTurn: battle.currentTurn,
          winner,
          battleState: battle.state
        })

        // Clean up finished battles
        if (battle.state === 'finished') {
          setTimeout(() => {
            activeBattles.delete(data.battleId)
          }, 5000)
        }
      })

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`)
        
        // Remove from queue
        const walletAddress = socket.data.walletAddress
        if (walletAddress) {
          const index = battleQueue.indexOf(walletAddress)
          if (index > -1) {
            battleQueue.splice(index, 1)
          }
        }
      })
    })

    res.socket.server.io = io
  }
  res.end()
}

export default SocketHandler
