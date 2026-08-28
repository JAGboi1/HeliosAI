import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/friends?wallet=0x...              → list friends + pending requests
// GET /api/friends?wallet=0x...&search=name  → search users to add
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet  = searchParams.get("wallet")?.toLowerCase()
  const search  = searchParams.get("search")?.trim()

  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 })

  // ── Search users ────────────────────────────────────────────────────────────
  if (search) {
    const cleanSearch = search.replace(/^@/, "").toLowerCase()

    const { data: byDiscord } = await supabase
      .from("users")
      .select("wallet, discord_username, wins, losses, total_battles")
      .ilike("discord_username", `%${cleanSearch}%`)
      .neq("wallet", wallet)
      .limit(8)

    const { data: byWallet } = await supabase
      .from("users")
      .select("wallet, discord_username, wins, losses, total_battles")
      .ilike("wallet", `${cleanSearch}%`)
      .neq("wallet", wallet)
      .limit(8)

    const merged = [...(byDiscord || []), ...(byWallet || [])]
    const seen   = new Set<string>()
    const results = merged.filter(u => {
      if (seen.has(u.wallet)) return false
      seen.add(u.wallet)
      return true
    })

    if (results.length === 0) return NextResponse.json([])

    const wallets = results.map(u => u.wallet)
    const { data: friendships } = await supabase
      .from("friends")
      .select("wallet_a, wallet_b, status")
      .or(
        wallets.map(w =>
          `and(wallet_a.eq.${wallet},wallet_b.eq.${w}),and(wallet_a.eq.${w},wallet_b.eq.${wallet})`
        ).join(",")
      )

    const friendMap = new Map<string, string>()
    for (const f of friendships || []) {
      const other = f.wallet_a === wallet ? f.wallet_b : f.wallet_a
      friendMap.set(other, f.status)
    }

    return NextResponse.json(
      results.map(u => ({
        wallet:          u.wallet,
        discordUsername: u.discord_username,
        wins:            u.wins || 0,
        losses:          u.losses || 0,
        totalBattles:    u.total_battles || 0,
        friendStatus:    friendMap.get(u.wallet) || "none",
      }))
    )
  }

  // ── List friends + pending requests ────────────────────────────────────────
  const { data: rows } = await supabase
    .from("friends")
    .select("wallet_a, wallet_b, status, requester, created_at")
    .or(`wallet_a.eq.${wallet},wallet_b.eq.${wallet}`)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ friends: [], incoming: [], outgoing: [] })
  }

  const friends:  any[] = []
  const incoming: any[] = []
  const outgoing: any[] = []

  const otherWallets = rows.map(r => r.wallet_a === wallet ? r.wallet_b : r.wallet_a)

  const { data: userRows } = await supabase
    .from("users")
    .select("wallet, discord_username, wins, losses, total_battles")
    .in("wallet", otherWallets)

  const userMap = new Map((userRows || []).map(u => [u.wallet, u]))

  for (const row of rows) {
    const otherWallet = row.wallet_a === wallet ? row.wallet_b : row.wallet_a
    const userData    = userMap.get(otherWallet)

    const entry = {
      wallet:          otherWallet,
      discordUsername: userData?.discord_username || null,
      wins:            userData?.wins || 0,
      losses:          userData?.losses || 0,
      totalBattles:    userData?.total_battles || 0,
      since:           row.created_at,
    }

    if (row.status === "accepted") {
      friends.push(entry)
    } else if (row.status === "pending") {
      // Use the requester column — not wallet_a — to determine direction
      const iSentThis = row.requester?.toLowerCase() === wallet
      if (iSentThis) outgoing.push(entry)
      else           incoming.push(entry)
    }
  }

  return NextResponse.json({ friends, incoming, outgoing })
}

// POST /api/friends  { action, walletA, walletB }
// actions: send_request | accept | decline | remove
export async function POST(req: NextRequest) {
  try {
    const { action, walletA, walletB } = await req.json()

    if (!action || !walletA || !walletB) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const a = walletA.toLowerCase()
    const b = walletB.toLowerCase()

    if (a === b) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 })

    // Canonical order: smaller wallet is always wallet_a
    const [w1, w2] = a < b ? [a, b] : [b, a]

    if (action === "send_request") {
      const { data: existing } = await supabase
        .from("friends")
        .select("status")
        .eq("wallet_a", w1)
        .eq("wallet_b", w2)
        .single()

      if (existing) {
        return NextResponse.json({ error: "Request already exists", status: existing.status }, { status: 409 })
      }

      const { error } = await supabase.from("friends").insert({
        wallet_a:   w1,
        wallet_b:   w2,
        status:     "pending",
        requester:  a,
        created_at: new Date().toISOString(),
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === "accept") {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("wallet_a", w1)
        .eq("wallet_b", w2)
        .eq("status", "pending")

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === "decline" || action === "remove") {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("wallet_a", w1)
        .eq("wallet_b", w2)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })

  } catch (err: any) {
    console.error("Friends API error:", err)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}