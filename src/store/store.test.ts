import { IDBFactory } from 'fake-indexeddb'
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { legacyData } from '../migrate/__fixtures__/v2-data'
import { openDatabase } from './db'
import * as store from './store'

let factory: IDBFactory
beforeEach(() => {
  store.__reset()
  factory = new IDBFactory()
})

async function seedLegacy() {
  await new Promise<void>((resolve) => {
    const req = factory.open('iresume', 2)
    req.onupgradeneeded = () => req.result.createObjectStore('workspace')
    req.onsuccess = () => {
      const tx = req.result.transaction('workspace', 'readwrite')
      tx.objectStore('workspace').put(
        {
          version: 2,
          library: {
            documents: [{ id: 'old', name: '旧简历', data: legacyData }],
          },
        },
        'current'
      )
      tx.oncomplete = () => {
        req.result.close()
        resolve()
      }
    }
  })
}

describe('store', () => {
  it('creates a sample resume on first run', async () => {
    await store.init(factory)
    const s = store.getState()
    expect(s.status).toBe('ready')
    expect(store.selectDocList(s)).toHaveLength(1)
    expect(s.migrated).toBe(0)
  })

  it('migrates 2.x data once and leaves it untouched', async () => {
    await seedLegacy()
    await store.init(factory)
    const s = store.getState()
    expect(s.migrated).toBe(1)
    expect(s.docs.old.name).toBe('旧简历')

    await store.remove('old')
    store.__reset()
    await store.init(factory)
    expect(store.getState().docs.old).toBeUndefined()
    expect(store.getState().migrated).toBe(0)
  })

  it('updates, coalesces, undoes and persists', async () => {
    await store.init(factory)
    const id = store.selectDocList(store.getState())[0].id
    store.update(
      id,
      (d) => {
        d.profile.name = 'A'
      },
      'name'
    )
    store.update(
      id,
      (d) => {
        d.profile.name = 'AB'
      },
      'name'
    )
    store.update(id, (d) => {
      d.name = 'X'
    })
    expect(store.getState().history[id]).toEqual({ undo: 2, redo: 0 })

    store.undo(id)
    expect(store.getState().docs[id].name).not.toBe('X')
    store.undo(id)
    expect(store.getState().docs[id].profile.name).toBe('林小明')
    store.redo(id)
    expect(store.getState().docs[id].profile.name).toBe('AB')

    await store.flushNow()
    expect(store.getState().save).toBe('saved')
    const saved = await openDatabase(factory).getDoc(id)
    expect(saved?.profile.name).toBe('AB')
  })

  it('duplicates with fresh ids', async () => {
    await store.init(factory)
    const [doc] = store.selectDocList(store.getState())
    const copy = store.duplicate(doc.id)
    expect(copy?.id).not.toBe(doc.id)
    expect(copy?.sections[0].id).not.toBe(doc.sections[0].id)
    expect(store.selectDocList(store.getState())).toHaveLength(2)
  })
})
