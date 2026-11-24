import { useSyncExternalStore } from 'react'
import { defineMessages, getLang, type Lang, tr } from '../i18n'
import { type ImportResult, importAny } from '../migrate'
import { createDoc, duplicateDoc } from '../model/defaults'
import { uid } from '../model/ids'
import type { ResumeDoc, Snapshot, Target } from '../model/types'
import type { MergePlan, SyncData } from '../sync/merge'
import type { Theme } from '../theme/types'
import { type Database, openDatabase, readLegacyWorkspace } from './db'

const M = defineMessages(
  {
    tailored: '定制',
    manual: '手动保存',
    auto: '自动保存',
    beforeRestore: '恢复前的版本',
    beforeSync: '同步覆盖前的本机版本',
  },
  {
    tailored: 'Tailored',
    manual: 'Manual save',
    auto: 'Auto-save',
    beforeRestore: 'Before restore',
    beforeSync: 'Local version before sync',
  }
)

/** 派生版名称的默认后缀（未填公司 / 岗位时）：各语言版本 */
export const TAILORED_SUFFIX: Record<Lang, string> = {
  zh: M.zh.tailored,
  en: M.en.tailored,
}

/** 派生版名称后缀：公司 / 岗位，都没有时按界面语言取默认词 */
export const derivedSuffix = (t?: Partial<Target>) =>
  t?.company || t?.role || tr(M).tailored

export type SaveState = 'saved' | 'pending' | 'error'

export interface AppState {
  status: 'loading' | 'ready' | 'error'
  error?: string
  docs: Record<string, ResumeDoc>
  save: SaveState
  /** 本次启动从 2.x 导入的简历数量 */
  migrated: number
  themes: Theme[]
  history: Record<string, { undo: number; redo: number }>
  /** 每份简历的快照列表版本号：变化时界面重新读取 */
  snapshots: Record<string, number>
}

let state: AppState = {
  status: 'loading',
  docs: {},
  save: 'saved',
  migrated: 0,
  themes: [],
  history: {},
  snapshots: {},
}
const listeners = new Set<() => void>()
const set = (patch: Partial<AppState>) => {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}
export const getState = () => state
export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

let listCache: { docs: AppState['docs']; list: ResumeDoc[] } | null = null
/** 按最近修改排序的简历列表（结果被缓存，可直接用作选择器） */
export const selectDocList = (s: AppState): ResumeDoc[] => {
  if (listCache?.docs !== s.docs) {
    listCache = {
      docs: s.docs,
      list: Object.values(s.docs).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
    }
  }
  return listCache.list
}

// —— 持久化 ——————————————————————————————————————————————

let db: Database | null = null
const dirty = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined
const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('iresume-v3')
    : null

async function flush() {
  clearTimeout(timer)
  pendingSince = 0
  if (!db || dirty.size === 0) return
  const ids = [...dirty]
  dirty.clear()
  const docs = ids.map((id) => state.docs[id]).filter(Boolean)
  try {
    await db.putDocs(docs)
    if (dirty.size === 0) set({ save: 'saved' })
    channel?.postMessage({ type: 'put', ids })
  } catch (error) {
    for (const id of ids) dirty.add(id)
    set({ save: 'error', error: String(error) })
  }
}
export const flushNow = flush

/** 停止输入 400ms 后保存；持续输入时最多每 2 秒保存一次 */
const SAVE_DELAY = 400
const SAVE_MAX_WAIT = 2000
let pendingSince = 0

function persist(id: string) {
  dirty.add(id)
  if (state.save !== 'pending') set({ save: 'pending' })
  clearTimeout(timer)
  const now = Date.now()
  if (!pendingSince) pendingSince = now
  const wait = Math.min(SAVE_DELAY, SAVE_MAX_WAIT - (now - pendingSince))
  timer = setTimeout(flush, Math.max(0, wait))
}

channel?.addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data as { type: 'put' | 'delete'; ids: string[] }
  if (!db) return
  const docs = { ...state.docs }
  for (const id of msg.ids) {
    if (dirty.has(id)) continue
    if (msg.type === 'delete') delete docs[id]
    else {
      const doc = await db.getDoc(id)
      if (doc) docs[id] = doc
    }
  }
  set({ docs })
})

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
}

// —— 启动 ——————————————————————————————————————————————————

export async function init(factory?: IDBFactory) {
  try {
    db = openDatabase(factory)
    let docs = await db.allDocs()
    let migrated = 0
    if (docs.length === 0 && !(await db.getKv<boolean>('legacy-checked'))) {
      const legacy = await readLegacyWorkspace(factory).catch(() => undefined)
      if (legacy) {
        try {
          const result = importAny(legacy)
          docs = result.docs
          migrated = docs.length
          if (result.snapshots?.length) await db.putSnapshots(result.snapshots)
        } catch {
          /* 旧数据无法识别：保持原样，不影响启动 */
        }
      }
      if (docs.length === 0)
        docs = [createDoc({ sample: true, locale: getLang() })]
      await db.putDocs(docs)
      await db.setKv('legacy-checked', true)
    }
    const themes = (await db.getKv<Theme[]>('themes')) ?? []
    tombstones = (await db.getKv<Record<string, string>>('tombstones')) ?? {}
    set({
      status: 'ready',
      docs: Object.fromEntries(docs.map((d) => [d.id, d])),
      migrated,
      themes,
    })
  } catch (error) {
    set({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// —— 文档操作 ——————————————————————————————————————————————

interface Hist {
  past: ResumeDoc[]
  future: ResumeDoc[]
  key?: string
  at: number
}
const histories = new Map<string, Hist>()
const LIMIT = 200
const COALESCE_MS = 800

function syncHistory(id: string) {
  const h = histories.get(id)
  set({
    history: {
      ...state.history,
      [id]: { undo: h?.past.length ?? 0, redo: h?.future.length ?? 0 },
    },
  })
}

function replace(doc: ResumeDoc) {
  set({ docs: { ...state.docs, [doc.id]: doc } })
  persist(doc.id)
}

/**
 * 修改一份简历。recipe 直接修改草稿即可。
 * 同一 coalesce key 在短时间内的连续修改合并为一步撤销。
 */
export function update(
  id: string,
  recipe: (draft: ResumeDoc) => void,
  coalesce?: string
) {
  const current = state.docs[id]
  if (!current) return
  const draft = structuredClone(current)
  recipe(draft)
  draft.updatedAt = new Date().toISOString()

  if (!autoChecked.has(id)) {
    autoChecked.add(id)
    void autoSnapshot(current)
  }

  const h = histories.get(id) ?? { past: [], future: [], at: 0 }
  const now = Date.now()
  const merge =
    coalesce !== undefined && h.key === coalesce && now - h.at < COALESCE_MS
  if (!merge) {
    h.past.push(current)
    if (h.past.length > LIMIT) h.past.shift()
  }
  h.future = []
  h.key = coalesce
  h.at = now
  histories.set(id, h)
  replace(draft)
  syncHistory(id)
}

function step(id: string, from: 'past' | 'future') {
  const h = histories.get(id)
  const current = state.docs[id]
  const target = h?.[from].pop()
  if (!h || !target || !current) return false
  ;(from === 'past' ? h.future : h.past).push(current)
  h.key = undefined
  replace({ ...target, updatedAt: new Date().toISOString() })
  syncHistory(id)
  return true
}
export const undo = (id: string) => step(id, 'past')
export const redo = (id: string) => step(id, 'future')

export function addDocs(docs: ResumeDoc[]): ResumeDoc[] {
  const now = new Date().toISOString()
  const added = docs.map((doc) => {
    if (state.docs[doc.id]) return { ...doc, id: uid('r') }
    // 撤销删除：清掉墓碑，并让它比删除更新，同步时才不会再被删掉
    if (tombstones[doc.id]) {
      // 同一毫秒内删除又撤销时也要严格更新（合并时时间相同按删除处理）
      const at = Math.max(
        Date.parse(now),
        Date.parse(tombstones[doc.id]) + 1,
        Date.parse(doc.updatedAt) + 1
      )
      delete tombstones[doc.id]
      saveTombstones()
      return { ...doc, updatedAt: new Date(at).toISOString() }
    }
    return doc
  })
  set({
    docs: { ...state.docs, ...Object.fromEntries(added.map((d) => [d.id, d])) },
  })
  for (const d of added) persist(d.id)
  return added
}

export function duplicate(id: string): ResumeDoc | undefined {
  const doc = state.docs[id]
  if (!doc) return
  return addDocs([duplicateDoc(doc)])[0]
}

/** 派生一份岗位定制版：内容完整复制，并记住来源 */
export function derive(
  id: string,
  target: Partial<Omit<Target, 'baseId'>> = {}
): ResumeDoc | undefined {
  const doc = state.docs[id]
  if (!doc) return
  const t = { role: '', company: '', jd: '', ...target, baseId: id }
  const copy = duplicateDoc(doc, `${doc.name} · ${derivedSuffix(t)}`)
  copy.target = t
  return addDocs([copy])[0]
}

export async function remove(id: string) {
  const docs = { ...state.docs }
  delete docs[id]
  dirty.delete(id)
  histories.delete(id)
  set({ docs })
  tombstones[id] = new Date().toISOString()
  saveTombstones()
  await db?.deleteDoc(id)
  const snaps = (await db?.listSnapshots(id)) ?? []
  if (snaps.length) await db?.deleteSnapshots(snaps.map((x) => x.id))
  channel?.postMessage({ type: 'delete', ids: [id] })
}

/** 导入一批简历（及其历史版本）；id 冲突时自动换新 id，快照随之对应 */
export async function importResult(result: ImportResult): Promise<ResumeDoc[]> {
  const added = addDocs(result.docs)
  const map = new Map(result.docs.map((d, i) => [d.id, added[i].id]))
  const snaps = (result.snapshots ?? [])
    .filter((x) => map.has(x.docId))
    .map((x) => {
      const docId = map.get(x.docId) as string
      return { ...x, id: uid('v'), docId, doc: { ...x.doc, id: docId } }
    })
  if (snaps.length) await db?.putSnapshots(snaps)
  return added
}

// —— 版本快照 ——————————————————————————————————————————————

export const AUTO_KEEP = 20
const autoChecked = new Set<string>()
const bumpSnapshots = (docId: string) =>
  set({
    snapshots: {
      ...state.snapshots,
      [docId]: (state.snapshots[docId] ?? 0) + 1,
    },
  })

export async function listSnapshots(docId: string): Promise<Snapshot[]> {
  return (await db?.listSnapshots(docId)) ?? []
}

export async function saveSnapshot(docId: string, label: string, auto = false) {
  const doc = state.docs[docId]
  if (!db || !doc) return
  await db.putSnapshots([
    {
      id: uid('v'),
      docId,
      label: label.trim() || tr(M).manual,
      auto,
      createdAt: new Date().toISOString(),
      doc,
    },
  ])
  await pruneAuto(docId)
  bumpSnapshots(docId)
}

async function pruneAuto(docId: string) {
  const autos = (await db?.listSnapshots(docId))?.filter((x) => x.auto) ?? []
  if (autos.length > AUTO_KEEP)
    await db?.deleteSnapshots(autos.slice(AUTO_KEEP).map((x) => x.id))
}

/** 每份简历每天第一次编辑前自动留一份底 */
async function autoSnapshot(before: ResumeDoc) {
  if (!db) return
  const list = await db.listSnapshots(before.id)
  const today = new Date().toDateString()
  if (
    list.some((x) => x.auto && new Date(x.createdAt).toDateString() === today)
  )
    return
  await db.putSnapshots([
    {
      id: uid('v'),
      docId: before.id,
      label: tr(M).auto,
      auto: true,
      createdAt: new Date().toISOString(),
      doc: before,
    },
  ])
  await pruneAuto(before.id)
  bumpSnapshots(before.id)
}

export async function deleteSnapshot(docId: string, id: string) {
  await db?.deleteSnapshots([id])
  bumpSnapshots(docId)
}

/** 恢复快照：先保存当前版本，再整体替换内容（可撤销） */
export async function restoreSnapshot(docId: string, snapshot: Snapshot) {
  await saveSnapshot(docId, tr(M).beforeRestore, true)
  update(docId, (d) => {
    const { id, createdAt } = d
    Object.assign(d, structuredClone(snapshot.doc), { id, createdAt })
  })
}

// —— 同步 ——————————————————————————————————————————————————

/** 已删除简历的 id → 删除时间，用于把删除同步到其他设备 */
let tombstones: Record<string, string> = {}
const saveTombstones = () => void db?.setKv('tombstones', tombstones)

export const kvGet = async <T>(key: string) => db?.getKv<T>(key)
export const kvSet = async (key: string, value: unknown) =>
  db?.setKv(key, value)

/** 本机当前的全部可同步数据（先落盘未保存的修改） */
export async function localSyncData(): Promise<SyncData> {
  await flush()
  return {
    docs: Object.values(state.docs),
    themes: state.themes,
    tombstones: { ...tombstones },
  }
}

/**
 * 把同步结果落到本机：被覆盖的本机版本先存快照；
 * 同步期间用户又改过的简历保持不动，留给下一次同步。
 */
export async function applySync(plan: MergePlan) {
  if (!db) return
  const docs = { ...state.docs }
  const put: ResumeDoc[] = []
  for (const doc of plan.put) {
    const cur = docs[doc.id]
    if (cur && cur.updatedAt > doc.updatedAt) continue
    put.push(doc)
    docs[doc.id] = doc
  }
  const removed: string[] = []
  for (const id of plan.remove) {
    const cur = docs[id]
    const dead = plan.result.tombstones[id]
    if (cur && dead && cur.updatedAt > dead) continue
    removed.push(id)
    delete docs[id]
    histories.delete(id)
  }
  const kept = new Set(put.map((d) => d.id))
  const snaps = plan.overwritten
    .filter((d) => kept.has(d.id))
    .map((d) => ({
      id: uid('v'),
      docId: d.id,
      label: tr(M).beforeSync,
      auto: true,
      createdAt: new Date().toISOString(),
      doc: d,
    }))
  if (snaps.length) await db.putSnapshots(snaps)
  if (put.length) await db.putDocs(put)
  for (const id of removed) await db.deleteDoc(id)
  tombstones = { ...plan.result.tombstones }
  saveTombstones()
  if (put.length || removed.length) {
    set({ docs })
    channel?.postMessage({ type: 'put', ids: put.map((d) => d.id) })
    if (removed.length) channel?.postMessage({ type: 'delete', ids: removed })
  }
  for (const s of snaps) bumpSnapshots(s.docId)
  if (plan.themesChanged) saveThemes(plan.result.themes)
  return { put: put.length, removed: removed.length }
}

export function saveThemes(themes: Theme[]) {
  set({ themes })
  void db?.setKv('themes', themes)
}

/** 仅供测试：重置模块状态 */
export function __reset() {
  clearTimeout(timer)
  pendingSince = 0
  dirty.clear()
  histories.clear()
  db = null
  listCache = null
  autoChecked.clear()
  tombstones = {}
  state = {
    status: 'loading',
    docs: {},
    save: 'saved',
    migrated: 0,
    themes: [],
    history: {},
    snapshots: {},
  }
}
