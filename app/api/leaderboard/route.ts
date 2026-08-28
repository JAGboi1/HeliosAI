import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sort = searchParams.get("sort") === "wins" ? "wins" : "win_streak"

    const { data, error } = await supabase
      .from("users")
      .select("wallet, discord_username, wins, losses, total_battles, win_streak")
      .order(sort, { ascending: false })
      .limit(50)

    if (error) throw error

    // Filter out users with 0 activity
    const filtered = (data || []).filter(u => (u.total_battles || 0) > 0)

    return NextResponse.json(filtered)
  } catch (err: any) {
    console.error("Leaderboard error:", err)
    return NextResponse.json([], { status: 500 })
  }
}