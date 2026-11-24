import { defineMessages, getLang, type Lang } from '../i18n'
import { themeName } from '../theme/presets'
import { formatRange } from './dates'
import { plainText } from './inline'
import type { Item, ResumeDoc, Section } from './types'

const M = defineMessages(
  {
    present: '至今',
    untitledItem: '未命名条目',
    untitledSection: '未命名区块',
    title: '标题',
    subtitle: '副标题',
    location: '地点',
    tags: '关键词',
    text: '描述',
    dates: '时间',
    links: '链接',
    hidden: '已隐藏',
    shown: '已显示',
    bullet: '要点',
    profile: '个人信息',
    name: '姓名',
    headline: '一句话定位',
    contact: '联系方式',
    photoChanged: '更换了照片',
    photoRemoved: '移除了照片',
    section: '区块',
    sectionTitle: '区块标题',
    sectionHidden: '区块已隐藏',
    sectionShown: '区块已显示',
    layout: '排版方式',
    item: '条目',
    itemOrder: '条目顺序',
    overall: '整体',
    sectionOrder: '区块顺序',
    design: '设计',
    themeParams: (name: string) => `主题「${name}」的参数`,
    theme: '主题',
  },
  {
    present: 'Present',
    untitledItem: 'Untitled entry',
    untitledSection: 'Untitled section',
    title: 'Title',
    subtitle: 'Subtitle',
    location: 'Location',
    tags: 'Keywords',
    text: 'Description',
    dates: 'Dates',
    links: 'Links',
    hidden: 'Hidden',
    shown: 'Shown',
    bullet: 'Bullet',
    profile: 'Profile',
    name: 'Name',
    headline: 'Headline',
    contact: 'Contact',
    photoChanged: 'Photo replaced',
    photoRemoved: 'Photo removed',
    section: 'Section',
    sectionTitle: 'Section title',
    sectionHidden: 'Section hidden',
    sectionShown: 'Section shown',
    layout: 'Layout',
    item: 'Entry',
    itemOrder: 'Entry order',
    overall: 'Overall',
    sectionOrder: 'Section order',
    design: 'Design',
    themeParams: (name: string) => `Settings of theme “${name}”`,
    theme: 'Theme',
  }
)
type Msg = (typeof M)['zh']

export type ChangeKind = 'added' | 'removed' | 'changed' | 'moved'

export interface Change {
  kind: ChangeKind
  /** 所在位置，如「工作经历 › 星图科技」 */
  where: string
  what: string
  before?: string
  after?: string
}

const itemName = (t: Msg, i: Item) =>
  plainText(i.title || i.subtitle || i.text || i.bullets[0] || '').slice(
    0,
    24
  ) || t.untitledItem
const sectionName = (t: Msg, s: Section) => s.title.trim() || t.untitledSection

/** 最长公共子序列：返回两侧未匹配的元素下标 */
function lcsDiff(a: string[], b: string[]) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  )
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
  const removed: number[] = []
  const added: number[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) removed.push(i++)
    else added.push(j++)
  }
  while (i < a.length) removed.push(i++)
  while (j < b.length) added.push(j++)
  return { removed, added }
}

const FIELDS = ['title', 'subtitle', 'location', 'tags', 'text'] as const

function diffItem(t: Msg, where: string, a: Item, b: Item, out: Change[]) {
  for (const key of FIELDS) {
    const before = String(a[key] ?? '')
    const after = String(b[key] ?? '')
    if (before !== after)
      out.push({
        kind: 'changed',
        where,
        what: t[key],
        before: plainText(before),
        after: plainText(after),
      })
  }
  const date = { style: 'dot' as const, present: t.present }
  const da = formatRange(a.start, a.end, date)
  const db = formatRange(b.start, b.end, date)
  if (da !== db)
    out.push({ kind: 'changed', where, what: t.dates, before: da, after: db })
  if (a.links.join() !== b.links.join())
    out.push({
      kind: 'changed',
      where,
      what: t.links,
      before: a.links.join('  '),
      after: b.links.join('  '),
    })
  if (!!a.hidden !== !!b.hidden)
    out.push({ kind: 'changed', where, what: b.hidden ? t.hidden : t.shown })

  const ba = a.bullets.filter((x) => x.trim())
  const bb = b.bullets.filter((x) => x.trim())
  const { removed, added } = lcsDiff(ba, bb)
  // 同一位置一删一增视为「修改」，更符合直觉
  const pairs = Math.min(removed.length, added.length)
  for (let k = 0; k < Math.max(removed.length, added.length); k++) {
    if (k < pairs)
      out.push({
        kind: 'changed',
        where,
        what: t.bullet,
        before: plainText(ba[removed[k]]),
        after: plainText(bb[added[k]]),
      })
    else if (k < removed.length)
      out.push({
        kind: 'removed',
        where,
        what: t.bullet,
        before: plainText(ba[removed[k]]),
      })
    else
      out.push({
        kind: 'added',
        where,
        what: t.bullet,
        after: plainText(bb[added[k]]),
      })
  }
}

/** 列出从 older 到 newer 的内容变化（主题变化只做概括） */
export function diffDocs(
  older: ResumeDoc,
  newer: ResumeDoc,
  lang: Lang = getLang()
): Change[] {
  const t = M[lang]
  const out: Change[] = []
  const pa = older.profile
  const pb = newer.profile
  if (pa.name !== pb.name)
    out.push({
      kind: 'changed',
      where: t.profile,
      what: t.name,
      before: pa.name,
      after: pb.name,
    })
  if (pa.headline !== pb.headline)
    out.push({
      kind: 'changed',
      where: t.profile,
      what: t.headline,
      before: pa.headline,
      after: pb.headline,
    })
  const ca = pa.contacts.map((c) => c.value.trim()).filter(Boolean)
  const cb = pb.contacts.map((c) => c.value.trim()).filter(Boolean)
  for (const v of ca)
    if (!cb.includes(v))
      out.push({
        kind: 'removed',
        where: t.profile,
        what: t.contact,
        before: v,
      })
  for (const v of cb)
    if (!ca.includes(v))
      out.push({ kind: 'added', where: t.profile, what: t.contact, after: v })
  if (pa.photo !== pb.photo)
    out.push({
      kind: 'changed',
      where: t.profile,
      what: pb.photo ? t.photoChanged : t.photoRemoved,
    })

  const sa = new Map(older.sections.map((s) => [s.id, s]))
  const sb = new Map(newer.sections.map((s) => [s.id, s]))
  for (const s of older.sections)
    if (!sb.has(s.id))
      out.push({ kind: 'removed', where: sectionName(t, s), what: t.section })
  for (const s of newer.sections) {
    const prev = sa.get(s.id)
    if (!prev) {
      out.push({ kind: 'added', where: sectionName(t, s), what: t.section })
      continue
    }
    const where = sectionName(t, s)
    if (prev.title !== s.title)
      out.push({
        kind: 'changed',
        where,
        what: t.sectionTitle,
        before: prev.title,
        after: s.title,
      })
    if (!!prev.hidden !== !!s.hidden)
      out.push({
        kind: 'changed',
        where,
        what: s.hidden ? t.sectionHidden : t.sectionShown,
      })
    if (prev.layout !== s.layout)
      out.push({ kind: 'changed', where, what: t.layout })
    const ia = new Map(prev.items.map((i) => [i.id, i]))
    const ib = new Set(s.items.map((i) => i.id))
    for (const i of prev.items)
      if (!ib.has(i.id))
        out.push({
          kind: 'removed',
          where,
          what: t.item,
          before: itemName(t, i),
        })
    for (const i of s.items) {
      const old = ia.get(i.id)
      if (!old)
        out.push({ kind: 'added', where, what: t.item, after: itemName(t, i) })
      else diffItem(t, `${where} › ${itemName(t, i)}`, old, i, out)
    }
    const orderA = prev.items.map((i) => i.id).filter((id) => ib.has(id))
    const orderB = s.items.map((i) => i.id).filter((id) => ia.has(id))
    if (orderA.join() !== orderB.join())
      out.push({ kind: 'moved', where, what: t.itemOrder })
  }
  const orderA = older.sections.map((s) => s.id).filter((id) => sb.has(id))
  const orderB = newer.sections.map((s) => s.id).filter((id) => sa.has(id))
  if (orderA.join() !== orderB.join())
    out.push({ kind: 'moved', where: t.overall, what: t.sectionOrder })
  if (JSON.stringify(older.theme) !== JSON.stringify(newer.theme))
    out.push({
      kind: 'changed',
      where: t.design,
      what:
        older.theme.name === newer.theme.name
          ? t.themeParams(themeName(newer.theme, lang))
          : t.theme,
      before: themeName(older.theme, lang),
      after: themeName(newer.theme, lang),
    })
  return out
}
