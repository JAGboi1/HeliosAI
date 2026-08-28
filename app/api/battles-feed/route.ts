import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Deduplicate by match_id — each battle is recorded twice (once per player)
    // We only want the winner's row (result = 'win')
    const { data, error } = await supabase
      .from("battle_history")
      .select("id, match_id, wallet, opponent_wallet, my_character, opponent_character, result, battle_story, rarity, win_streak, created_at")
      .eq("result", "win")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error("Battles feed error:", err)
    return NextResponse.json([], { status: 500 })
  }
}