import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return new Response(
      "Discord OAuth is not configured. Set DISCORD_CLIENT_ID in your environment.",
      { status: 500 }
    )
  }

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    prompt: "consent",
  })

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`)
}
