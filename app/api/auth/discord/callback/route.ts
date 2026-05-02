import { NextRequest } from "next/server"

function renderHtml(message: string) {
  return `<!doctype html><html><body><div style="font-family:system-ui, sans-serif;color:#ccc; background:#06060f; height:100vh; display:flex; align-items:center; justify-content:center;"><div style="max-width:480px;text-align:center;"><p>${message}</p></div><script>window.close()</script></div></body></html>`
}

function renderPostMessage(handle: string) {
  const safeHandle = JSON.stringify(handle)
  return `<!doctype html><html><body><script>
    if (window.opener) {
      window.opener.postMessage({ source: 'social-oauth', provider: 'discord', handle: ${safeHandle} }, window.location.origin)
    }
    window.close()
  </script><p style="font-family:system-ui, sans-serif;color:#ccc; background:#06060f; height:100vh; display:flex; align-items:center; justify-content:center;">Connected Discord. You may close this window.</p></body></html>`
}

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response(renderHtml("Discord OAuth is not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  if (!code) {
    return new Response(renderHtml("Discord login failed or no code was returned."), {
      status: 400,
      headers: { "content-type": "text/html" },
    })
  }

  const origin = url.origin
  const redirectUri = `${origin}/api/auth/discord/callback`
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: "identify",
    }).toString(),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    return new Response(renderHtml(`Discord token exchange failed: ${errorText}`), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    return new Response(renderHtml("Discord did not return an access token."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const profileResponse = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text()
    return new Response(renderHtml(`Failed to fetch Discord profile: ${errorText}`), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const profileData = await profileResponse.json()
  const username = profileData?.username
  const discriminator = profileData?.discriminator
  if (!username || !discriminator) {
    return new Response(renderHtml("Unable to read Discord username."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  return new Response(renderPostMessage(`${username}#${discriminator}`), {
    headers: { "content-type": "text/html" },
  })
}
