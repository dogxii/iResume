import { normalizeDoc } from '../migrate/normalize'
import type { ResumeDoc } from '../model/types'
import { normalizeTheme } from '../theme/normalize'
import type { Theme } from '../theme/types'

/** 同步的完整数据：解密后的 Gist 内容，或本机当前状态 */
export interface SyncData {
  docs: ResumeDoc[]
  themes: Theme[]
  /** 已删除简历的 id → 删除时间 */
  tombstones: Record<string, string>
}

export interface MergePlan {
  /** 合并后的完整数据（应写回云端） */
  result: SyncData
  /** 需要写入本机的简历（新增或被远端更新） */
  put: ResumeDoc[]
  /** 本机将被远端覆盖的旧版本：覆盖前先存快照 */
  overwritten: ResumeDoc[]
  /** 需要从本机删除的简历 id */
  remove: string[]
  /** 本机的自定义主题是否需要更新 */
  themesChanged: boolean
  /** 合并结果与云端不同，需要上传 */
  pushRemote: boolean
}

/** 墓碑保留 180 天，足够让长期离线的设备也收到删除 */
const TOMBSTONE_TTL = 180 * 24 * 3600 * 1000

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** 校验并规范化解密出的云端数据；不认识的内容一律丢弃 */
export function parseSyncData(v: unknown): SyncData {
  if (!isRec(v)) throw new Error('云端数据已损坏')
  const docs = Array.isArray(v.docs)
    ? v.docs.filter(isRec).map((d) => normalizeDoc(d))
    : []
  const themes = Array.isArray(v.themes)
    ? v.themes.filter(isRec).map((t) => normalizeTheme(t))
    : []
  const tombstones: Record<string, string> = {}
  if (isRec(v.tombstones))
    for (const [id, at] of Object.entries(v.tombstones))
      if (typeof at === 'string' && !Number.isNaN(Date.parse(at)))
        tombstones[id] = at
  return { docs, themes, tombstones }
}

const later = (a?: string, b?: string) => (!a ? b : !b ? a : a >= b ? a : b)

/**
 * 合并本机与云端。规则：
 * - 每份简历以 updatedAt 较新的一方为准；
 * - 删除时间不早于最新修改时间的，视为已删除；
 * - 自定义主题按名称取并集，同名以本机为准。
 */
export function merge(
  local: SyncData,
  remote: SyncData,
  now = Date.now()
): MergePlan {
  const L = new Map(local.docs.map((d) => [d.id, d]))
  const R = new Map(remote.docs.map((d) => [d.id, d]))
  const ids = new Set([
    ...L.keys(),
    ...R.keys(),
    ...Object.keys(local.tombstones),
    ...Object.keys(remote.tombstones),
  ])

  const plan: MergePlan = {
    result: { docs: [], themes: [], tombstones: {} },
    put: [],
    overwritten: [],
    remove: [],
    themesChanged: false,
    pushRemote: false,
  }

  for (const id of ids) {
    const l = L.get(id)
    const r = R.get(id)
    const dead = later(local.tombstones[id], remote.tombstones[id])
    const newest = !l ? r : !r ? l : l.updatedAt >= r.updatedAt ? l : r
    if (dead && (!newest || dead >= newest.updatedAt)) {
      if (now - Date.parse(dead) < TOMBSTONE_TTL)
        plan.result.tombstones[id] = dead
      if (l) plan.remove.push(id)
      if (r || remote.tombstones[id] !== dead) plan.pushRemote = true
      continue
    }
    if (!newest) continue
    plan.result.docs.push(newest)
    if (newest === r && l?.updatedAt !== r.updatedAt) {
      plan.put.push(r)
      if (l) plan.overwritten.push(l)
    }
    if (newest !== r && r?.updatedAt !== newest.updatedAt)
      plan.pushRemote = true
    if (remote.tombstones[id]) plan.pushRemote = true
  }

  const themes = new Map(remote.themes.map((t) => [t.name, t]))
  for (const t of local.themes) themes.set(t.name, t)
  plan.result.themes = [...themes.values()]
  const key = (list: Theme[]) =>
    JSON.stringify([...list].sort((a, b) => a.name.localeCompare(b.name)))
  plan.themesChanged = key(plan.result.themes) !== key(local.themes)
  if (key(plan.result.themes) !== key(remote.themes)) plan.pushRemote = true

  plan.result.docs.sort((a, b) => a.id.localeCompare(b.id))
  return plan
}
