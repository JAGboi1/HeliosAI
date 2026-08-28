import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/random-battle { wallet }
// Finds an available online player and creates a challenge
export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()
    if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 })

    const walletLower = wallet.toLowerCase()

    // Find online users who are not in battle and not the current user
    // Updated in last 3 minutes = online
    const threeMinAgo = Date.now() - 3 * 60 * 1000

    const { data: onlineUsers } = await supabase
      .from("users")
      .select("wallet, discord_username, wins, losses")
      .neq("wallet", walletLower)
      .eq("status", "online")
      .gte("updated_at", threeMinAgo)
      .limit(20)

    if (!onlineUsers || onlineUsers.length === 0) {
      return NextResponse.json({ error: "No available players online right now. Try again in a moment!" }, { status: 404 })
    }

    // Pick a random available player
    const opponent = onlineUsers[Math.floor(Math.random() * onlineUsers.length)]

    // Create a challenge
    const challengeId = `random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const matchState = {
      playerA:         walletLower,
      playerB:         opponent.wallet,
      state:           "MATCH_FOUND",
      playerAReady:    false,
      playerBReady:    false,
      playerACharacter: null,
      playerBCharacter: null,
      lastStateChange:  Date.now(),
      acceptedAt:       Date.now(),
      isRandomBattle:   true,
    }

    const { error } = await supabase.from("challenges").insert({
      id:           challengeId,
      challenger:   walletLower,
      challenged:   opponent.wallet,
      message:      "Random battle!",
      battle_type:  "random",
      status:       "accepted", // auto-accepted for random battles
      created_at:   Date.now(),
      match_state:  matchState,
      battle_result: null,
    })

    if (error) throw error

    return NextResponse.json({
      success:     true,
      challengeId,
      opponent: {
        wallet:          opponent.wallet,
        discordUsername: opponent.discord_username,
        wins:            opponent.wins || 0,
        losses:          opponent.losses || 0,
      },
      matchState,
    })

  } catch (err: any) {
    console.error("Random battle error:", err)
    return NextResponse.json({ error: err.message || "Failed to find opponent" }, { status: 500 })
  }
}