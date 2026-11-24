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

describe('snapshots', () => {
  it('takes one automatic snapshot per day before the first edit', async () => {
    await store.init(factory)
    const id = store.selectDocList(store.getState())[0].id
    store.update(id, (d) => {
      d.profile.name = 'A'
    })
    store.update(id, (d) => {
      d.profile.name = 'B'
    })
    await new Promise((r) => setTimeout(r, 30))
    const list = await store.listSnapshots(id)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ auto: true, label: '自动保存' })
    expect(list[0].doc.profile.name).toBe('林小明')
  })

  it('saves, restores (undoably) and deletes snapshots', async () => {
    await store.init(factory)
    const id = store.selectDocList(store.getState())[0].id
    await store.saveSnapshot(id, '投字节版')
    store.update(id, (d) => {
      d.profile.name = '改过了'
    })
    const [manual] = (await store.listSnapshots(id)).filter((s) => !s.auto)
    expect(manual.label).toBe('投字节版')
    await store.restoreSnapshot(id, manual)
    expect(store.getState().docs[id].profile.name).toBe('林小明')
    expect(store.getState().docs[id].id).toBe(id)
    const labels = (await store.listSnapshots(id)).map((s) => s.label)
    expect(labels).toContain('恢复前的版本')
    store.undo(id)
    expect(store.getState().docs[id].profile.name).toBe('改过了')
    await store.deleteSnapshot(id, manual.id)
    expect(
      (await store.listSnapshots(id)).some((s) => s.id === manual.id)
    ).toBe(false)
  })

  it('migrates 2.x histories along with documents', async () => {
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
            histories: {
              old: {
                snapshots: [
                  {
                    id: 's1',
                    label: '投递版',
                    version: '1.1.0',
                    createdAt: '2025-01-01T00:00:00.000Z',
                    document: {
                      data: {
                        ...legacyData,
                        personal: { ...legacyData.personal, name: '旧名字' },
                      },
                      appearance: {},
                    },
                  },
                ],
              },
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
    await store.init(factory)
    const [snap] = await store.listSnapshots('old')
    expect(snap).toMatchObject({
      id: 's1',
      label: '投递版 · v1.1.0',
      auto: false,
    })
    expect(snap.doc.profile.name).toBe('旧名字')
  })

  it('remaps snapshot ids when imported docs collide', async () => {
    await store.init(factory)
    const [doc] = store.selectDocList(store.getState())
    const added = await store.importResult({
      source: 'v2-workspace',
      docs: [structuredClone(doc)],
      snapshots: [
        {
          id: 'x',
          docId: doc.id,
          label: 'L',
          auto: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          doc,
        },
      ],
    })
    expect(added[0].id).not.toBe(doc.id)
    const snaps = await store.listSnapshots(added[0].id)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].doc.id).toBe(added[0].id)
  })
})

describe('derive', () => {
  beforeEach(async () => {
    store.__reset()
    await store.init(new IDBFactory())
  })
  it('复制内容并记录来源与目标岗位', () => {
    const base = Object.values(store.getState().docs)[0]
    const copy = store.derive(base.id, {
      company: '字节跳动',
      role: '前端工程师',
    })
    expect(copy?.id).not.toBe(base.id)
    expect(copy?.name).toBe(`${base.name} · 字节跳动`)
    expect(copy?.target).toEqual({
      baseId: base.id,
      company: '字节跳动',
      role: '前端工程师',
      jd: '',
    })
    expect(copy?.sections.length).toBe(base.sections.length)
    expect(store.getState().docs[base.id].target).toBeUndefined()
  })
})

describe('setTarget', () => {
  beforeEach(async () => {
    store.__reset()
    await store.init(new IDBFactory())
  })
  it('派生版名称跟随公司变化，手动改名后不再跟随', async () => {
    const { actions } = await import('../editor/actions')
    const base = Object.values(store.getState().docs)[0]
    const copy = store.derive(base.id) as NonNullable<
      ReturnType<typeof store.derive>
    >
    const a = actions(copy.id)
    a.setTarget({ company: '星图' })
    expect(store.getState().docs[copy.id].name).toBe(`${base.name} · 星图`)
    a.setTarget({ company: '星图科技' })
    expect(store.getState().docs[copy.id].name).toBe(`${base.name} · 星图科技`)
    a.rename('我的投递')
    a.setTarget({ company: '别家' })
    expect(store.getState().docs[copy.id].name).toBe('我的投递')
  })
})
