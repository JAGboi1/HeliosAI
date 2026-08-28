import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { playerACharacter, playerBCharacter } = await req.json()

    if (!playerACharacter || !playerBCharacter) {
      return NextResponse.json({ error: "Both characters required" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
    }

    // Build rich fighter descriptions using NFT + forged fighter data
    const buildFighterDesc = (char: any, label: string) => {
      const isNftFighter = !!char.nftName
      if (isNftFighter) {
        return `${label}: ${char.name} (${char.class})
NFT Origin: ${char.nftName} from ${char.collection || "Unknown Collection"}
Element: ${char.element || "Unknown"}
Rarity: ${char.rarity || "Common"}
Lore: ${char.description}
Powers: ${Array.isArray(char.powers) ? char.powers.join(" | ") : char.powers}
Skills: ${Array.isArray(char.skills) ? char.skills.join(" | ") : char.skills}
Stats — HP: ${char.health} | ATK: ${char.attack} | DEF: ${char.defense} | SPD: ${char.speed}
Battle Cry: "${char.battleCry || "For glory!"}"
BATTLE STRATEGY: ${char.strategy || "Fight with everything I have"}`
      }

      // Legacy custom character fallback
      return `${label}: ${char.name} (${char.class})
Description: ${char.description}
Skills: ${Array.isArray(char.skills) ? char.skills.join(", ") : char.skills}
Powers: ${Array.isArray(char.powers) ? char.powers.join(", ") : char.powers}
Stats — HP: ${char.health} | ATK: ${char.attack} | DEF: ${char.defense} | SPD: ${char.speed}
Battle Strategy: ${char.strategy || "Fight with full force"}`
    }

    const prompt = `You are an epic battle narrator for an NFT battle arena. Two NFT-powered warriors clash. 
The outcome is determined by their stats, powers, AND the quality of their battle strategies.
A fighter with a clever strategy that leverages their specific powers should have a tactical advantage.

${buildFighterDesc(playerACharacter, "FIGHTER 1")}

${buildFighterDesc(playerBCharacter, "FIGHTER 2")}

JUDGING CRITERIA:
1. How well each fighter's strategy uses their specific powers and skills
2. Stat matchups (higher ATK beats lower DEF, higher SPD can dodge slower fighters)
3. Elemental advantages (Fire beats Ice, Lightning beats Water, Shadow beats Light, etc.)
4. Rarity advantage (Legendary > Ultra Rare > Rare > Common, but strategy can overcome)

Write the response in this EXACT JSON format with no extra text outside the JSON:
{
  "winner": "<name of the winning fighter>",
  "loser": "<name of the losing fighter>",
  "battleStory": "<A 5-7 sentence cinematic battle narrative. Reference the actual powers and skills used. Show how the winning strategy played out. Make it dramatic and specific to their NFT origins and abilities>",
  "winnerNarrative": "<2-3 sentences about how the winner's strategy and powers won the day>",
  "loserNarrative": "<1-2 sentences about the loser's valiant effort and why their strategy fell short>",
  "judgment": "<2-3 sentences of AI reasoning explaining WHY the winner won — reference specific powers, stats, strategy choices, and elemental interactions>",
  "strategyScore": {
    "winner": "<brief 1-line assessment of winning strategy>",
    "loser": "<brief 1-line assessment of losing strategy>"
  }
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
        max_tokens: 1200
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Groq API error:", error)
      return NextResponse.json({ error: "Groq API request failed" }, { status: 500 })
    }

    const groqData   = await response.json()
    const rawContent = groqData.choices?.[0]?.message?.content

    if (!rawContent) {
      return NextResponse.json({ error: "No response from Groq" }, { status: 500 })
    }

    let battleResult
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      battleResult  = JSON.parse(cleaned)
    } catch (parseError) {
      console.error("Failed to parse Groq response:", rawContent)
      return NextResponse.json({ error: "Failed to parse battle result" }, { status: 500 })
    }

    return NextResponse.json({ success: true, result: battleResult })

  } catch (error) {
    console.error("Battle generation error:", error)
    return NextResponse.json({ error: "Battle generation failed" }, { status: 500 })
  }
}