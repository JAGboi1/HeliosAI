import { NextRequest, NextResponse } from "next/server"

function renderHtml(message: string) {
  return `<!doctype html><html><body><div style="font-family:system-ui, sans-serif;color:#ccc; background:#06060f; height:100vh; display:flex; align-items:center; justify-content:center;"><div style="max-width:480px;text-align:center;"><p>${message}</p></div><script>window.close()</script></div></body></html>`
}

function renderPostMessage(handle: string) {
  const safeHandle = JSON.stringify(handle)
  return `<!doctype html><html><body><script>
    if (window.opener) {
      window.opener.postMessage({ source: 'social-oauth', provider: 'twitter', handle: ${safeHandle} }, window.location.origin)
    }
    window.close()
  </script><p style="font-family:system-ui, sans-serif;color:#ccc; background:#06060f; height:100vh; display:flex; align-items:center; justify-content:center;">Connected Twitter. You may close this window.</p></body></html>`
}

export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  if (!clientId) {
    return new Response(renderHtml("Twitter OAuth is not configured. Set TWITTER_CLIENT_ID."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const returnedState = url.searchParams.get("state")
  const storedState = req.cookies.get("twitter_oauth_state")?.value
  const codeVerifier = req.cookies.get("twitter_oauth_verifier")?.value

  if (!code || !returnedState || !storedState || returnedState !== storedState || !codeVerifier) {
    return new Response(renderHtml("Twitter login failed or the request expired."), {
      status: 400,
      headers: { "content-type": "text/html" },
    })
  }

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/twitter/callback`
  const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    } as Record<string, string>).toString(),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    return new Response(renderHtml(`Twitter token exchange failed: ${errorText}`), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    return new Response(renderHtml("Twitter did not return an access token."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const profileResponse = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=username",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text()
    return new Response(renderHtml(`Failed to fetch Twitter profile: ${errorText}`), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  const profileData = await profileResponse.json()
  const username = profileData?.data?.username
  if (!username) {
    return new Response(renderHtml("Unable to read Twitter username."), {
      status: 500,
      headers: { "content-type": "text/html" },
    })
  }

  return new Response(renderPostMessage(`@${username}`), {
    headers: { "content-type": "text/html" },
  })
}
