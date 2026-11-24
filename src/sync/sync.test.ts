import { describe, expect, it } from 'vitest'
import { createDoc } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { DEFAULT_THEME } from '../theme/presets'
import {
  deriveKey,
  open,
  openLegacy,
  parseEnvelope,
  randomSalt,
  seal,
  toBase64,
  WrongPassphrase,
} from './crypto'
import { probe, syncOnce, verify } from './engine'
import { type Fetch, FILE, gistClient } from './gist'
import { merge, type SyncData } from './merge'

const ITER = 100_000 // 测试用较低迭代次数；正式为 60 万次

/** 内存中的 GitHub Gist API */
function fakeGitHub() {
  const gists = new Map<
    string,
    {
      id: string
      updated_at: string
      files: Record<string, { content: string }>
    }
  >()
  const calls: { method: string; url: string }[] = []
  let n = 0
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status })
  const fetchImpl: Fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url })
    const auth = (init.headers as Record<string, string> | undefined)
      ?.Authorization
    if (auth !== 'Bearer t0ken')
      return json(401, { message: 'Bad credentials' })
    const path = url.replace('https://api.github.com', '')
    if (path === '/user')
      return json(200, { login: 'octo', avatar_url: 'https://avatars/x' })
    if (path.startsWith('/gists?')) return json(200, [...gists.values()])
    if (path === '/gists' && method === 'POST') {
      const body = JSON.parse(String(init.body))
      const g = {
        id: `g${++n}`,
        updated_at: new Date().toISOString(),
        files: body.files,
      }
      gists.set(g.id, g)
      return json(201, g)
    }
    const m = path.match(/^\/gists\/(.+)$/)
    if (m) {
      const id = decodeURIComponent(m[1])
      const g = gists.get(id)
      if (!g) return json(404, { message: 'Not Found' })
      if (method === 'PATCH') {
        const body = JSON.parse(String(init.body))
        Object.assign(g.files, body.files)
        g.updated_at = new Date().toISOString()
      }
      return json(200, g)
    }
    return json(404, { message: 'Not Found' })
  }
  return { gists, calls, fetchImpl }
}

const doc = (id: string, updatedAt: string, name = id): ResumeDoc => ({
  ...createDoc(),
  id,
  name,
  updatedAt,
})
const data = (
  docs: ResumeDoc[],
  tombstones: Record<string, string> = {}
): SyncData => ({
  docs,
  themes: [],
  tombstones,
})

describe('crypto', () => {
  it('加密后能用同一口令解开，密文不含明文', async () => {
    const key = await deriveKey('correct horse', randomSalt(), ITER)
    const sealed = await seal(key, { hello: '林小明' })
    expect(sealed).not.toContain('林小明')
    expect(await open(key, parseEnvelope(sealed))).toEqual({ hello: '林小明' })
  })
  it('错误口令、篡改的 KDF 参数都会被拒绝', async () => {
    const salt = randomSalt()
    const key = await deriveKey('right', salt, ITER)
    const env = parseEnvelope(await seal(key, { a: 1 }))
    await expect(
      open(await deriveKey('wrong', salt, ITER), env)
    ).rejects.toBeInstanceOf(WrongPassphrase)
    const tampered = { ...env, kdf: { ...env.kdf, iterations: ITER + 1 } }
    await expect(
      open({ ...key, iterations: ITER + 1 }, tampered)
    ).rejects.toBeInstanceOf(WrongPassphrase)
  })
  it('拒绝迭代次数过低的信封', async () => {
    const key = await deriveKey('x', randomSalt(), ITER)
    const env = JSON.parse(await seal(key, {}))
    env.kdf.iterations = 1000
    expect(() => parseEnvelope(JSON.stringify(env))).toThrow('格式')
  })
  it('能解开 2.x 的旧信封', async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32))
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
      'encrypt',
    ])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode('{"v":2}')
    )
    const content = JSON.stringify({
      format: 'iresume.gist-sync.v2',
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(data)),
    })
    expect(await openLegacy(content, toBase64(raw))).toEqual({ v: 2 })
  })
})

describe('merge', () => {
  const t = (d: number) => new Date(Date.UTC(2026, 0, d)).toISOString()
  const now = Date.UTC(2026, 0, 30)
  it('各取较新的一方，并标出被覆盖的本机版本', () => {
    const plan = merge(
      data([doc('a', t(2)), doc('b', t(1))]),
      data([doc('a', t(1)), doc('b', t(3)), doc('c', t(1))]),
      now
    )
    expect(plan.result.docs.map((d) => `${d.id}@${d.updatedAt}`)).toEqual([
      `a@${t(2)}`,
      `b@${t(3)}`,
      `c@${t(1)}`,
    ])
    expect(plan.put.map((d) => d.id)).toEqual(['b', 'c'])
    expect(plan.overwritten.map((d) => d.id)).toEqual(['b'])
    expect(plan.pushRemote).toBe(true)
  })
  it('内容一致时什么都不做', () => {
    const plan = merge(data([doc('a', t(2))]), data([doc('a', t(2))]), now)
    expect(plan).toMatchObject({
      put: [],
      remove: [],
      overwritten: [],
      pushRemote: false,
      themesChanged: false,
    })
  })
  it('删除通过墓碑传播；删除后又修改的会复活', () => {
    const del = merge(data([], { a: t(5) }), data([doc('a', t(2))]), now)
    expect(del.result.docs).toEqual([])
    expect(del.result.tombstones).toEqual({ a: t(5) })
    expect(del.pushRemote).toBe(true)
    const remoteDel = merge(data([doc('a', t(2))]), data([], { a: t(5) }), now)
    expect(remoteDel.remove).toEqual(['a'])
    expect(remoteDel.pushRemote).toBe(false)
    const revived = merge(data([doc('a', t(9))]), data([], { a: t(5) }), now)
    expect(revived.result.docs.map((d) => d.id)).toEqual(['a'])
    expect(revived.result.tombstones).toEqual({})
    expect(revived.pushRemote).toBe(true)
  })
  it('过期的墓碑会被清理', () => {
    const plan = merge(
      data([], { a: t(1) }),
      data([], { a: t(1) }),
      Date.UTC(2026, 11, 1)
    )
    expect(plan.result.tombstones).toEqual({})
  })
  it('自定义主题按名称合并，同名以本机为准', () => {
    const mine = { ...DEFAULT_THEME, name: '我的', layout: 'single' as const }
    const theirs = {
      ...DEFAULT_THEME,
      name: '我的',
      layout: 'aside-left' as const,
    }
    const other = {
      ...DEFAULT_THEME,
      name: '别的',
      layout: 'aside-right' as const,
    }
    const plan = merge(
      { ...data([]), themes: [mine] },
      { ...data([]), themes: [theirs, other] },
      now
    )
    expect(plan.result.themes.map((x) => [x.name, x.layout])).toEqual([
      ['我的', 'single'],
      ['别的', other.layout],
    ])
    expect(plan.themesChanged).toBe(true)
    expect(plan.pushRemote).toBe(true)
  })
})

describe('gist client', () => {
  it('读写 Gist，并对 id 做 URL 编码', async () => {
    const gh = fakeGitHub()
    const c = gistClient('t0ken', gh.fetchImpl)
    expect(await c.user()).toEqual({
      login: 'octo',
      avatarUrl: 'https://avatars/x',
    })
    const g = await c.create('hello')
    expect(await c.read(g.id)).toBe('hello')
    expect(await c.find()).toMatchObject({ id: g.id })
    expect(await c.read('../../user')).toBeNull()
    expect(gh.calls.at(-1)?.url).toBe(
      'https://api.github.com/gists/..%2F..%2Fuser'
    )
  })
  it('授权失效给出可读的错误', async () => {
    const gh = fakeGitHub()
    await expect(gistClient('bad', gh.fetchImpl).user()).rejects.toThrow(
      '授权已失效'
    )
  })
})

describe('syncOnce', () => {
  const base = Date.now()
  const day = (n: number) =>
    new Date(base - (10 - n) * 86_400_000).toISOString()
  it('两台设备通过同一个 Gist 同步，云端只有密文', async () => {
    const gh = fakeGitHub()
    const client = gistClient('t0ken', gh.fetchImpl)
    expect(await probe(client)).toBeNull()

    // 设备 A：首次同步，新建 Gist
    const keyA = await deriveKey('口令', randomSalt(), ITER)
    const a1 = await syncOnce(
      client,
      keyA,
      data([doc('a', day(1), '甲的简历')])
    )
    expect(a1.created).toBe(true)
    const stored = [...gh.gists.values()][0].files[FILE].content
    expect(stored).not.toContain('甲的简历')

    // 设备 B：读取 salt，用同一口令加入
    const found = await probe(client)
    expect(found?.gist.id).toBe(a1.gist.id)
    const env = found?.envelope as NonNullable<typeof found>['envelope']
    const keyB = await deriveKey('口令', env.kdf.salt, env.kdf.iterations)
    await expect(
      verify(client, await deriveKey('错的', env.kdf.salt, ITER), a1.gist.id)
    ).rejects.toBeInstanceOf(WrongPassphrase)
    await verify(client, keyB, a1.gist.id)
    const b1 = await syncOnce(
      client,
      keyB,
      data([doc('b', day(2))]),
      a1.gist.id
    )
    expect(b1.plan.put.map((d) => d.id)).toEqual(['a'])
    expect(b1.pushed).toBe(true)

    // 设备 A 删除 a，再同步：B 下次同步时收到删除
    const a2 = await syncOnce(client, keyA, data([], { a: day(3) }), a1.gist.id)
    expect(a2.plan.put.map((d) => d.id)).toEqual(['b'])
    const b2 = await syncOnce(
      client,
      keyB,
      data([doc('a', day(1)), doc('b', day(2))]),
      a1.gist.id
    )
    expect(b2.plan.remove).toEqual(['a'])
    expect(b2.pushed).toBe(false)
  })
  it('记住的 Gist 被删除后会重新创建', async () => {
    const gh = fakeGitHub()
    const client = gistClient('t0ken', gh.fetchImpl)
    const key = await deriveKey('p', randomSalt(), ITER)
    const r = await syncOnce(client, key, data([]), 'gone')
    expect(r.created).toBe(true)
  })
})
