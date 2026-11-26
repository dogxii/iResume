import { describe, expect, it } from 'vitest'
import { align } from './align'
import { createDoc, newItem, newSection } from './defaults'
import { computeMarks, wordDiff } from './marks'
import type { ResumeDoc } from './types'

const base = () => createDoc({ sample: true })
const exp = (d: ResumeDoc) =>
  d.sections.find((s) => s.kind === 'experience') ?? d.sections[0]

/** 依次撤回所有标记后，内容应回到基准 */
function revertAll(b: ResumeDoc, c: ResumeDoc) {
  const draft = structuredClone(c)
  for (const m of computeMarks(b, c, 'zh')) m.revert(draft)
  return draft
}
const content = (d: ResumeDoc) => ({
  profile: d.profile,
  sections: d.sections,
})

describe('修改标记', () => {
  it('没有改动时没有标记', () => {
    const b = base()
    expect(computeMarks(b, structuredClone(b), 'zh')).toEqual([])
  })

  it('要点的修改、新增、删除都能定位到纸面并撤回', () => {
    const b = base()
    const c = structuredClone(b)
    const item = exp(c).items[0]
    const [first, second, third] = item.bullets
    item.bullets = [`${first}（改）`, third, '新增的一条']
    const marks = computeMarks(b, c, 'zh')
    const kinds = marks.map((m) => `${m.kind}:${m.label}`)
    expect(kinds).toContain('changed:要点')
    expect(kinds).toContain('added:要点')
    expect(kinds).toContain('removed:要点')
    const changed = marks.find((m) => m.kind === 'changed')
    expect(changed?.anchor.el).toBe(`[data-fkey="${item.id}:b:0"]`)
    expect(changed?.before).toBe(first.replace(/\*\*/g, ''))
    const removed = marks.find((m) => m.kind === 'removed')
    expect(removed?.before).toBe(second.replace(/\*\*/g, ''))
    expect(removed?.anchor.before).toBe(`[data-fkey="${item.id}:b:1"]`)
    expect(content(revertAll(b, c))).toEqual(content(b))
  })

  it('条目与区块的增删可以撤回到原来的位置', () => {
    const b = base()
    const c = structuredClone(b)
    const s = exp(c)
    const gone = s.items.shift()
    s.items.push(newItem({ title: '新公司', bullets: ['做了些事'] }))
    c.sections = c.sections.filter((x) => x.kind !== 'projects')
    c.sections.push(newSection('awards'))
    const marks = computeMarks(b, c, 'zh')
    expect(
      marks.filter((m) => m.kind === 'removed').map((m) => m.label)
    ).toEqual(expect.arrayContaining(['条目', '区块']))
    expect(
      marks.find((m) => m.label === '条目' && m.kind === 'removed')?.before
    ).toBe(gone?.title)
    expect(content(revertAll(b, c))).toEqual(content(b))
  })

  it('挪动条目、区块、联系方式只是换了位置：不算增删，里面的修改照常标出', () => {
    const b = base()
    const c = structuredClone(b)
    exp(c).items.reverse()
    c.sections.reverse()
    c.profile.contacts.reverse()
    exp(c).items[0].title = '改过的公司'
    const marks = computeMarks(b, c, 'zh')
    expect(marks.map((m) => m.kind)).toEqual(['changed'])
    // 撤回只改回文字，不会删掉被挪动的条目
    const draft = revertAll(b, c)
    expect(exp(draft).items).toHaveLength(exp(b).items.length)
    expect(exp(draft).items.map((i) => i.title)).toEqual(
      [...exp(b).items].reverse().map((i) => i.title)
    )
  })

  it('撤回新增的要点时，同样文字的另一条不受影响', () => {
    const b = base()
    const c = structuredClone(b)
    const item = exp(c).items[0]
    item.bullets = ['重复', ...item.bullets, '重复']
    const last = computeMarks(b, c, 'zh').at(-1)
    expect(last).toMatchObject({ kind: 'added', after: '重复' })
    const draft = structuredClone(c)
    last?.revert(draft)
    // 撤回的是最后一条，开头那条还在
    expect(exp(draft).items[0].bullets).toEqual([
      '重复',
      ...exp(b).items[0].bullets,
    ])
  })

  it('字段、联系方式、区块标题的修改', () => {
    const b = base()
    const c = structuredClone(b)
    c.profile.name = '王小雨'
    c.profile.contacts[0].value = '139 0000 0000'
    c.sections[0].title = '关于我'
    exp(c).items[0].end = '2025.06'
    const marks = computeMarks(b, c, 'zh')
    expect(marks.map((m) => m.label)).toEqual(
      expect.arrayContaining(['姓名', '联系方式', '区块标题', '结束时间'])
    )
    expect(marks.find((m) => m.label === '姓名')?.anchor.el).toBe(
      '[data-fkey="profile:name"]'
    )
    expect(content(revertAll(b, c))).toEqual(content(b))
  })

  it('英文界面的标签', () => {
    const b = base()
    const c = structuredClone(b)
    c.profile.headline = 'x'
    expect(computeMarks(b, c, 'en')[0].label).toBe('Headline')
  })
})

describe('改写与替换', () => {
  it('删掉一条、在同一位置写了不相干的一条：一删一增，而不是修改', () => {
    const b = base()
    const c = structuredClone(b)
    const item = exp(c).items[0]
    item.bullets[2] = '推动前端监控体系落地，告警响应缩短到 5 分钟'
    const kinds = computeMarks(b, c, 'zh').map((m) => m.kind)
    expect(kinds.sort()).toEqual(['added', 'removed'])
    expect(content(revertAll(b, c))).toEqual(content(b))
  })
})

describe('对比工具', () => {
  it('align 给出最少的增删', () => {
    expect(align(['a', 'b', 'c'], ['a', 'c', 'd']).map((o) => o.op)).toEqual([
      'eq',
      'del',
      'eq',
      'add',
    ])
  })

  it('wordDiff：中文按字、英文按词', () => {
    expect(wordDiff('首屏提速 60%', '首屏提速 75%')).toEqual([
      { type: 'same', text: '首屏提速 ' },
      { type: 'del', text: '60' },
      { type: 'add', text: '75' },
      { type: 'same', text: '%' },
    ])
    expect(wordDiff('Led the team', 'Led two teams')).toEqual([
      { type: 'same', text: 'Led ' },
      { type: 'del', text: 'the team' },
      { type: 'add', text: 'two teams' },
    ])
  })
})
