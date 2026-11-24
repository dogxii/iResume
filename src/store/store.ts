import { useSyncExternalStore } from 'react'
import { type ImportResult, importAny } from '../migrate'
import { createDoc, duplicateDoc } from '../model/defaults'
import { uid } from '../model/ids'
import type { ResumeDoc, Snapshot } from '../model/types'
import type { Theme } from '../theme/types'
import { type Database, openDatabase, readLegacyWorkspace } from './db'

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

function persist(id: string) {
  dirty.add(id)
  if (state.save !== 'pending') set({ save: 'pending' })
  clearTimeout(timer)
  timer = setTimeout(flush, 400)
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
      if (docs.length === 0) docs = [createDoc({ sample: true })]
      await db.putDocs(docs)
      await db.setKv('legacy-checked', true)
    }
    const themes = (await db.getKv<Theme[]>('themes')) ?? []
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
  const added = docs.map((doc) =>
    state.docs[doc.id] ? { ...doc, id: uid('r') } : doc
  )
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

export async function remove(id: string) {
  const docs = { ...state.docs }
  delete docs[id]
  dirty.delete(id)
  histories.delete(id)
  set({ docs })
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
      label: label.trim() || '手动保存',
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
      label: '自动保存',
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
  await saveSnapshot(docId, '恢复前的版本', true)
  update(docId, (d) => {
    const { id, createdAt } = d
    Object.assign(d, structuredClone(snapshot.doc), { id, createdAt })
  })
}

export function saveThemes(themes: Theme[]) {
  set({ themes })
  void db?.setKv('themes', themes)
}

/** 仅供测试：重置模块状态 */
export function __reset() {
  clearTimeout(timer)
  dirty.clear()
  histories.clear()
  db = null
  listCache = null
  autoChecked.clear()
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
