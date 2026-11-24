import { formatRange } from './dates'
import { plainText } from './inline'
import type { Item, ResumeDoc, Section } from './types'

export type ChangeKind = 'added' | 'removed' | 'changed' | 'moved'

export interface Change {
  kind: ChangeKind
  /** 所在位置，如「工作经历 › 星图科技」 */
  where: string
  what: string
  before?: string
  after?: string
}

const DATE = { style: 'dot' as const, present: '至今' }
const itemName = (i: Item) =>
  plainText(i.title || i.subtitle || i.text || i.bullets[0] || '').slice(
    0,
    24
  ) || '未命名条目'
const sectionName = (s: Section) => s.title.trim() || '未命名区块'

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

const FIELDS: [keyof Item, string][] = [
  ['title', '标题'],
  ['subtitle', '副标题'],
  ['location', '地点'],
  ['tags', '关键词'],
  ['text', '描述'],
]

function diffItem(where: string, a: Item, b: Item, out: Change[]) {
  for (const [key, label] of FIELDS) {
    const before = String(a[key] ?? '')
    const after = String(b[key] ?? '')
    if (before !== after)
      out.push({
        kind: 'changed',
        where,
        what: label,
        before: plainText(before),
        after: plainText(after),
      })
  }
  const da = formatRange(a.start, a.end, DATE)
  const db = formatRange(b.start, b.end, DATE)
  if (da !== db)
    out.push({ kind: 'changed', where, what: '时间', before: da, after: db })
  if (a.links.join() !== b.links.join())
    out.push({
      kind: 'changed',
      where,
      what: '链接',
      before: a.links.join('  '),
      after: b.links.join('  '),
    })
  if (!!a.hidden !== !!b.hidden)
    out.push({ kind: 'changed', where, what: b.hidden ? '已隐藏' : '已显示' })

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
        what: '要点',
        before: plainText(ba[removed[k]]),
        after: plainText(bb[added[k]]),
      })
    else if (k < removed.length)
      out.push({
        kind: 'removed',
        where,
        what: '要点',
        before: plainText(ba[removed[k]]),
      })
    else
      out.push({
        kind: 'added',
        where,
        what: '要点',
        after: plainText(bb[added[k]]),
      })
  }
}

/** 列出从 older 到 newer 的内容变化（主题变化只做概括） */
export function diffDocs(older: ResumeDoc, newer: ResumeDoc): Change[] {
  const out: Change[] = []
  const pa = older.profile
  const pb = newer.profile
  if (pa.name !== pb.name)
    out.push({
      kind: 'changed',
      where: '个人信息',
      what: '姓名',
      before: pa.name,
      after: pb.name,
    })
  if (pa.headline !== pb.headline)
    out.push({
      kind: 'changed',
      where: '个人信息',
      what: '一句话定位',
      before: pa.headline,
      after: pb.headline,
    })
  const ca = pa.contacts.map((c) => c.value.trim()).filter(Boolean)
  const cb = pb.contacts.map((c) => c.value.trim()).filter(Boolean)
  for (const v of ca)
    if (!cb.includes(v))
      out.push({
        kind: 'removed',
        where: '个人信息',
        what: '联系方式',
        before: v,
      })
  for (const v of cb)
    if (!ca.includes(v))
      out.push({ kind: 'added', where: '个人信息', what: '联系方式', after: v })
  if (pa.photo !== pb.photo)
    out.push({
      kind: 'changed',
      where: '个人信息',
      what: pb.photo ? '更换了照片' : '移除了照片',
    })

  const sa = new Map(older.sections.map((s) => [s.id, s]))
  const sb = new Map(newer.sections.map((s) => [s.id, s]))
  for (const s of older.sections)
    if (!sb.has(s.id))
      out.push({ kind: 'removed', where: sectionName(s), what: '区块' })
  for (const s of newer.sections) {
    const prev = sa.get(s.id)
    if (!prev) {
      out.push({ kind: 'added', where: sectionName(s), what: '区块' })
      continue
    }
    const where = sectionName(s)
    if (prev.title !== s.title)
      out.push({
        kind: 'changed',
        where,
        what: '区块标题',
        before: prev.title,
        after: s.title,
      })
    if (!!prev.hidden !== !!s.hidden)
      out.push({
        kind: 'changed',
        where,
        what: s.hidden ? '区块已隐藏' : '区块已显示',
      })
    if (prev.layout !== s.layout)
      out.push({ kind: 'changed', where, what: '排版方式' })
    const ia = new Map(prev.items.map((i) => [i.id, i]))
    const ib = new Set(s.items.map((i) => i.id))
    for (const i of prev.items)
      if (!ib.has(i.id))
        out.push({ kind: 'removed', where, what: '条目', before: itemName(i) })
    for (const i of s.items) {
      const old = ia.get(i.id)
      if (!old)
        out.push({ kind: 'added', where, what: '条目', after: itemName(i) })
      else diffItem(`${where} › ${itemName(i)}`, old, i, out)
    }
    const orderA = prev.items.map((i) => i.id).filter((id) => ib.has(id))
    const orderB = s.items.map((i) => i.id).filter((id) => ia.has(id))
    if (orderA.join() !== orderB.join())
      out.push({ kind: 'moved', where, what: '条目顺序' })
  }
  const orderA = older.sections.map((s) => s.id).filter((id) => sb.has(id))
  const orderB = newer.sections.map((s) => s.id).filter((id) => sa.has(id))
  if (orderA.join() !== orderB.join())
    out.push({ kind: 'moved', where: '整体', what: '区块顺序' })
  if (JSON.stringify(older.theme) !== JSON.stringify(newer.theme))
    out.push({
      kind: 'changed',
      where: '设计',
      what:
        older.theme.name === newer.theme.name
          ? `主题「${newer.theme.name}」的参数`
          : '主题',
      before: older.theme.name,
      after: newer.theme.name,
    })
  return out
}
