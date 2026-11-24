import { useSyncExternalStore } from 'react'
import { importAny } from '../migrate'
import {
  applySync,
  getState,
  importResult,
  kvGet,
  kvSet,
  localSyncData,
  subscribe,
} from '../store/store'
import {
  deriveKey,
  type Envelope,
  openLegacy,
  randomSalt,
  type SyncKey,
  WrongPassphrase,
} from './crypto'
import { probe, syncOnce, verify } from './engine'
import { GitHubError, gistClient, LEGACY_FILE } from './gist'

/**
 * 同步的界面状态与流程：连接 GitHub → 设置 / 输入口令 → 自动同步。
 * 访问令牌与不可导出的密钥只保存在本机 IndexedDB。
 */

/** error：已连接但无法继续（如授权失效），只能重试或断开 */
export type Phase = 'off' | 'busy' | 'needs-key' | 'ready' | 'error'

export interface SyncView {
  phase: Phase
  login?: string
  avatarUrl?: string
  lastSyncAt?: string
  gistUrl?: string
  /** 云端已有同步文件：输入其他设备上设置的口令即可加入 */
  joining: boolean
  /** 发现 2.x 的云端数据 */
  legacy: boolean
  /** 正在用口令派生密钥 / 解锁（此时仍显示口令表单） */
  unlocking: boolean
  message?: string
  messageKind?: 'ok' | 'error'
}

interface Settings {
  token: string
  login: string
  avatarUrl?: string
  gistId?: string
  gistUrl?: string
  lastSyncAt?: string
  key?: SyncKey
  /** 2.x 的旧同步密钥（从旧版本地设置中带过来） */
  legacyKey?: string
}

const KV = 'sync'
const OAUTH_STATE = 'iresume-oauth-state'
const LEGACY_AUTH = 'resume-cloud-sync-auth'
const AUTO_DELAY = 15_000

export const oauthClientId: string | undefined = import.meta.env
  .VITE_GITHUB_OAUTH_CLIENT_ID

let settings: Settings | null = null
let remoteKdf: Envelope['kdf'] | null = null
let view: SyncView = {
  phase: 'off',
  joining: false,
  legacy: false,
  unlocking: false,
}
const listeners = new Set<() => void>()
const emit = (patch: Partial<SyncView>) => {
  view = { ...view, ...patch }
  for (const l of listeners) l()
}
export const useSync = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => view
  )

const save = () => kvSet(KV, settings)
const client = () => gistClient(settings?.token ?? '')
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

function ready(message?: string, messageKind?: SyncView['messageKind']) {
  emit({
    phase: 'ready',
    login: settings?.login,
    avatarUrl: settings?.avatarUrl,
    lastSyncAt: settings?.lastSyncAt,
    gistUrl: settings?.gistUrl,
    message,
    messageKind,
  })
}

// —— 启动 ——————————————————————————————————————————————————

let started = false
export async function initSync() {
  if (started) return
  started = true
  settings = (await kvGet<Settings>(KV)) ?? null
  if (await completeOAuth()) return
  if (!settings) await adoptLegacyAuth()
  if (!settings) return
  if (!settings.key) return void prepareKey()
  ready()
  void syncNow()
  watch()
}

/** 2.x 在 localStorage 中保存过 GitHub 授权：直接沿用，免去重新登录 */
async function adoptLegacyAuth() {
  try {
    const raw = localStorage.getItem(LEGACY_AUTH)
    const old = raw
      ? (JSON.parse(raw) as { accessToken?: string; syncKey?: string })
      : null
    if (!old?.accessToken) return
    await connect(old.accessToken, old.syncKey)
  } catch {
    /* 旧授权不可用：忽略，用户可手动连接 */
  }
}

// —— 连接 ——————————————————————————————————————————————————

export function startOAuth() {
  if (!oauthClientId) return
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE, state)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', oauthClientId)
  url.searchParams.set('redirect_uri', location.origin + location.pathname)
  url.searchParams.set('scope', 'gist')
  url.searchParams.set('state', state)
  location.assign(url.toString())
}

async function completeOAuth(): Promise<boolean> {
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return false
  const expected = sessionStorage.getItem(OAUTH_STATE)
  sessionStorage.removeItem(OAUTH_STATE)
  params.delete('code')
  params.delete('state')
  const qs = params.toString()
  history.replaceState(
    null,
    '',
    `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`
  )
  if (!expected || expected !== state) {
    emit({
      phase: 'off',
      message: 'GitHub 登录校验失败，请重新连接',
      messageKind: 'error',
    })
    return true
  }
  emit({ phase: 'busy', message: '正在连接 GitHub…' })
  try {
    const res = await fetch('/api/github/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: location.origin + location.pathname,
      }),
    })
    const body = (await res.json()) as {
      accessToken?: string
      message?: string
    }
    if (!res.ok || !body.accessToken)
      throw new Error(body.message ?? 'GitHub 登录失败')
    await connect(body.accessToken)
  } catch (e) {
    emit({ phase: 'off', message: errorText(e), messageKind: 'error' })
  }
  return true
}

/** 用访问令牌（OAuth 或手动粘贴）连接 */
export async function connect(token: string, legacyKey?: string) {
  emit({ phase: 'busy', message: '正在验证 GitHub 账号…' })
  try {
    const user = await gistClient(token.trim()).user()
    settings = {
      token: token.trim(),
      login: user.login,
      avatarUrl: user.avatarUrl,
      legacyKey,
    }
    await save()
    await prepareKey()
  } catch (e) {
    settings = null
    emit({ phase: 'off', message: errorText(e), messageKind: 'error' })
  }
}

/** 查看云端是否已有同步文件，决定是「设置新口令」还是「输入已有口令」 */
async function prepareKey() {
  if (!settings) return
  emit({
    phase: 'busy',
    login: settings.login,
    avatarUrl: settings.avatarUrl,
    message: '正在查找云端数据…',
  })
  try {
    const c = client()
    const [found, legacy] = await Promise.all([
      probe(c, settings.gistId),
      c.find(LEGACY_FILE),
    ])
    remoteKdf = found?.envelope.kdf ?? null
    if (found) {
      settings.gistId = found.gist.id
      await save()
    }
    emit({
      phase: 'needs-key',
      joining: !!found,
      legacy: !!legacy,
      message: undefined,
    })
  } catch (e) {
    emit({ phase: 'error', message: errorText(e), messageKind: 'error' })
  }
}

export async function setPassphrase(passphrase: string) {
  if (!settings) return
  emit({ phase: 'busy', unlocking: true, message: '正在生成密钥…（需要几秒）' })
  try {
    const key = remoteKdf
      ? await deriveKey(passphrase, remoteKdf.salt, remoteKdf.iterations)
      : await deriveKey(passphrase, randomSalt())
    if (remoteKdf && settings.gistId)
      await verify(client(), key, settings.gistId)
    settings.key = key
    await save()
    watch()
    emit({ unlocking: false })
    await syncNow()
  } catch (e) {
    emit({
      unlocking: false,
      phase: 'needs-key',
      message:
        e instanceof WrongPassphrase
          ? '口令不正确，请输入你在其他设备上设置的同步口令'
          : errorText(e),
      messageKind: 'error',
    })
  }
}

export async function disconnect() {
  settings = null
  remoteKdf = null
  clearTimeout(timer)
  await kvSet(KV, null)
  emit({
    phase: 'off',
    login: undefined,
    avatarUrl: undefined,
    lastSyncAt: undefined,
    message: undefined,
  })
}

// —— 同步 ——————————————————————————————————————————————————

let running: Promise<void> | null = null
let applying = false

export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null
  })
  return running
}

async function run() {
  const s = settings
  if (!s?.key) return
  if (!navigator.onLine) return ready('当前离线，联网后会自动同步')
  emit({ phase: 'busy', message: '正在同步…' })
  try {
    const outcome = await syncOnce(
      client(),
      s.key,
      await localSyncData(),
      s.gistId
    )
    applying = true
    const applied = await applySync(outcome.plan).finally(() => {
      applying = false
    })
    s.gistId = outcome.gist.id
    s.gistUrl = outcome.gist.url ?? s.gistUrl
    s.lastSyncAt = new Date().toISOString()
    await save()
    const got = (applied?.put ?? 0) + (applied?.removed ?? 0)
    ready(got ? `已从云端收到 ${got} 处更新` : undefined, 'ok')
  } catch (e) {
    if (e instanceof WrongPassphrase) {
      // 云端换了口令（例如在另一台设备重新设置）：需要重新输入
      s.key = undefined
      await save()
      await prepareKey()
      emit({
        message: '云端数据的口令已变化，请重新输入同步口令',
        messageKind: 'error',
      })
      return
    }
    if (e instanceof GitHubError && e.status === 401) {
      emit({ phase: 'error', message: errorText(e), messageKind: 'error' })
      return
    }
    ready(`同步失败：${errorText(e)}`, 'error')
  }
}

// —— 自动同步：本机修改后稍等片刻再同步；回到页面时也同步一次 ——

let timer: ReturnType<typeof setTimeout> | undefined
let watching = false
function watch() {
  if (watching) return
  watching = true
  let docs = getState().docs
  let themes = getState().themes
  subscribe(() => {
    const s = getState()
    if (s.docs === docs && s.themes === themes) return
    docs = s.docs
    themes = s.themes
    if (applying || !settings?.key) return
    clearTimeout(timer)
    timer = setTimeout(() => void syncNow(), AUTO_DELAY)
  })
  window.addEventListener('online', () => {
    if (settings?.key) void syncNow()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !settings?.key) return
    const last = settings.lastSyncAt ? Date.parse(settings.lastSyncAt) : 0
    if (Date.now() - last > 60_000) void syncNow()
  })
}

// —— 2.x 云端数据：一次性导入 ——————————————————————————————

export async function importLegacyCloud() {
  if (!settings) return
  emit({ phase: 'busy', message: '正在读取 2.x 云端数据…' })
  try {
    const c = client()
    const gist = await c.find(LEGACY_FILE)
    const content = gist && (await c.read(gist.id, LEGACY_FILE))
    if (!content) throw new Error('没有找到 2.x 的云端数据')
    let key = settings.legacyKey
    if (!key) {
      const res = await fetch('/api/github/sync-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.token}` },
      })
      const body = (await res.json()) as { syncKey?: string; message?: string }
      if (!res.ok || !body.syncKey)
        throw new Error(body.message ?? '无法取得旧版同步密钥')
      key = body.syncKey
    }
    const added = await importResult(importAny(await openLegacy(content, key)))
    emit({ legacy: false })
    if (settings.key)
      ready(`已导入 ${added.length} 份 2.x 云端简历（旧数据保持不变）`, 'ok')
    else
      emit({
        phase: 'needs-key',
        message: `已导入 ${added.length} 份 2.x 云端简历`,
        messageKind: 'ok',
      })
  } catch (e) {
    emit({
      phase: settings.key ? 'ready' : 'needs-key',
      message: errorText(e),
      messageKind: 'error',
    })
  }
}
