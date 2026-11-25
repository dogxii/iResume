import { defineMessages } from '../i18n'
import { parseDate } from '../model/dates'
import {
  createDoc,
  guessContactKind,
  KIND_META,
  newContact,
  newItem,
  newSection,
} from '../model/defaults'
import type {
  Contact,
  ContactKind,
  Item,
  Locale,
  ResumeDoc,
  Section,
  SectionKind,
} from '../model/types'
import { isCjk, joinWrapped, type Line } from './lines'

const M = defineMessages(
  { unsorted: '待整理', imported: '导入的简历' },
  { unsorted: 'To sort', imported: 'Imported resume' }
)

// —— 区块标题词典 ——————————————————————————————————————————

const TITLES: Record<Exclude<SectionKind, 'custom'>, string[]> = {
  summary: [
    '个人简介',
    '自我评价',
    '个人总结',
    '个人优势',
    '关于我',
    '简介',
    '自我介绍',
    '个人评价',
    '职业概述',
    '个人概述',
    '个人陈述',
    '求职意向',
    'summary',
    'profile',
    'about',
    'about me',
    'professional summary',
    'objective',
    'career objective',
    'personal statement',
    'overview',
  ],
  experience: [
    '工作经历',
    '工作经验',
    '实习经历',
    '实习经验',
    '职业经历',
    '工作履历',
    '任职经历',
    '工作背景',
    'experience',
    'work experience',
    'professional experience',
    'employment',
    'employment history',
    'work history',
    'internships',
    'internship',
    'career history',
    'relevant experience',
  ],
  projects: [
    '项目经历',
    '项目经验',
    '项目',
    '个人项目',
    '开源项目',
    '代表项目',
    '项目作品',
    'projects',
    'project',
    'personal projects',
    'selected projects',
    'project experience',
    'side projects',
    'open source',
  ],
  education: [
    '教育背景',
    '教育经历',
    '学历',
    '教育',
    '学历背景',
    '教育信息',
    'education',
    'academic background',
    'educational background',
  ],
  skills: [
    '专业技能',
    '技能',
    '技能特长',
    '个人技能',
    '技术栈',
    '技术能力',
    '专业能力',
    '技能清单',
    '技能证书',
    '语言能力',
    'skills',
    'technical skills',
    'core skills',
    'skills & tools',
    'tools',
    'competencies',
    'core competencies',
    'tech stack',
    'technologies',
    'skills and tools',
    'languages and tools',
  ],
  awards: [
    '荣誉奖项',
    '获奖情况',
    '荣誉',
    '奖项',
    '获奖经历',
    '证书',
    '资格证书',
    '荣誉证书',
    '所获荣誉',
    '获奖',
    '荣誉与奖项',
    'awards',
    'honors',
    'honours',
    'achievements',
    'certifications',
    'certificates',
    'awards & honors',
    'honors & awards',
    'awards and honors',
  ],
  activities: [
    '校园经历',
    '社团经历',
    '课外活动',
    '志愿经历',
    '在校经历',
    '学生工作',
    '社会实践',
    '校园活动',
    'activities',
    'leadership',
    'volunteering',
    'volunteer experience',
    'extracurricular activities',
    'extracurriculars',
    'leadership & activities',
  ],
  publications: [
    '论文发表',
    '发表论文',
    '论文',
    '学术成果',
    '出版物',
    '科研成果',
    '科研经历',
    'publications',
    'papers',
    'research',
    'research experience',
  ],
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^[\s#【[(（]+|[\s:：】\])）]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const DICT = new Map<string, SectionKind>()
for (const [kind, words] of Object.entries(TITLES))
  for (const w of words) DICT.set(norm(w), kind as SectionKind)
for (const [kind, meta] of Object.entries(KIND_META))
  if (kind !== 'custom') {
    DICT.set(norm(meta.zh), kind as SectionKind)
    DICT.set(norm(meta.en), kind as SectionKind)
  }

/** 只按词典判断：中文去掉字间空格（「工 作 经 历」），英文忽略大小写 */
export function titleKind(text: string): SectionKind | null {
  const t = norm(text)
  if (t.length > 40) return null
  return DICT.get(t) ?? DICT.get(t.replace(/\s+/g, '')) ?? null
}

// —— 日期 ——————————————————————————————————————————————————

const MONTH =
  '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const DATE = `(?:\\d{4}\\s*[./\\-年]\\s*\\d{1,2}\\s*月?|\\d{4}\\s*年|${MONTH}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`
const PRESENT = '(?:至今|现在|今|目前|在职|present|now|current|ongoing|today)'
const SEP = '\\s*(?:–|—|-|~|～|至|到|to|until)\\s*'
const RANGE = new RegExp(
  `(${DATE})${SEP}(${DATE}|${PRESENT})|(${DATE})\\s*(?:–|—|-|~|～)\\s*$`,
  'i'
)
const SINGLE = new RegExp(`(?:^|[\\s(（])(${DATE})(?=$|[\\s)）])`, 'i')
const DATE_ONLY = new RegExp(
  `^(?:${SEP})?(?:${DATE}|${PRESENT})(?:${SEP}(?:${DATE}|${PRESENT})?)?$`,
  'i'
)

/** 统一成「2023.07」「2023」，识别不了的保持原样 */
export function normDate(s: string) {
  const t = s.trim().replace(/\s+/g, ' ')
  if (new RegExp(`^${PRESENT}$`, 'i').test(t)) return t
  const m = t.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[2]}.${m[1].padStart(2, '0')}`
  const p = parseDate(
    t
      .replace(/\s*月$/, '')
      .replace(/\s*年\s*/, '.')
      .replace(/\.$/, '')
  )
  if (p?.kind === 'date')
    return p.month
      ? `${p.year}.${String(p.month).padStart(2, '0')}`
      : String(p.year)
  return t
}

interface Dated {
  start: string
  end: string
  /** 去掉日期后剩下的文字 */
  rest: string
  /** 「2022.07 –」：结束时间被换到了下一行 */
  open: boolean
  /** 「Jul 2022 – Dec」：结束时间的月份留在这一行，年份换到了下一行 */
  partial?: string
}

const PARTIAL = new RegExp(`^(${DATE})${SEP}(${MONTH})$`, 'i')

/** 一个单元格是不是只有日期 */
function dateCell(text: string): Dated | null {
  const t = text.trim()
  const p = t.match(PARTIAL)
  if (p)
    return {
      start: normDate(p[1]),
      end: '',
      rest: '',
      open: true,
      partial: p[2],
    }
  if (!DATE_ONLY.test(t)) return null
  return (
    findDates(t) ?? {
      start: '',
      end: normDate(t.replace(/^[\s–—~～-]+/, '')),
      rest: '',
      open: false,
    }
  )
}

function findDates(text: string): Dated | null {
  const r = text.match(RANGE)
  if (r && r.index !== undefined) {
    const rest = (text.slice(0, r.index) + text.slice(r.index + r[0].length))
      .replace(/\s*[·|｜,，]\s*$/, '')
      .replace(/^\s*[·|｜,，]\s*/, '')
      .trim()
    if (r[3]) return { start: normDate(r[3]), end: '', rest, open: true }
    return { start: normDate(r[1]), end: normDate(r[2]), rest, open: false }
  }
  const s = text.match(SINGLE)
  // 单个年份只在短行里当作日期（避免把「2 个从 0 到 1」里的数字当成年份）
  if (s && s.index !== undefined && /\d{4}/.test(s[1])) {
    const year = Number(s[1].match(/\d{4}/)?.[0])
    if (year < 1950 || year > 2100) return null
    const rest = (
      text.slice(0, s.index) + text.slice(s.index + s[0].length)
    ).trim()
    if (rest.length > 60) return null
    return { start: normDate(s[1]), end: '', rest, open: false }
  }
  return null
}

// —— 联系方式与地点 ———————————————————————————————————————————

const LABELS: [RegExp, ContactKind][] = [
  [/^(?:电话|手机|联系电话|tel|phone|mobile|cell)$/i, 'phone'],
  [/^(?:邮箱|电子邮箱|邮件|e-?mail)$/i, 'email'],
  [/^(?:微信|wechat|weixin)$/i, 'wechat'],
  [/^github$/i, 'github'],
  [/^linkedin$/i, 'linkedin'],
  [/^(?:地址|城市|所在地|现居|居住地|location|address|city)$/i, 'location'],
  [/^(?:网站|主页|个人主页|博客|website|blog|homepage|portfolio)$/i, 'website'],
]

const CITIES =
  '北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|长沙|郑州|青岛|厦门|宁波|合肥|济南|福州|大连|沈阳|哈尔滨|长春|昆明|南昌|贵阳|南宁|石家庄|太原|兰州|海口|无锡|东莞|佛山|珠海|香港|澳门|台北|新加坡|东京|伦敦|纽约|远程'
const CITY = new RegExp(`^(?:${CITIES})(?:市)?(?:\\s*[·,，/]\\s*\\S{1,6})?$`)

export function isLocation(text: string) {
  const t = text.trim()
  if (CITY.test(t)) return true
  if (/^[一-鿿]{2,8}(?:省|市|区|县)$/.test(t)) return true
  if (/^remote$/i.test(t)) return true
  // San Francisco, CA · London, UK · Berlin, Germany
  return /^[A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+){0,3},\s*[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?$/.test(
    t
  )
}

const URL_RE =
  /\b(?:https?:\/\/\S+|www\.\S+|(?:[\w-]+\.)+(?:com|net|org|io|dev|cn|me|co|app|site|xyz|ai|tech|info|page|blog)(?:\/\S*)?)/gi

function contactOf(segment: string, header = false): Contact | null {
  const t = segment.trim()
  if (!t) return null
  const labelled = t.match(/^([^:：]{1,10})[:：]\s*(.+)$/)
  if (labelled) {
    for (const [re, kind] of LABELS)
      if (re.test(labelled[1].trim()))
        return newContact(kind, labelled[2].trim())
  }
  const kind = guessContactKind(t)
  if (kind !== 'text') {
    // 「3.2s」「Node.js」之类不是网址
    if (kind === 'website' && !header && !t.match(URL_RE)) return null
    return newContact(kind, t)
  }
  return null
}

/** 页眉一行按分隔符切开 */
const splitSegments = (text: string) =>
  text
    .split(/\s*[·|｜•●]\s*|\s{2,}|\t/)
    .map((s) => s.trim())
    .filter(Boolean)

// —— 解析 ———————————————————————————————————————————————————

export interface ParseResult {
  doc: ResumeDoc
  /** 识别出的区块数、条目数，以及放进「待整理」的行数 */
  stats: { sections: number; items: number; unsorted: number }
}

/** 页码、页眉页脚 */
const NOISE =
  /^(?:-?\s*\d+\s*-?|\d+\s*\/\s*\d+|page \d+( of \d+)?|第\s*\d+\s*页(?:\s*\/?\s*共\s*\d+\s*页)?)$/i

export function parseResume(
  input: Line[],
  options: { name?: string } = {}
): ParseResult {
  // 1. 去掉噪声，接上被自动换行切开的行
  const lines: Line[] = []
  for (const l of input) {
    if (!l.text.trim() || NOISE.test(l.text.trim())) continue
    const prev = lines[lines.length - 1]
    // 「· San Francisco, CA」：条目标题行太长，后半截换到了下一行
    if (prev && !prev.bullet && /^[·|｜]\s/.test(l.text)) {
      prev.cells[0] = `${prev.cells[0]} ${l.text}`
      prev.text = prev.cells.join('  ')
      continue
    }
    if (l.wrapped && prev && !titleKind(prev.text)) {
      const last = prev.cells.length - 1
      prev.cells[last] = joinWrapped(prev.cells[last], l.text)
      prev.text = prev.cells.join('  ')
      continue
    }
    lines.push({ ...l, cells: [...l.cells] })
  }
  const all = lines.map((l) => l.text).join('\n')
  const locale: Locale = isCjk(all) ? 'zh' : 'en'

  // 2. 正文字号（按字数加权的众数）
  const weight = new Map<number, number>()
  for (const l of lines)
    if (l.size) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length)
  const body = [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0

  // 3. 区块标题
  const isHeading = (l: Line, i: number): SectionKind | null => {
    if (l.bullet) return null
    const kind = titleKind(l.text)
    if (kind) return kind
    const t = l.text.trim()
    const short =
      t.length <= 18 && !/[，。,.;；!！?？]$/.test(t) && !findDates(t)
    if (!short || i === 0) return null
    if (l.heading) return 'custom'
    if (
      body &&
      l.size > body * 1.12 &&
      l.size < body * 1.8 &&
      l.cells.length === 1
    )
      return 'custom'
    if (locale === 'en' && /^[A-Z][A-Z &/-]{3,}$/.test(t)) return 'custom'
    return null
  }
  const kinds = lines.map(isHeading)
  const firstHeading = kinds.findIndex(Boolean)

  // 4. 页眉：第一个区块之前的行；双栏版式里姓名可能在后面，它与紧随其后的行也算页眉
  const header = new Set<number>()
  const end = firstHeading < 0 ? lines.length : firstHeading
  for (let i = 0; i < end; i++) header.add(i)
  let nameAt = -1
  if (body) {
    const biggest = Math.max(...lines.map((l) => l.size))
    if (biggest > body * 1.5)
      nameAt = lines.findIndex((l) => l.size === biggest)
  }
  if (nameAt < 0) nameAt = header.size ? 0 : -1
  if (nameAt >= 0 && !header.has(nameAt)) {
    // 双栏版式：姓名所在的一段（直到下一个区块标题）
    for (let i = nameAt; i < lines.length && !kinds[i]; i++) header.add(i)
  }
  if (firstHeading < 0) {
    // 没有任何标题：页眉只取到第一处日期或要点之前
    header.clear()
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].bullet || findDates(lines[i].text)) break
      header.add(i)
      if (header.size >= 6) break
    }
  }

  const profile = {
    name: '',
    headline: '',
    photo: '',
    contacts: [] as Contact[],
  }
  const summary: string[] = []
  const unsorted: Line[] = []
  for (const i of [...header].sort((a, b) => a - b)) {
    const l = lines[i]
    if (i === nameAt || (!profile.name && i === Math.min(...header))) {
      const [first, ...rest] = splitSegments(l.text)
      if (!profile.name && first && first.length <= 30 && !contactOf(first)) {
        profile.name = first
        const more = rest.map((s) => contactOf(s))
        if (more.every(Boolean)) {
          profile.contacts.push(...(more as Contact[]))
          continue
        }
        if (rest.length && !profile.headline)
          profile.headline = rest.join(' · ')
        continue
      }
    }
    const segs = splitSegments(l.text)
    const found = segs.map((s) => contactOf(s, true))
    const contacts =
      found.filter(Boolean).length + segs.filter(isLocation).length
    if (contacts > 0 && contacts >= segs.length - 1) {
      segs.forEach((s, k) => {
        const c = found[k]
        if (c) profile.contacts.push(c)
        else if (isLocation(s) || s.length <= 12)
          profile.contacts.push(
            newContact(isLocation(s) ? 'location' : 'text', s)
          )
      })
      continue
    }
    if (segs.length === 1 && isLocation(segs[0])) {
      profile.contacts.push(newContact('location', segs[0]))
      continue
    }
    // 紧跟姓名的一行是头衔；其余较长的句子是没有标题的个人简介
    // 姓名之后第一行不是联系方式的文字（右侧可能先排着几行联系方式）
    const afterName = nameAt < 0 || i > nameAt
    if (
      !profile.headline &&
      !l.bullet &&
      afterName &&
      l.text.length <= 80 &&
      !/[，。；]/.test(l.text)
    ) {
      profile.headline = l.text.replace(/\s{2,}/g, ' · ')
      continue
    }
    // 带句读的整句、或者较长的一段：没有标题的个人简介
    if (!l.bullet && (l.text.length > 40 || /[，。；]/.test(l.text))) {
      summary.push(l.text)
      continue
    }
    if (!profile.headline && !l.bullet) {
      profile.headline = l.text.replace(/\s{2,}/g, ' · ')
      continue
    }
    const labelled = contactOf(l.text)
    if (labelled) profile.contacts.push(labelled)
    else if (l.text.length <= 30 && !l.bullet)
      profile.contacts.push(newContact('text', l.text))
    else unsorted.push(l)
  }

  // 5. 区块
  const sections: Section[] = []
  const groups: { kind: SectionKind; title: string; lines: Line[] }[] = []
  for (let i = 0; i < lines.length; i++) {
    if (header.has(i)) continue
    const l = lines[i]
    const kind = kinds[i]
    if (kind)
      groups.push({
        kind,
        title: l.text.trim().replace(/[:：]$/, ''),
        lines: [],
      })
    else if (groups.length) groups[groups.length - 1].lines.push(l)
    else unsorted.push(l)
  }
  for (const g of groups) {
    const section = buildSection(g.kind, g.title, g.lines, locale, unsorted)
    if (section) sections.push(section)
  }
  if (summary.length && !sections.some((s) => s.kind === 'summary')) {
    const s = newSection('summary', locale, {
      items: [newItem({ text: summary.reduce(joinWrapped, '') })],
    })
    sections.unshift(s)
  } else unsorted.push(...summary.map((text) => ({ ...lineOf(text) })))

  if (unsorted.length) {
    sections.push(
      newSection('custom', locale, {
        title: M[locale].unsorted,
        layout: 'text',
        items: [
          newItem({
            bullets: unsorted.map((l) => l.text.replace(/\s{2,}/g, ' · ')),
          }),
        ],
      })
    )
  }

  const doc = createDoc({
    locale,
    name: options.name || profile.name || M[locale].imported,
  })
  doc.profile = { ...doc.profile, ...profile }
  doc.sections = sections
  return {
    doc,
    stats: {
      sections: sections.length - (unsorted.length ? 1 : 0),
      items: sections.reduce((n, s) => n + s.items.length, 0),
      unsorted: unsorted.length,
    },
  }
}

const lineOf = (text: string): Line => ({
  text,
  cells: [text],
  size: 0,
  x: 0,
  bullet: false,
  gap: 0,
})

function buildSection(
  kind: SectionKind,
  title: string,
  lines: Line[],
  locale: Locale,
  unsorted: Line[]
): Section | null {
  const layout =
    kind === 'custom'
      ? lines.some((l) => findDates(l.text))
        ? 'entries'
        : lines.every((l) => /[:：]/.test(l.text) || l.cells.length > 1)
          ? 'rows'
          : 'text'
      : KIND_META[kind].layout
  const items =
    layout === 'text'
      ? textItems(lines)
      : layout === 'rows'
        ? rowItems(lines)
        : entryItems(lines, unsorted)
  if (!items.length) return null
  return newSection(kind, locale, { title, layout, items })
}

function textItems(lines: Line[]): Item[] {
  const bullets = lines.filter((l) => l.bullet).map((l) => l.text)
  const text = lines
    .filter((l) => !l.bullet)
    .map((l) => l.text)
    .reduce((acc, t) => (acc ? `${acc}\n${t}` : t), '')
  if (!text && !bullets.length) return []
  return [newItem({ text, bullets })]
}

/** 技能：「语言：A, B」「语言  A, B」，或者标签单独一行、下面缩进列出内容 */
function rowItems(lines: Line[]): Item[] {
  const items: Item[] = []
  let label: { item: Item; x: number; size: number } | null = null
  for (const l of lines) {
    const t = l.text.trim()
    if (
      label &&
      l.x > label.x + 2 &&
      (!l.size || l.size <= label.size) &&
      !/[:：]/.test(t)
    ) {
      label.item.text = [label.item.text, ...l.cells].filter(Boolean).join(', ')
      continue
    }
    const colon = t.match(/^([^:：]{1,16})[:：]\s*(.*)$/)
    if (colon) {
      items.push(newItem({ title: colon[1].trim(), text: colon[2].trim() }))
      label = null
      continue
    }
    if (l.cells.length > 1) {
      items.push(
        newItem({ title: l.cells[0], text: l.cells.slice(1).join(', ') })
      )
      label = null
      continue
    }
    // 「语言 TypeScript, JavaScript」：标签是第一个逗号前除最后一个词以外的部分
    const head = t.split(/[,，、]/)[0]
    const words = head.split(/\s+/)
    if (
      words.length >= 2 &&
      /[,，、]/.test(t) &&
      words.slice(0, -1).join(' ').length <= 20
    ) {
      const title = words.slice(0, -1).join(' ')
      items.push(newItem({ title, text: t.slice(title.length).trim() }))
      label = null
      continue
    }
    if (t.length <= 12 && !/[,，、]/.test(t)) {
      const item = newItem({ title: t })
      items.push(item)
      label = { item, x: l.x, size: l.size }
      continue
    }
    items.push(newItem({ text: t }))
    label = null
  }
  return items.filter((i) => i.title || i.text)
}

/** 条目：以带日期的行或要点之后的第一行开头；之后的行依次是副标题、链接 / 标签、描述、要点 */
function entryItems(lines: Line[], unsorted: Line[]): Item[] {
  const items: Item[] = []
  let cur: Item | null = null
  let open: Dated | null = null
  let pending: Dated | null = null
  const setDates = (item: Item, d: Dated) => {
    item.start = d.start
    item.end = d.end
    open = d.open ? d : null
  }
  const start = (head: string, d: Dated | null) => {
    const item = newItem()
    items.push(item)
    cur = item
    fillHead(item, head)
    const dates = d ?? pending
    open = null
    if (dates) setDates(item, dates)
    pending = null
  }
  for (const l of lines) {
    if (l.bullet) {
      if (!cur) start('', null)
      ;(cur as unknown as Item).bullets.push(l.text.trim())
      continue
    }
    // 只有日期的单元格（右对齐的日期列、时间线的日期栏）
    let dates: Dated | null = null
    const restCells: string[] = []
    for (const cell of l.cells) {
      const d = dateCell(cell)
      if (d && !dates) dates = d
      else restCells.push(cell)
    }
    const c = cur as Item | null
    // 换到下一行的结束时间：「2022.12」「Present」「2022」（接在「Dec」后面）
    const lone = dates && !dates.open && (!dates.start || !dates.end)
    if (dates && lone && c && open && !c.end) {
      const tail = dates.start || dates.end
      const o = open as Dated
      c.end = o.partial ? normDate(`${o.partial} ${tail}`) : tail
      open = null
      dates = null
    }
    const text = restCells.join('  ').trim()
    if (!text) {
      if (!dates) continue
      if (c && !c.start && !c.bullets.length) setDates(c, dates)
      else pending = dates
      continue
    }
    const d = dates ?? findDates(text)
    const head = dates ? text : (d?.rest ?? text)
    if (!c || c.bullets.length || c.text) {
      start(head, d)
      continue
    }
    if (d && !c.start) {
      // 第二行带日期：「前端工程师  2023.07 – 至今」
      if (head)
        c.subtitle = c.subtitle
          ? `${c.subtitle} · ${head}`
          : head.replace(/\s{2,}/g, ' · ')
      setDates(c, d)
      continue
    }
    if (d) {
      start(head, d)
      continue
    }
    const urls = text.match(URL_RE)
    if (urls) {
      c.links.push(...urls.map((u) => u.replace(/[),.;，。；]+$/, '')))
      const rest = text
        .replace(URL_RE, '')
        .replace(/^[\s·|｜,，]+|[\s·|｜,，]+$/g, '')
      if (rest) c.tags = c.tags ? `${c.tags}, ${rest}` : rest
      continue
    }
    if (
      !c.subtitle &&
      !c.links.length &&
      text.length <= 40 &&
      !/[。.!！]$/.test(text)
    ) {
      c.subtitle = text.replace(/\s{2,}/g, ' · ')
      continue
    }
    const tokens = text.split(/\s*[,，、/]\s*/)
    if (!c.tags && tokens.length >= 3 && tokens.every((x) => x.length <= 24)) {
      c.tags = tokens.join(', ')
      continue
    }
    if (text) {
      c.text = c.text ? joinWrapped(c.text, text) : text
      continue
    }
    unsorted.push(l)
  }
  return items.filter(
    (i) => i.title || i.subtitle || i.text || i.bullets.length || i.start
  )
}

/** 「星图科技 · 前端工程师 · 数据平台部 · 上海」→ 标题 / 副标题 / 地点 */
function fillHead(item: Item, head: string) {
  const clean = head.replace(/\*\*/g, '').trim()
  let parts = clean
    .split(/\s*[·|｜•]\s*|\s{2,}|\t|\s+[—–-]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  // 只用逗号分隔：「Stripe, Product Designer, New York, NY」
  if (parts.length === 1 && /,\s/.test(clean)) {
    parts = clean.split(/\s*,\s+/)
    const tail = parts.slice(-2).join(', ')
    if (parts.length > 2 && isLocation(tail))
      parts = [...parts.slice(0, -2), tail]
  }
  if (!parts.length) return
  item.title = parts[0]
  const rest = parts.slice(1)
  if (rest.length && isLocation(rest[rest.length - 1]))
    item.location = rest.pop() ?? ''
  item.subtitle = rest.join(' · ')
}
