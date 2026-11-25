import { describe, expect, it } from 'vitest'
import { importAny } from '../migrate'
import { createDoc, newItem, newSection } from '../model/defaults'
import {
  fromIsoDate,
  fromJsonResume,
  toIsoDate,
  toJsonResume,
} from './jsonresume'
import { toMarkdown, toPlainText } from './markdown'

const sample = () => createDoc({ sample: true })

describe('markdown & text', () => {
  it('renders markdown with headings, links and bullets', () => {
    const md = toMarkdown(sample())
    expect(md).toMatch(/^# 林小明\n\n前端工程师 · 3 年经验\n/)
    expect(md).toContain(
      '[linxiaoming@email.com](mailto:linxiaoming@email.com)'
    )
    expect(md).toContain('## 工作经历')
    expect(md).toContain('### 星图科技 · 前端工程师 · 数据平台部 · 上海')
    expect(md).toContain('*2023.07 – 至今*')
    expect(md).toContain('- 主导数据看板重构，首屏时间从 **3.2s 降到 1.1s**')
    expect(md).toContain('- **语言**：TypeScript')
    expect(md).not.toMatch(/\n{3,}/)
  })

  it('skips hidden and empty content', () => {
    const doc = sample()
    doc.sections[1].hidden = true
    doc.sections.push(newSection('awards'))
    const md = toMarkdown(doc)
    expect(md).not.toContain('工作经历')
    expect(md).not.toContain('荣誉奖项')
  })

  it('renders plain text without markup', () => {
    const txt = toPlainText(sample())
    expect(txt).toContain('林小明 | 前端工程师 · 3 年经验')
    expect(txt).toContain(
      '星图科技 | 前端工程师 · 数据平台部 | 上海 | 2023.07 – 至今'
    )
    expect(txt).toContain('• 主导数据看板重构，首屏时间从 3.2s 降到 1.1s')
    expect(txt).not.toContain('**')
  })
})

describe('json resume', () => {
  it('converts dates', () => {
    expect(toIsoDate('2023.7')).toBe('2023-07')
    expect(toIsoDate('2023')).toBe('2023')
    expect(toIsoDate('至今')).toBeUndefined()
    expect(fromIsoDate('2020-07-01')).toBe('2020.07')
    expect(fromIsoDate('')).toBe('')
  })

  it('exports the standard shape', () => {
    type Rec = Record<string, unknown>
    const json = toJsonResume(sample()) as {
      basics: Rec & { summary: string }
      work: Rec[]
      skills: Rec[]
      projects: (Rec & { keywords: string[] })[]
    }
    expect(json.basics).toMatchObject({
      name: '林小明',
      email: 'linxiaoming@email.com',
      location: { city: '上海' },
      profiles: [{ network: 'GitHub', username: 'linxiaoming' }],
    })
    expect(json.basics.summary).toContain('前端工程师')
    expect(json.work[0]).toMatchObject({
      name: '星图科技',
      startDate: '2023-07',
    })
    expect(json.work[0].endDate).toBeUndefined()
    expect(json.work[1]).toMatchObject({ endDate: '2022-12' })
    expect(json.skills[0]).toEqual({
      name: '语言',
      keywords: ['TypeScript', 'JavaScript', 'HTML/CSS', 'Node.js'],
    })
    expect(json.projects[0].keywords).toEqual(['TypeScript', 'Canvas', 'WebGL'])
  })

  it('round-trips through JSON Resume', () => {
    const doc = sample()
    doc.sections.push(
      newSection('custom', 'zh', {
        title: '开源',
        layout: 'text',
        items: [newItem({ bullets: ['A', 'B'] })],
      })
    )
    doc.theme.color.accent = '#123456'
    const back = importAny(JSON.parse(JSON.stringify(toJsonResume(doc))))
    expect(back.source).toBe('json-resume')
    const [r] = back.docs
    expect(r.theme.color.accent).toBe('#123456')
    expect(r.sections.map((s) => [s.kind, s.title])).toEqual(
      doc.sections.map((s) => [s.kind, s.title])
    )
    const strip = (d: typeof doc) =>
      d.sections.map((s) =>
        s.items.map((i) => [
          i.title,
          i.subtitle,
          i.start,
          i.end,
          i.bullets.join('|'),
        ])
      )
    expect(strip(r)).toEqual(strip(doc))
    expect(r.profile.contacts.map((c) => c.kind).sort()).toEqual(
      doc.profile.contacts.map((c) => c.kind).sort()
    )
  })

  it('imports third-party JSON Resume in English', () => {
    const doc = fromJsonResume({
      basics: {
        name: 'Ada Lovelace',
        label: 'Engineer',
        email: 'ada@x.dev',
        location: { city: 'London', countryCode: 'UK' },
      },
      work: [
        {
          name: 'Analytical Co',
          position: 'Lead',
          startDate: '2020-01-01',
          highlights: ['Built engine'],
        },
      ],
      education: [
        {
          institution: 'Uni',
          area: 'Math',
          studyType: 'BSc',
          startDate: '2015',
          endDate: '2019',
        },
      ],
      skills: [{ name: 'Languages', keywords: ['Rust', 'Go'] }],
      languages: [{ language: 'English', fluency: 'Native' }],
      awards: [
        {
          title: 'Prize',
          awarder: 'Society',
          date: '2021-05',
          summary: 'For work',
        },
      ],
    })
    expect(doc.locale).toBe('en')
    expect(doc.sections.map((s) => s.title)).toEqual([
      'Experience',
      'Education',
      'Skills',
      'Awards',
    ])
    expect(doc.sections[0].items[0]).toMatchObject({
      title: 'Analytical Co',
      start: '2020.01',
      end: '至今',
      bullets: ['Built engine'],
    })
    expect(doc.sections[1].items[0].subtitle).toBe('Math · BSc')
    expect(doc.sections[2].items.map((i) => i.text)).toEqual([
      'Rust, Go',
      'Native',
    ])
    expect(doc.sections[3].items[0]).toMatchObject({
      start: '2021.05',
      end: '',
      bullets: ['For work'],
    })
    expect(doc.profile.contacts.find((c) => c.kind === 'location')?.value).toBe(
      'London, UK'
    )
  })
})
