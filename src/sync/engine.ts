import { open, parseEnvelope, type SyncKey, seal } from './crypto'
import type { GistClient, GistRef } from './gist'
import { type MergePlan, merge, parseSyncData, type SyncData } from './merge'

export interface SyncOutcome {
  gist: GistRef
  plan: MergePlan
  /** 是否写入了云端 */
  pushed: boolean
  /** 本次是否新建了 Gist */
  created: boolean
}

const payload = (data: SyncData) => ({
  schema: 3,
  exportedAt: new Date().toISOString(),
  ...data,
})

/** 查看云端是否已有同步文件，以及它使用的 KDF 参数（新设备加入时需要） */
export async function probe(client: GistClient, gistId?: string) {
  const gist = gistId ? { id: gistId } : await client.find()
  const content = gist ? await client.read(gist.id) : null
  if (!gist || content === null) return null
  return { gist, envelope: parseEnvelope(content) }
}

/** 用口令解开云端文件，验证口令是否正确 */
export async function verify(client: GistClient, key: SyncKey, gistId: string) {
  const content = await client.read(gistId)
  if (content === null) return
  parseSyncData(await open(key, parseEnvelope(content)))
}

/**
 * 一次完整同步：读取云端 → 解密 → 合并 → 必要时加密上传。
 * 本机的改动由调用方根据返回的 plan 落地。
 */
export async function syncOnce(
  client: GistClient,
  key: SyncKey,
  local: SyncData,
  gistId?: string
): Promise<SyncOutcome> {
  let gist: GistRef | null = gistId ? { id: gistId } : await client.find()
  let content = gist ? await client.read(gist.id) : null
  if (gist && content === null && gistId) {
    // 记住的 Gist 被删了：再找一次，找不到就新建
    gist = await client.find()
    content = gist ? await client.read(gist.id) : null
  }

  if (!gist || content === null) {
    const created = await client.create(await seal(key, payload(local)))
    const plan = merge(local, local)
    return { gist: created, plan, pushed: true, created: true }
  }

  const remote = parseSyncData(await open(key, parseEnvelope(content)))
  const plan = merge(local, remote)
  if (plan.pushRemote) {
    const updated = await client.update(
      gist.id,
      await seal(key, payload(plan.result))
    )
    return { gist: updated, plan, pushed: true, created: false }
  }
  return { gist, plan, pushed: false, created: false }
}
