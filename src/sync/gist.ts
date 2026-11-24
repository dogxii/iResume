import { defineMessages, tr } from '../i18n'

/** GitHub Gist 的最小客户端。fetch 可注入，便于测试。 */

export const FILE = 'iresume-sync-v3.json'
export const LEGACY_FILE = 'iresume-sync.json'
const API = 'https://api.github.com'

const M = defineMessages(
  {
    description: 'iResume 加密同步（端到端加密，仅能用你的同步口令解开）',
    unauthorized: 'GitHub 授权已失效，请重新连接',
    rateLimited: 'GitHub 请求过于频繁，请稍后再试',
    failed: (status: number) => `GitHub 请求失败（${status}）`,
    unreadable: '无法读取同步文件',
  },
  {
    description:
      'iResume encrypted sync (end-to-end encrypted; only your sync passphrase can unlock it)',
    unauthorized: 'GitHub authorization expired. Please reconnect.',
    rateLimited: 'Too many GitHub requests. Try again later.',
    failed: (status: number) => `GitHub request failed (${status})`,
    unreadable: 'Couldn’t read the sync file',
  }
)

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export interface GistRef {
  id: string
  url?: string
  updatedAt?: string
}

export interface GitHubUser {
  login: string
  avatarUrl?: string
}

export class GitHubError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface GistFile {
  content?: string
  raw_url?: string
  truncated?: boolean
}
interface Gist {
  id: string
  html_url?: string
  updated_at?: string
  files?: Record<string, GistFile | null | undefined>
}

const ref = (g: Gist): GistRef => ({
  id: g.id,
  url: g.html_url,
  updatedAt: g.updated_at,
})

export function gistClient(
  token: string,
  fetchImpl: Fetch = (i, init) => fetch(i, init)
) {
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await fetchImpl(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    const text = await res.text()
    let body: unknown = {}
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      /* 非 JSON 响应 */
    }
    if (!res.ok) {
      const msg = (body as { message?: string }).message
      const t = tr(M)
      throw new GitHubError(
        res.status === 401
          ? t.unauthorized
          : res.status === 403 && /rate limit/i.test(msg ?? '')
            ? t.rateLimited
            : (msg ?? t.failed(res.status)),
        res.status
      )
    }
    return body as T
  }
  const gistPath = (id: string) => `/gists/${encodeURIComponent(id)}`

  return {
    async user(): Promise<GitHubUser> {
      const u = await call<{ login: string; avatar_url?: string }>('/user')
      return { login: u.login, avatarUrl: u.avatar_url }
    },
    /** 在用户的 Gist 中查找包含指定文件的那个（最近更新的优先） */
    async find(file = FILE): Promise<GistRef | null> {
      for (let page = 1; page <= 5; page++) {
        const list = await call<Gist[]>(`/gists?per_page=100&page=${page}`)
        const hit = list
          .filter((g) => g.files?.[file])
          .sort((a, b) =>
            (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
          )[0]
        if (hit) return ref(hit)
        if (list.length < 100) break
      }
      return null
    },
    /** 读取文件内容；Gist 或文件不存在时返回 null */
    async read(id: string, file = FILE): Promise<string | null> {
      let g: Gist
      try {
        g = await call<Gist>(gistPath(id))
      } catch (e) {
        if (e instanceof GitHubError && e.status === 404) return null
        throw e
      }
      const f = g.files?.[file]
      if (!f) return null
      if (typeof f.content === 'string' && !f.truncated) return f.content
      if (!f.raw_url?.startsWith('https://gist.githubusercontent.com/'))
        throw new Error(tr(M).unreadable)
      const raw = await fetchImpl(f.raw_url)
      if (!raw.ok) throw new GitHubError(tr(M).unreadable, raw.status)
      return raw.text()
    },
    async create(content: string, file = FILE): Promise<GistRef> {
      return ref(
        await call<Gist>('/gists', {
          method: 'POST',
          body: JSON.stringify({
            description: tr(M).description,
            public: false,
            files: { [file]: { content } },
          }),
        })
      )
    },
    async update(id: string, content: string, file = FILE): Promise<GistRef> {
      return ref(
        await call<Gist>(gistPath(id), {
          method: 'PATCH',
          body: JSON.stringify({ files: { [file]: { content } } }),
        })
      )
    },
  }
}

export type GistClient = ReturnType<typeof gistClient>
