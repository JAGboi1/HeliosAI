import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const TWITTER_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest()
}

export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID
  if (!clientId) {
    return new Response(
      "Twitter OAuth is not configured. Set TWITTER_CLIENT_ID in your environment.",
      { status: 500 }
    )
  }

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/twitter/callback`
  const state = base64UrlEncode(crypto.randomBytes(16))
  const codeVerifier = base64UrlEncode(crypto.randomBytes(64))
  const codeChallenge = base64UrlEncode(sha256(codeVerifier))

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  })

  const response = NextResponse.redirect(`${TWITTER_AUTHORIZE_URL}?${params.toString()}`)
  response.cookies.set("twitter_oauth_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  })
  response.cookies.set("twitter_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  })

  return response
}
