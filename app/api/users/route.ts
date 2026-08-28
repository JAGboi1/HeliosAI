import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const onlineUsers = new Map<string, {
  walletAddress: string
  discordUsername: string | null
  status: 'online' | 'in-battle'
  lastSeen: number
}>()

function cleanupOldUsers() {
  const now = Date.now()
  for (const [wallet, user] of onlineUsers.entries()) {
    if (now - user.lastSeen > 5 * 60 * 1000) onlineUsers.delete(wallet)
  }
}

// GET: fetch online users OR a single user's stats + battle history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  const query = searchParams.get("query") || ""
  const statsOnly = searchParams.get("stats") === "true"

  // Fetch stats + battle history for a specific wallet
  if (wallet && statsOnly) {
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("wallet", wallet)
      .single()

    const { data: historyData } = await supabase
      .from("battle_history")
      .select("*")
      .eq("wallet", wallet)
      .order("created_at", { ascending: false })
      .limit(20)

    return NextResponse.json({
      stats: userData || { wallet, wins: 0, losses: 0, total_battles: 0 },
      history: historyData || []
    })
  }

  // Search by Discord username — returns wallet address for challenge
  if (query.trim()) {
    const cleanQuery = query.replace(/^@/, "").toLowerCase().trim()

    const { data: found } = await supabase
      .from("users")
      .select("wallet, discord_username, wins, losses, total_battles")
      .ilike("discord_username", cleanQuery)
      .limit(5)

    if (found && found.length > 0) {
      const results = found.map(u => ({
        walletAddress: u.wallet,
        discordUsername: u.discord_username,
        wins: u.wins || 0,
        losses: u.losses || 0,
        total_battles: u.total_battles || 0,
        winRate: u.total_battles > 0 ? (u.wins / u.total_battles) * 100 : 0,
        status: onlineUsers.get(u.wallet)?.status || "offline"
      }))
      return NextResponse.json(results)
    }

    return NextResponse.json([])
  }

  // Online users list (no search query)
  cleanupOldUsers()
  const users = Array.from(onlineUsers.values())
    .filter(u => u.walletAddress !== wallet)
    .filter(u => u.status !== "in-battle")

  return NextResponse.json(users)
}

// POST: register / heartbeat online presence + save Discord username
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, status, discordUsername } = body

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    onlineUsers.set(walletAddress, {
      walletAddress,
      discordUsername: discordUsername || null,
      status: status || "online",
      lastSeen: Date.now()
    })

    // Upsert user row — also saves discord_username if provided
    const upsertData: any = {
      wallet: walletAddress,
      updated_at: Date.now()
    }
    if (discordUsername) {
      upsertData.discord_username = discordUsername.replace(/^@/, "").toLowerCase().trim()
    }

    await supabase.from("users").upsert(upsertData, {
      onConflict: "wallet",
      ignoreDuplicates: false  // allow updates so discord_username gets saved
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  if (wallet) onlineUsers.delete(wallet)
  return NextResponse.json({ success: true })
}