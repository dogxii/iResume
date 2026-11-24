import { describe, expect, it } from 'vitest'
import { createDoc, newItem, newSection } from './defaults'
import { diffDocs } from './diff'

const base = () => createDoc({ sample: true })

describe('diffDocs', () => {
  it('reports nothing for identical docs', () => {
    const a = base()
    expect(diffDocs(a, structuredClone(a))).toEqual([])
  })

  it('pairs edited bullets and lists additions / removals', () => {
    const a = base()
    const b = structuredClone(a)
    const item = b.sections[1].items[0]
    item.bullets[0] = '主导重构，首屏时间降到 0.9s'
    item.bullets.push('新增一条')
    b.sections[1].items[1].bullets.splice(1, 1)
    const changes = diffDocs(a, b)
    expect(changes).toContainEqual(
      expect.objectContaining({
        kind: 'changed',
        what: '要点',
        after: '主导重构，首屏时间降到 0.9s',
      })
    )
    expect(changes).toContainEqual(
      expect.objectContaining({
        kind: 'added',
        what: '要点',
        after: '新增一条',
      })
    )
    expect(changes).toContainEqual(
      expect.objectContaining({
        kind: 'removed',
        what: '要点',
        where: '工作经历 › 云帆网络',
      })
    )
  })

  it('tracks fields, items, sections, order and theme', () => {
    const a = base()
    const b = structuredClone(a)
    b.profile.name = '林大明'
    b.sections[1].items[0].end = '2025.01'
    b.sections[1].items.reverse()
    b.sections[2].items.push(newItem({ title: '新项目' }))
    b.sections.splice(0, 1)
    b.sections.push(newSection('awards'))
    b.theme.color.accent = '#000000'
    const kinds = diffDocs(a, b).map((c) => `${c.kind}:${c.what}`)
    expect(kinds).toEqual(
      expect.arrayContaining([
        'changed:姓名',
        'changed:时间',
        'moved:条目顺序',
        'added:条目',
        'removed:区块',
        'added:区块',
        'changed:主题「清简」的参数',
      ])
    )
  })
})
