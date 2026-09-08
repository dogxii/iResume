const GITHUB_API_VERSION = '2022-11-28'
const SYNC_FILENAME = 'iresume-sync.json'
const SYNC_DESCRIPTION = 'iResume encrypted cloud sync'
const ENVELOPE_FORMAT = 'iresume.gist-sync.v2'

interface EncryptedEnvelope {
  format: typeof ENVELOPE_FORMAT
  algorithm: 'AES-GCM'
  key: 'github-oauth-derived-v1'
  iv: string
  data: string
}

interface GitHubGistFile {
  content?: string
  raw_url?: string
  truncated?: boolean
}

interface GitHubGistResponse {
  id: string
  html_url?: string
  updated_at?: string
  files?: Record<string, GitHubGistFile | undefined>
}

interface GitHubSyncKeyResponse {
  login?: string
  avatarUrl?: string
  syncKey?: string
  message?: string
}

export interface GitHubGistSyncResult {
  gistId: string
  htmlUrl?: string
  updatedAt?: string
}

export interface GitHubSyncKey {
  login: string
  avatarUrl?: string
  syncKey: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const createRandomBytes = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

const importAesKey = async (syncKey: string) => {
  const keyBytes = base64ToBytes(syncKey)
  if (keyBytes.byteLength !== 32) {
    throw new Error('同步密钥无效，请重新连接 GitHub')
  }

  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

const parseEnvelope = (content: string): EncryptedEnvelope => {
  const parsed = JSON.parse(content) as Partial<EncryptedEnvelope>
  if (
    parsed.format !== ENVELOPE_FORMAT ||
    parsed.algorithm !== 'AES-GCM' ||
    parsed.key !== 'github-oauth-derived-v1' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.data !== 'string'
  ) {
    throw new Error('云端数据格式不正确')
  }

  return parsed as EncryptedEnvelope
}

export const encryptCloudSyncData = async (
  payload: unknown,
  syncKey: string
) => {
  const iv = createRandomBytes(12)
  const key = await importAesKey(syncKey)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(JSON.stringify(payload)))
  )
  const envelope: EncryptedEnvelope = {
    format: ENVELOPE_FORMAT,
    algorithm: 'AES-GCM',
    key: 'github-oauth-derived-v1',
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  }

  return JSON.stringify(envelope, null, 2)
}

export const decryptCloudSyncData = async (
  content: string,
  syncKey: string
) => {
  const envelope = parseEnvelope(content)
  const iv = base64ToBytes(envelope.iv)
  const encrypted = base64ToBytes(envelope.data)
  const key = await importAesKey(syncKey)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encrypted)
  )

  return JSON.parse(decoder.decode(decrypted)) as unknown
}

export const getGitHubSyncKey = async (
  token: string
): Promise<GitHubSyncKey> => {
  const response = await fetch('/api/github/sync-key', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const payload = (await response.json()) as GitHubSyncKeyResponse

  if (!response.ok || !payload.syncKey || !payload.login) {
    throw new Error(payload.message || '无法生成 GitHub 同步密钥')
  }

  return {
    login: payload.login,
    avatarUrl:
      typeof payload.avatarUrl === 'string' ? payload.avatarUrl : undefined,
    syncKey: payload.syncKey,
  }
}

const githubHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': GITHUB_API_VERSION,
})

const readGitHubJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message =
      typeof parsed.message === 'string'
        ? parsed.message
        : `GitHub 请求失败 (${response.status})`
    throw new Error(message)
  }

  return parsed as T
}

export const createGitHubSyncGist = async (
  token: string,
  content: string
): Promise<GitHubGistSyncResult> => {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      description: SYNC_DESCRIPTION,
      public: false,
      files: {
        [SYNC_FILENAME]: { content },
      },
    }),
  })
  const gist = await readGitHubJson<GitHubGistResponse>(response)

  return {
    gistId: gist.id,
    htmlUrl: gist.html_url,
    updatedAt: gist.updated_at,
  }
}

export const updateGitHubSyncGist = async (
  token: string,
  gistId: string,
  content: string
): Promise<GitHubGistSyncResult> => {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: githubHeaders(token),
    body: JSON.stringify({
      description: SYNC_DESCRIPTION,
      files: {
        [SYNC_FILENAME]: { content },
      },
    }),
  })
  const gist = await readGitHubJson<GitHubGistResponse>(response)

  return {
    gistId: gist.id,
    htmlUrl: gist.html_url,
    updatedAt: gist.updated_at,
  }
}

export const findGitHubSyncGist = async (
  token: string
): Promise<GitHubGistSyncResult | null> => {
  let page = 1

  while (page <= 3) {
    const response = await fetch(
      `https://api.github.com/gists?per_page=100&page=${page}`,
      { headers: githubHeaders(token) }
    )
    const gists = await readGitHubJson<GitHubGistResponse[]>(response)
    const matched = gists
      .filter((gist) => Boolean(gist.files?.[SYNC_FILENAME]))
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime()
      )[0]

    if (matched) {
      return {
        gistId: matched.id,
        htmlUrl: matched.html_url,
        updatedAt: matched.updated_at,
      }
    }

    if (gists.length < 100) return null
    page += 1
  }

  return null
}

export const readGitHubSyncGist = async (token: string, gistId: string) => {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: githubHeaders(token),
  })
  const gist = await readGitHubJson<GitHubGistResponse>(response)
  const file = gist.files?.[SYNC_FILENAME]
  if (!file) throw new Error('这个 Gist 里没有 iResume 同步文件')
  if (file.content && !file.truncated) return file.content
  if (!file.raw_url) throw new Error('无法读取 Gist 文件内容')

  const rawResponse = await fetch(file.raw_url)
  if (!rawResponse.ok) throw new Error('无法读取 Gist 原始内容')
  return rawResponse.text()
}
