import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type MatchState = "SEARCHING" | "MATCH_FOUND" | "OPPONENT_CREATING" | "READY" | "STARTING" | "IN_GAME"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── POST: Create a new challenge ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { challenger, challenged, message, battleType } = body

    if (!challenger || !challenged) {
      return NextResponse.json({ error: "Challenger and challenged required" }, { status: 400 })
    }

    const challengeId = `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const matchState = {
      playerA: challenger,
      playerB: null,
      state: "SEARCHING" as MatchState,
      playerAReady: false,
      playerBReady: false,
      playerACharacter: null,
      playerBCharacter: null,
      lastStateChange: Date.now()
    }

    const { error } = await supabase.from("challenges").insert({
      id: challengeId,
      challenger,
      challenged,
      message: message || "Let's battle!",
      battle_type: battleType || "1v1",
      status: "pending",
      created_at: Date.now(),
      match_state: matchState,
      battle_result: null
    })

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 })
    }

    return NextResponse.json({ success: true, challengeId, message: "Challenge sent successfully" })
  } catch (error) {
    console.error("Error creating challenge:", error)
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 })
  }
}

// ── GET: Fetch challenge or user's challenges ─────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  const matchId = searchParams.get("matchId")

  if (!wallet && !matchId) {
    return NextResponse.json({ error: "Wallet address or match ID required" }, { status: 400 })
  }

  if (matchId) {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", matchId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    const response: any = {
      matchId: data.id,
      matchState: data.match_state,
      status: data.status
    }

    if (data.match_state?.state === "IN_GAME" && data.battle_result) {
      response.battleResult = data.battle_result
    }

    return NextResponse.json(response)
  }

  const { data: incoming } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenged", wallet)
    .eq("status", "pending")

  const { data: asChallenger } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenger", wallet)
    .eq("status", "accepted")

  const { data: asChallenged } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenged", wallet)
    .eq("status", "accepted")

  const allActive = [...(asChallenger || []), ...(asChallenged || [])]
  const activeMatches = allActive.filter(m => m.match_state?.state !== "IN_GAME")

  return NextResponse.json({ incomingChallenges: incoming || [], activeMatches })
}

// ── PATCH: Accept, decline, or update character ───────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { challengeId, action, wallet, character } = body

    if (!challengeId || !action) {
      return NextResponse.json({ error: "Challenge ID and action required" }, { status: 400 })
    }

    const { data: challenge, error: fetchError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
    }

    if (action === "accept") {
      const updatedMatchState = {
        ...challenge.match_state,
        playerB: challenge.challenged,
        state: "MATCH_FOUND" as MatchState,
        acceptedAt: Date.now(),
        lastStateChange: Date.now()
      }

      const { error } = await supabase
        .from("challenges")
        .update({ status: "accepted", match_state: updatedMatchState })
        .eq("id", challengeId)

      if (error) return NextResponse.json({ error: "Failed to accept challenge" }, { status: 500 })

      return NextResponse.json({ success: true, status: "accepted", matchState: updatedMatchState })
    }

    if (action === "decline") {
      await supabase.from("challenges").update({ status: "declined" }).eq("id", challengeId)
      return NextResponse.json({ success: true, status: "declined" })
    }

    if (action === "complete") {
      await supabase.from("challenges").update({ status: "completed" }).eq("id", challengeId)
      return NextResponse.json({ success: true, status: "completed" })
    }

    if (action === "update-character" && wallet && character) {
      const ms = { ...challenge.match_state }

      if (wallet === challenge.challenger) {
        ms.playerACharacter = character
        ms.playerAReady = true
      } else if (wallet === challenge.challenged) {
        ms.playerBCharacter = character
        ms.playerBReady = true
      }

      ms.lastStateChange = Date.now()

      if (ms.playerAReady && ms.playerBReady) {
        ms.state = "STARTING"
      } else {
        ms.state = "OPPONENT_CREATING"
      }

      const { error: updateError } = await supabase
        .from("challenges")
        .update({ match_state: ms })
        .eq("id", challengeId)

      if (updateError) return NextResponse.json({ error: "Failed to update character" }, { status: 500 })

      if (ms.playerAReady && ms.playerBReady) {
        generateAndStoreBattle(challengeId, ms).catch(console.error)
      }

      return NextResponse.json({ success: true, matchState: ms })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("Error updating challenge:", error)
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 })
  }
}

// ── Rarity helper ─────────────────────────────────────────────────────────────
function getRarity(streak: number): string {
  if (streak >= 30) return "LEGENDARY"
  if (streak >= 20) return "ULTRA_RARE"
  if (streak >= 10) return "RARE"
  return "COMMON"
}

// ── Background: generate battle via Groq and store result ─────────────────────
async function generateAndStoreBattle(challengeId: string, matchState: any) {
  console.log(`Generating battle for ${challengeId}`)

  try {
    const { playerACharacter, playerBCharacter, playerA, playerB } = matchState

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("GROQ_API_KEY not set")

    const prompt = `You are an epic battle narrator for a fantasy arena game. Two warriors are about to fight. Based on their abilities, stats, and descriptions, generate a cinematic battle story and declare a winner.

FIGHTER 1: ${playerACharacter.name}
Class: ${playerACharacter.class}
Description: ${playerACharacter.description}
Skills: ${playerACharacter.skills?.join(", ")}
Powers: ${playerACharacter.powers?.join(", ")}
Stats — HP: ${playerACharacter.health} | ATK: ${playerACharacter.attack} | DEF: ${playerACharacter.defense} | SPD: ${playerACharacter.speed}

FIGHTER 2: ${playerBCharacter.name}
Class: ${playerBCharacter.class}
Description: ${playerBCharacter.description}
Skills: ${playerBCharacter.skills?.join(", ")}
Powers: ${playerBCharacter.powers?.join(", ")}
Stats — HP: ${playerBCharacter.health} | ATK: ${playerBCharacter.attack} | DEF: ${playerBCharacter.defense} | SPD: ${playerBCharacter.speed}

Respond in this EXACT JSON format with no extra text:
{
  "winner": "<winning fighter name>",
  "loser": "<losing fighter name>",
  "battleStory": "<4-6 sentence cinematic battle narrative, dramatic and specific to their abilities>",
  "winnerNarrative": "<1-2 sentences about what the winner did best>",
  "loserNarrative": "<1-2 sentences about the loser's effort and why they fell short>",
  "judgment": "<2-3 sentences of AI reasoning explaining WHY the winner won based on their specific abilities and stats>"
}`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        max_tokens: 1024
      })
    })

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`)

    const groqData = await response.json()
    const rawContent = groqData.choices?.[0]?.message?.content
    if (!rawContent) throw new Error("No content from Groq")

    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const battleResult = JSON.parse(cleaned)

    const finalMatchState = {
      ...matchState,
      state: "IN_GAME" as MatchState,
      lastStateChange: Date.now()
    }

    await supabase
      .from("challenges")
      .update({ match_state: finalMatchState, battle_result: battleResult })
      .eq("id", challengeId)

    console.log(`Battle generated for ${challengeId} — winner: ${battleResult.winner}`)

    // ── Update stats + streaks ────────────────────────────────────────────────
    const playerAWon = battleResult.winner === playerACharacter.name
    const now = Date.now()

    const updateUserStats = async (wallet: string, won: boolean) => {
      // Ensure row exists
      await supabase.from("users").upsert(
        { wallet, wins: 0, losses: 0, total_battles: 0, win_streak: 0, max_streak: 0, created_at: now, updated_at: now },
        { onConflict: "wallet", ignoreDuplicates: true }
      )

      const { data: current } = await supabase
        .from("users")
        .select("wins, losses, total_battles, win_streak, max_streak")
        .eq("wallet", wallet)
        .single()

      const newStreak = won ? (current?.win_streak || 0) + 1 : 0
      const newMaxStreak = Math.max(current?.max_streak || 0, newStreak)

      await supabase.from("users").update({
        wins:          (current?.wins || 0) + (won ? 1 : 0),
        losses:        (current?.losses || 0) + (won ? 0 : 1),
        total_battles: (current?.total_battles || 0) + 1,
        win_streak:    newStreak,
        max_streak:    newMaxStreak,
        updated_at:    now
      }).eq("wallet", wallet)

      return newStreak
    }

    const recordHistory = async (
      wallet: string,
      opponentWallet: string,
      myChar: any,
      oppChar: any,
      won: boolean,
      streak: number
    ) => {
      await supabase.from("battle_history").insert({
        id:                 `${challengeId}-${wallet}`,
        match_id:           challengeId,
        wallet,
        opponent_wallet:    opponentWallet,
        my_character:       myChar.name,
        opponent_character: oppChar.name,
        result:             won ? "win" : "loss",
        battle_story:       battleResult.battleStory,
        judgment:           battleResult.judgment,
        rarity:             won ? getRarity(streak) : null,
        win_streak:         streak,
        created_at:         now
      })
    }

    const [streakA, streakB] = await Promise.all([
      updateUserStats(playerA, playerAWon),
      updateUserStats(playerB, !playerAWon)
    ])

    await Promise.all([
      recordHistory(playerA, playerB, playerACharacter, playerBCharacter, playerAWon, streakA),
      recordHistory(playerB, playerA, playerBCharacter, playerACharacter, !playerAWon, streakB)
    ])

    // Store rarity and streak in battle_result for frontend to read
    const enrichedResult = {
      ...battleResult,
      rarity:    playerAWon ? getRarity(streakA) : getRarity(streakB),
      winStreak: playerAWon ? streakA : streakB,
      winnerWallet: playerAWon ? playerA : playerB
    }

    await supabase
      .from("challenges")
      .update({ battle_result: enrichedResult })
      .eq("id", challengeId)

    console.log(`Stats and streaks recorded for ${playerA} and ${playerB}`)

  } catch (error) {
    console.error(`Battle generation failed for ${challengeId}:`, error)

    await supabase
      .from("challenges")
      .update({
        match_state: {
          ...matchState,
          state: "IN_GAME" as MatchState,
          lastStateChange: Date.now()
        }
      })
      .eq("id", challengeId)
  }
}