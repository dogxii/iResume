import { describe, expect, it } from 'vitest'
import { createDoc } from '../model/defaults'
import { legacyData } from './__fixtures__/v2-data'
import { importAny, normalizeDoc, toBundle } from './index'

const legacyDoc = {
  id: 'resume-abc',
  name: '前端岗',
  tags: ['前端', '实习'],
  version: '1.2.0',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
  data: legacyData,
  appearance: {
    templateId: 'elegant',
    accentColor: '#BE123C',
    lineHeight: 1.6,
  },
}

describe('v2 → v3', () => {
  const [doc] = importAny({
    version: 2,
    library: { version: 2, activeId: 'resume-abc', documents: [legacyDoc] },
    histories: {},
  }).docs

  it('keeps document metadata', () => {
    expect(doc).toMatchObject({
      id: 'resume-abc',
      name: '前端岗',
      tags: ['前端', '实习'],
      createdAt: '2025-01-01T00:00:00.000Z',
      schema: 3,
    })
  })

  it('maps profile and contacts', () => {
    expect(doc.profile.name).toBe('林小明')
    expect(doc.profile.headline).toBe('Web 前端工程师')
    expect(doc.profile.contacts.map((c) => [c.kind, c.value])).toEqual([
      ['phone', '138-1234-5678'],
      ['email', 'linxiaoming@email.com'],
      ['location', '江西 南昌'],
      ['github', 'github.com/linxiaoming'],
      ['website', 'linxiaoming.dev'],
      ['text', '5天/周 6个月+'],
    ])
  })

  it('keeps section order and visibility', () => {
    expect(doc.sections.map((s) => [s.kind, s.title, !!s.hidden])).toEqual([
      ['education', '教育背景', false],
      ['experience', '工作经历', false],
      ['projects', '项目经历', false],
      ['skills', '专业技能', false],
      ['summary', '自我评价', false],
      ['awards', '获奖经历', true],
      ['activities', '校园经历', true],
    ])
  })

  it('splits dates and bullets', () => {
    const exp = doc.sections.find((s) => s.kind === 'experience')
    expect(exp?.items[0]).toMatchObject({
      title: '某互联网产品研发部',
      subtitle: '前端实习生',
      start: '2022.07',
      end: '2022.09',
    })
    expect(exp?.items[0].bullets).toHaveLength(2)
    const proj = doc.sections.find((s) => s.kind === 'projects')
    expect(proj?.items[0].links).toEqual([
      'campus-demo.com',
      'github.com/linxiaoming/campus-service',
    ])
    expect(proj?.items[0].tags).toBe('Vue 3, TypeScript, Vite')
  })

  it('turns unlabeled skills into a bullet list', () => {
    const skills = doc.sections.find((s) => s.kind === 'skills')
    expect(skills?.layout).toBe('text')
    expect(skills?.items[0].bullets).toHaveLength(4)
  })

  it('maps appearance to a theme', () => {
    expect(doc.theme.preset).toBe('editorial')
    expect(doc.theme.color.accent).toBe('#be123c')
    expect(doc.theme.font.leading).toBe(1.6)
  })

  it('converts labelled and legacy object skills to rows', () => {
    const rows = importAny({
      ...legacyData,
      skills: [{ id: 1, label: '语言', content: 'TS\nGo' }],
    }).docs[0]
    const s = rows.sections.find((x) => x.kind === 'skills')
    expect(s?.layout).toBe('rows')
    expect(s?.items[0]).toMatchObject({ title: '语言', text: 'TS；Go' })
    const old = importAny({ personal: {}, skills: { core: 'HTML' } }).docs[0]
    expect(old.sections.find((x) => x.kind === 'skills')?.items[0].title).toBe(
      '核心能力'
    )
  })

  it('imports v2 json backups and custom sections', () => {
    const { source, docs } = importAny({
      version: 8,
      data: {
        ...legacyData,
        sectionOrder: [...legacyData.sectionOrder, 'custom-1'],
        customSections: [
          { id: 'custom-1', title: '开源', content: '- A\n- B' },
        ],
      },
      appearance: { templateId: 'timeline' },
    })
    expect(source).toBe('v2-backup')
    const custom = docs[0].sections.find((s) => s.kind === 'custom')
    expect(custom).toMatchObject({ title: '开源', layout: 'text' })
    expect(custom?.items[0].bullets).toEqual(['A', 'B'])
    expect(docs[0].theme.preset).toBe('timeline')
  })
})

describe('v3', () => {
  it('round-trips a bundle', () => {
    const doc = createDoc({ sample: true })
    const { source, docs } = importAny(
      JSON.parse(JSON.stringify(toBundle([doc])))
    )
    expect(source).toBe('v3-bundle')
    expect(docs[0]).toEqual(doc)
  })

  it('repairs duplicate ids and missing fields', () => {
    const doc = normalizeDoc({
      schema: 3,
      sections: [
        { id: 'a', kind: 'experience', items: [{ id: 'x' }, { id: 'x' }] },
        { id: 'a', kind: 'weird', layout: 'rows' },
      ],
    })
    expect(doc.sections[0].id).not.toBe(doc.sections[1].id)
    expect(doc.sections[0].items[0].id).not.toBe(doc.sections[0].items[1].id)
    expect(doc.sections[1]).toMatchObject({
      kind: 'custom',
      layout: 'rows',
      items: [],
    })
    expect(doc.name).toBe('未命名简历')
  })

  it('refuses unknown data instead of returning defaults', () => {
    expect(() => importAny({ hello: 1 })).toThrow()
    expect(() => importAny('x')).toThrow()
  })
})
