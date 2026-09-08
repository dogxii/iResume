import crypto from 'node:crypto'

const GITHUB_API_VERSION = '2022-11-28'

const readBearerToken = (request) => {
  const authorization = request.headers.authorization || ''
  const [type, token] = authorization.split(' ')
  return type === 'Bearer' && token ? token : ''
}

const toBase64 = (value) => Buffer.from(value).toString('base64')

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ message: 'Method not allowed' })
    return
  }

  const appSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET
  if (!appSecret) {
    response.status(500).json({ message: 'GitHub sync is not configured' })
    return
  }

  const token = readBearerToken(request)
  if (!token) {
    response.status(401).json({ message: 'Missing GitHub token' })
    return
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  })
  const user = await userResponse.json()

  if (!userResponse.ok || !user.id || !user.login) {
    response.status(401).json({ message: 'Unable to verify GitHub account' })
    return
  }

  const syncKey = crypto
    .createHmac('sha256', appSecret)
    .update(`iresume:gist-sync:v1:${user.id}`)
    .digest()

  response.status(200).json({
    login: user.login,
    avatarUrl:
      typeof user.avatar_url === 'string' ? user.avatar_url : undefined,
    syncKey: toBase64(syncKey),
  })
}
