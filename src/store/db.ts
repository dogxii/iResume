import type { ResumeDoc, Snapshot } from '../model/types'

const DB_NAME = 'iresume-v3'
const DB_VERSION = 1
const LEGACY_DB = 'iresume'

const promisify = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 事务被中止'))
  })

export interface Database {
  allDocs(): Promise<ResumeDoc[]>
  getDoc(id: string): Promise<ResumeDoc | undefined>
  putDocs(docs: ResumeDoc[]): Promise<void>
  deleteDoc(id: string): Promise<void>
  listSnapshots(docId: string): Promise<Snapshot[]>
  putSnapshots(snapshots: Snapshot[]): Promise<void>
  deleteSnapshots(ids: string[]): Promise<void>
  getKv<T>(key: string): Promise<T | undefined>
  setKv(key: string, value: unknown): Promise<void>
}

export function openDatabase(factory: IDBFactory = indexedDB): Database {
  let pending: Promise<IDBDatabase> | null = null
  const db = () => {
    pending ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const d = request.result
        if (!d.objectStoreNames.contains('docs'))
          d.createObjectStore('docs', { keyPath: 'id' })
        if (!d.objectStoreNames.contains('snapshots')) {
          d.createObjectStore('snapshots', { keyPath: 'id' }).createIndex(
            'doc',
            'docId'
          )
        }
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        pending = null
        reject(request.error ?? new Error('无法打开本地数据库'))
      }
    })
    return pending
  }
  const store = async (name: string, mode: IDBTransactionMode) => {
    const tx = (await db()).transaction(name, mode)
    return { tx, os: tx.objectStore(name) }
  }

  return {
    async allDocs() {
      const { os } = await store('docs', 'readonly')
      return promisify(os.getAll() as IDBRequest<ResumeDoc[]>)
    },
    async getDoc(id) {
      const { os } = await store('docs', 'readonly')
      return promisify(os.get(id) as IDBRequest<ResumeDoc | undefined>)
    },
    async putDocs(docs) {
      const { tx, os } = await store('docs', 'readwrite')
      for (const doc of docs) os.put(doc)
      await done(tx)
    },
    async deleteDoc(id) {
      const { tx, os } = await store('docs', 'readwrite')
      os.delete(id)
      await done(tx)
    },
    async listSnapshots(docId) {
      const { os } = await store('snapshots', 'readonly')
      const list = await promisify(
        os.index('doc').getAll(docId) as IDBRequest<Snapshot[]>
      )
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async putSnapshots(snapshots) {
      const { tx, os } = await store('snapshots', 'readwrite')
      for (const s of snapshots) os.put(s)
      await done(tx)
    },
    async deleteSnapshots(ids) {
      const { tx, os } = await store('snapshots', 'readwrite')
      for (const id of ids) os.delete(id)
      await done(tx)
    },
    async getKv<T>(key: string) {
      const { os } = await store('kv', 'readonly')
      return promisify(os.get(key) as IDBRequest<T | undefined>)
    },
    async setKv(key, value) {
      const { tx, os } = await store('kv', 'readwrite')
      os.put(value, key)
      await done(tx)
    },
  }
}

/**
 * 只读地取出 iResume 2.x 的工作区数据。
 * 先确认旧库存在，避免 open() 意外创建空库；绝不写入或删除旧数据。
 */
export async function readLegacyWorkspace(
  factory: IDBFactory = indexedDB
): Promise<unknown> {
  if (typeof factory.databases === 'function') {
    const list = await factory.databases()
    if (!list.some((d) => d.name === LEGACY_DB)) return undefined
  }
  const database = await new Promise<IDBDatabase | null>((resolve) => {
    const request = factory.open(LEGACY_DB)
    let created = false
    request.onupgradeneeded = () => {
      created = true
    }
    request.onsuccess = () => {
      if (created) {
        request.result.close()
        factory.deleteDatabase(LEGACY_DB)
        resolve(null)
      } else resolve(request.result)
    }
    request.onerror = () => resolve(null)
  })
  if (!database) return undefined
  try {
    if (!database.objectStoreNames.contains('workspace')) return undefined
    const tx = database.transaction('workspace', 'readonly')
    return await promisify(tx.objectStore('workspace').get('current'))
  } finally {
    database.close()
  }
}
