import { describe, expect, it } from 'vitest'
import { createDoc, newItem, newSection } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { lint } from './index'

function docWith(bullets: string[], patch = {}): ResumeDoc {
  const doc = createDoc({ sample: true })
  doc.sections = [
    newSection('experience', 'zh', {
      items: [
        newItem({
          title: 'A 公司',
          start: '2023.01',
          end: '至今',
          bullets,
          ...patch,
        }),
      ],
    }),
  ]
  return doc
}
const rules = (doc: ResumeDoc) => lint(doc).map((s) => s.rule)

describe('lint', () => {
  it('sample resume is clean', () => {
    expect(lint(createDoc({ sample: true }))).toEqual([])
  })

  it('flags missing numbers and weak verbs', () => {
    const r = rules(docWith(['参与平台开发', '负责联调']))
    expect(r).toContain('quantify')
    expect(r.filter((x) => x === 'weak-verb')).toHaveLength(2)
    expect(rules(docWith(['主导重构，性能提升 3 倍']))).toEqual([])
  })

  it('flags first person but not 自我', () => {
    expect(rules(docWith(['我主导了 3 个项目']))).toContain('first-person')
    expect(rules(docWith(['具备自我驱动力，完成 3 个项目']))).not.toContain(
      'first-person'
    )
  })

  it('flags long, too many, punctuation and dates', () => {
    expect(rules(docWith([`${'很长'.repeat(40)} 1`]))).toContain('long')
    expect(
      rules(docWith(Array.from({ length: 7 }, (_, i) => `完成 ${i}`)))
    ).toContain('too-many')
    expect(rules(docWith(['完成 1。', '完成 2']))).toContain('punctuation')
    expect(rules(docWith(['完成 1'], { start: '' }))).toContain('no-date')
    expect(rules(docWith(['完成 1'], { start: '去年' }))).toContain('bad-date')
  })

  it('checks order and contacts', () => {
    const doc = docWith(['完成 1'])
    doc.sections[0].items.push(
      newItem({ title: 'B', start: '2024.01', bullets: ['完成 2'] })
    )
    expect(rules(doc)).toContain('order')
    doc.profile.contacts = []
    expect(rules(doc)).toContain('contact')
  })

  it('respects dismissals and resurfaces after edits', () => {
    const doc = docWith(['参与开发'])
    const first = lint(doc)
    doc.dismissed = first.map((s) => s.id)
    expect(lint(doc)).toEqual([])
    doc.sections[0].items[0].bullets = ['参与设计']
    expect(lint(doc).length).toBeGreaterThan(0)
  })

  it('skips hidden sections', () => {
    const doc = docWith(['参与开发'])
    doc.sections[0].hidden = true
    expect(rules(doc)).not.toContain('weak-verb')
  })
})
