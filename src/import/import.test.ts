import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDoc } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { htmlToLines } from './docx'
import { joinWrapped, stripBullet, textToLines } from './lines'
import { normDate, parseResume, titleKind } from './parse'
import { itemsToLines, type PdfItem } from './pdf'

const n = (s: string) =>
  s
    .replace(/\*\*/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,]/g, ',')
    .toLowerCase()
const PRESENT = /^(至今|present)$/i
const sameDate = (a: string, b: string) =>
  n(a) === n(b) || (PRESENT.test(a) && PRESENT.test(b))

/** 原简历中每个非空字段算一分，导入结果里对应位置的内容一致即命中 */
function score(orig: ResumeDoc, got: ResumeDoc) {
  let hit = 0
  let total = 0
  const miss: string[] = []
  const check = (label: string, exp: string, act = '', eq = sameText) => {
    if (!exp.trim()) return
    total++
    if (eq(exp, act)) hit++
    else miss.push(`${label}: ${exp} ≠ ${act}`)
  }
  check('姓名', orig.profile.name, got.profile.name)
  check('头衔', orig.profile.headline, got.profile.headline)
  for (const c of orig.profile.contacts)
    check(
      `联系方式 ${c.kind}`,
      c.value,
      got.profile.contacts.find((x) => n(x.value) === n(c.value))?.value
    )
  for (const s of orig.sections) {
    const ps = got.sections.find((x) => x.kind === s.kind)
    check(`区块 ${s.kind}`, s.title, ps?.title)
    s.items.forEach((item, k) => {
      const pi =
        ps?.items.find((x) => item.title && n(x.title) === n(item.title)) ??
        ps?.items[k]
      const at = `${s.kind}[${k}]`
      check(`${at}.title`, item.title, pi?.title)
      check(`${at}.subtitle`, item.subtitle, pi?.subtitle)
      check(`${at}.location`, item.location, pi?.location)
      check(`${at}.start`, item.start, pi?.start, sameDate)
      check(`${at}.end`, item.end, pi?.end, sameDate)
      check(`${at}.tags`, item.tags, pi?.tags)
      check(`${at}.links`, item.links.join(' '), pi?.links.join(' '))
      check(`${at}.text`, item.text, pi?.text)
      for (const [j, b] of item.bullets.entries())
        check(`${at}.bullets[${j}]`, b, pi?.bullets[j])
    })
  }
  return { rate: total ? hit / total : 1, hit, total, miss }
}
function sameText(a: string, b: string) {
  return n(a) === n(b)
}

const dir = join(__dirname, 'fixtures')
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.json'))
const PRESETS = [
  '清简',
  '经典',
  '侧标题',
  '双栏',
  '现代',
  '紧凑',
  '时间线',
  '书卷',
]

describe('PDF 往返：8 套预设导出的示例简历', () => {
  for (const file of fixtures) {
    const [lang, , index] = file.replace('.json', '').split('-')
    const label = `${lang} · ${PRESETS[Number(index)]}`
    it(`${label}：关键字段命中率 ≥ 90%`, () => {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as [
        string,
        number,
        number,
        number,
        number,
      ][][]
      const pages: PdfItem[][] = raw.map((p) =>
        p.map(([str, x, y, w, h]) => ({ str, x, y, w, h }))
      )
      const { doc, stats } = parseResume(itemsToLines(pages))
      const orig = createDoc({
        sample: true,
        locale: lang === 'en' ? 'en' : 'zh',
      })
      const r = score(orig, doc)
      expect(r.rate, `${label}\n${r.miss.join('\n')}`).toBeGreaterThanOrEqual(
        0.9
      )
      expect(doc.locale).toBe(orig.locale)
      expect(stats.unsorted, label).toBe(0)
    })
  }
})

describe('纯文本', () => {
  it('常见的纯文本简历', () => {
    const text = `张三
高级后端工程师
电话：13900001111 | 邮箱：zhangsan@example.com | 北京

【个人简介】
8 年后端经验，熟悉分布式系统。

工作经历
字节跳动 · 后端工程师 · 北京    2020.03 - 至今
- 负责推荐系统的存储层，P99 延迟降低 40%
- 带领 5 人小组完成服务迁移
阿里巴巴  2017年7月 - 2020年2月
Java 开发工程师
• 参与双十一大促保障

教育背景
清华大学 · 计算机科学 · 硕士  2014.09 - 2017.06

专业技能
语言：Java, Go, Python
数据库：MySQL, Redis`
    const { doc, stats } = parseResume(textToLines(text))
    expect(doc.profile.name).toBe('张三')
    expect(doc.profile.headline).toBe('高级后端工程师')
    expect(doc.profile.contacts.map((c) => [c.kind, c.value])).toEqual([
      ['phone', '13900001111'],
      ['email', 'zhangsan@example.com'],
      ['location', '北京'],
    ])
    expect(doc.sections.map((s) => s.kind)).toEqual([
      'summary',
      'experience',
      'education',
      'skills',
    ])
    const [a, b] = doc.sections[1].items
    expect(a).toMatchObject({
      title: '字节跳动',
      subtitle: '后端工程师',
      location: '北京',
      start: '2020.03',
      end: '至今',
    })
    expect(a.bullets).toHaveLength(2)
    expect(b).toMatchObject({
      title: '阿里巴巴',
      subtitle: 'Java 开发工程师',
      start: '2017.07',
      end: '2020.02',
      bullets: ['参与双十一大促保障'],
    })
    expect(doc.sections[2].items[0]).toMatchObject({
      title: '清华大学',
      subtitle: '计算机科学 · 硕士',
      start: '2014.09',
      end: '2017.06',
    })
    expect(doc.sections[3].items.map((i) => [i.title, i.text])).toEqual([
      ['语言', 'Java, Go, Python'],
      ['数据库', 'MySQL, Redis'],
    ])
    expect(stats.unsorted).toBe(0)
  })

  it('英文 Markdown 简历', () => {
    const text = `# Alex Kim
Product Designer
alex@kim.design · (212) 555-0100 · New York, NY · alexkim.design

## Experience
**Figma** — Senior Product Designer | Jan 2021 – Present
- Led the redesign of the comments experience
- Shipped design tokens to 400+ files

**Stripe**, Product Designer, Mar 2018 – Dec 2020
- Designed onboarding for Stripe Atlas

## Skills
Design: Figma, Prototyping, Design systems
Research: Interviews, Usability testing`
    const { doc } = parseResume(textToLines(text))
    expect(doc.locale).toBe('en')
    expect(doc.profile.name).toBe('Alex Kim')
    expect(doc.profile.contacts.map((c) => c.kind)).toEqual([
      'email',
      'phone',
      'location',
      'website',
    ])
    const exp = doc.sections.find((s) => s.kind === 'experience')
    expect(exp?.items[0]).toMatchObject({
      title: 'Figma',
      subtitle: 'Senior Product Designer',
      start: '2021.01',
      end: 'Present',
    })
    expect(exp?.items[1]).toMatchObject({
      title: 'Stripe',
      start: '2018.03',
      end: '2020.12',
    })
    expect(doc.sections.find((s) => s.kind === 'skills')?.items).toHaveLength(2)
  })

  it('认不出来的内容放进「待整理」，不丢', () => {
    const { doc, stats } = parseResume(
      textToLines('王五\n一些说明文字，没有任何区块标题，也没有日期')
    )
    expect(doc.profile.name).toBe('王五')
    expect(stats.unsorted + doc.sections.length).toBeGreaterThan(0)
    const all = JSON.stringify(doc.sections) + doc.profile.headline
    expect(all).toContain('一些说明文字')
  })
})

describe('容易误判的写法', () => {
  it('数量区间、电话号码不是日期；带逗号的句子不是职位', () => {
    const { doc } = parseResume(
      textToLines(
        '张三\n138-0013-8000  zs@mail.com\n工作经历\n星图科技  2021.03 - 至今\n前端工程师\n负责数据平台，服务 1000-2000 家企业客户'
      )
    )
    const exp = doc.sections.find((s) => s.kind === 'experience')
    expect(exp?.items).toHaveLength(1)
    expect(exp?.items[0].subtitle).toBe('前端工程师')
    expect(exp?.items[0].text).toContain('1000-2000 家企业客户')
    expect(doc.profile.contacts.map((c) => c.value)).toContain('138-0013-8000')
  })

  it('带逗号的整句是描述，不是关键词', () => {
    const { doc } = parseResume(
      textToLines(
        'Jordan Lee\nExperience\nStripe  2021 - Present\nEngineer\nLed design, research, and delivery.'
      )
    )
    const item = doc.sections[0].items[0]
    expect(item.tags).toBe('')
    expect(item.text).toBe('Led design, research, and delivery.')
  })

  it('PDF 里字号最大的一行是姓名；「个人简历」这样的文档标题丢掉', () => {
    const line = (text: string, size: number) => ({
      text,
      cells: [text],
      size,
      x: 0,
      bullet: false,
    })
    const { doc } = parseResume([
      line('个人简历', 10),
      line('张三', 24),
      line('前端工程师', 10),
      line('zs@mail.com', 10),
      line('工作经历', 13),
      line('星图科技  2021.03 - 至今', 10),
    ])
    expect(doc.profile.name).toBe('张三')
    expect(doc.profile.headline).toBe('前端工程师')
  })
})

describe('工具函数', () => {
  it('区块标题词典', () => {
    expect(titleKind('工作经历')).toBe('experience')
    expect(titleKind('【 教育背景 】')).toBe('education')
    expect(titleKind('WORK EXPERIENCE')).toBe('experience')
    expect(titleKind('Skills:')).toBe('skills')
    expect(titleKind('工 作 经 历')).toBe('experience')
    expect(titleKind('负责推荐系统')).toBeNull()
  })
  it('日期规范化', () => {
    expect(normDate('2023年7月')).toBe('2023.07')
    expect(normDate('Jan 2021')).toBe('2021.01')
    expect(normDate('07/2019')).toBe('2019.07')
    expect(normDate('2020')).toBe('2020')
    expect(normDate('至今')).toBe('至今')
  })
  it('项目符号与换行拼接', () => {
    expect(stripBullet('• 做了一件事')).toEqual({
      text: '做了一件事',
      bullet: true,
    })
    expect(stripBullet('1. First')).toEqual({ text: 'First', bullet: true })
    expect(stripBullet('2023.07 – 至今').bullet).toBe(false)
    expect(joinWrapped('主导数据看板', '重构')).toBe('主导数据看板重构')
    expect(joinWrapped('Led the', 'team')).toBe('Led the team')
    expect(joinWrapped('front-', 'end')).toBe('front-end')
  })
})

describe('Word', () => {
  /** 用 jszip 拼一个最小的 docx：加粗的区块标题、制表符分隔的日期、表格、列表符号 */
  async function docx(paragraphs: string) {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
    )
    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    )
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`
    )
    return zip.generateAsync({ type: 'nodebuffer' })
  }
  const p = (text: string, bold = false) =>
    `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}${text
      .split('\t')
      .map((t) => `<w:t xml:space="preserve">${t}</w:t>`)
      .join('<w:tab/>')}</w:r></w:p>`
  const row = (...cells: string[]) =>
    `<w:tr>${cells.map((c) => `<w:tc>${p(c)}</w:tc>`).join('')}</w:tr>`

  it('mammoth 转出的段落、加粗标题、制表符与表格', async () => {
    const { default: mammoth } = await import('mammoth')
    const buffer = await docx(
      [
        p('李雷', true),
        p('数据分析师'),
        p('lilei@example.com | 186 0000 1234'),
        p('工作经历', true),
        `<w:tbl>${row('美团 · 数据分析师 · 北京', '2021.04 – 至今')}</w:tbl>`,
        p('• 搭建经营分析看板，覆盖 20+ 城市'),
        p('• 设计 A/B 实验平台指标体系'),
        p('教育背景', true),
        p('北京大学 · 统计学 · 硕士\t2018.09 – 2021.06'),
        p('技能', true),
        p('工具：SQL, Python, Tableau'),
      ].join('')
    )
    const html = (await mammoth.convertToHtml({ buffer })).value
    const { doc, stats } = parseResume(htmlToLines(html))
    expect(doc.profile).toMatchObject({ name: '李雷', headline: '数据分析师' })
    expect(doc.profile.contacts.map((c) => c.kind)).toEqual(['email', 'phone'])
    expect(doc.sections.map((s) => s.kind)).toEqual([
      'experience',
      'education',
      'skills',
    ])
    expect(doc.sections[0].items[0]).toMatchObject({
      title: '美团',
      subtitle: '数据分析师',
      location: '北京',
      start: '2021.04',
      end: '至今',
      bullets: ['搭建经营分析看板，覆盖 20+ 城市', '设计 A/B 实验平台指标体系'],
    })
    expect(doc.sections[1].items[0]).toMatchObject({
      title: '北京大学',
      subtitle: '统计学 · 硕士',
      start: '2018.09',
      end: '2021.06',
    })
    expect(doc.sections[2].items[0]).toMatchObject({
      title: '工具',
      text: 'SQL, Python, Tableau',
    })
    expect(stats.unsorted).toBe(0)
  })

  it('HTML 实体、换行与列表', () => {
    const lines = htmlToLines(
      '<h1>Jane Doe</h1><p>a &amp; b<br />second</p><ul><li>One</li></ul>'
    )
    expect(lines.map((l) => [l.text, !!l.heading, l.bullet])).toEqual([
      ['Jane Doe', true, false],
      ['a & b', false, false],
      ['second', false, false],
      ['One', false, true],
    ])
  })
})
