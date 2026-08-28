import { NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { nft } = await req.json()

    if (!nft) {
      return NextResponse.json({ error: "NFT data required" }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
    }

    // Build traits string from NFT attributes
    const traitsText = nft.traits && nft.traits.length > 0
      ? nft.traits.map((t: any) => `${t.trait_type}: ${t.value}`).join(", ")
      : "No specific traits available"

    const prompt = `You are a master battle arena character forge. Your job is to analyze an NFT and create an epic battle fighter based on its traits and essence.

NFT DETAILS:
Name: ${nft.name}
Collection: ${nft.collectionName}
Description: ${nft.description || "No description"}
Traits: ${traitsText}

Based on these NFT traits and essence, forge a unique battle fighter. The rarer or more powerful the traits, the stronger the fighter. Be creative — use the NFT's visual identity, lore, and traits to create a fighter that feels authentic to the NFT.

Respond in this EXACT JSON format with no extra text:
{
  "fighterName": "<epic battle name derived from the NFT, 2-4 words>",
  "class": "<one of: Warrior, Mage, Assassin, Tank, Berserker, Summoner, Phantom, Dragon Knight>",
  "lore": "<2-3 sentence backstory that connects the NFT's traits to the fighter's origin and purpose>",
  "powers": [
    "<Power 1 name>: <1 sentence description of what it does in battle>",
    "<Power 2 name>: <1 sentence description>",
    "<Power 3 name>: <1 sentence description>"
  ],
  "skills": [
    "<Skill 1 name>: <1 sentence description>",
    "<Skill 2 name>: <1 sentence description>",
    "<Skill 3 name>: <1 sentence description>"
  ],
  "stats": {
    "health": <number between 60-150, higher for tank/warrior traits>,
    "attack": <number between 40-100, higher for aggressive traits>,
    "defense": <number between 30-100, higher for armor/shield traits>,
    "speed": <number between 30-100, higher for agile/ninja traits>
  },
  "element": "<primary element: Fire, Ice, Lightning, Shadow, Light, Earth, Wind, Void>",
  "rarity": "<Common, Rare, Ultra Rare, or Legendary — based on NFT trait rarity>",
  "battleCry": "<A short epic battle cry or motto for this fighter, max 8 words>"
}`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 1024
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const groqData  = await response.json()
    const rawContent = groqData.choices?.[0]?.message?.content
    if (!rawContent) throw new Error("No response from Groq")

    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const fighter  = JSON.parse(cleaned)

    return NextResponse.json({ success: true, fighter })
  } catch (err: any) {
    console.error("Forge fighter error:", err)
    return NextResponse.json({ error: err.message || "Failed to forge fighter" }, { status: 500 })
  }
}