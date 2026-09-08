const readJsonBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body !== 'string') return {}

  try {
    return JSON.parse(request.body)
  } catch {
    return {}
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ message: 'Method not allowed' })
    return
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    response.status(500).json({ message: 'GitHub OAuth is not configured' })
    return
  }

  const body = await readJsonBody(request)
  const code = typeof body.code === 'string' ? body.code : ''
  const redirectUri =
    typeof body.redirectUri === 'string' ? body.redirectUri : ''

  if (!code || !redirectUri) {
    response.status(400).json({ message: 'Missing OAuth code or redirect URI' })
    return
  }

  const tokenResponse = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    }
  )
  const tokenPayload = await tokenResponse.json()

  if (!tokenResponse.ok || tokenPayload.error || !tokenPayload.access_token) {
    response.status(400).json({
      message:
        tokenPayload.error_description ||
        tokenPayload.error ||
        'GitHub OAuth exchange failed',
    })
    return
  }

  response.status(200).json({
    accessToken: tokenPayload.access_token,
    scope: tokenPayload.scope,
    tokenType: tokenPayload.token_type,
  })
}
