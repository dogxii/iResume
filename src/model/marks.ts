import { defineMessages, getLang, type Lang } from '../i18n'
import { plainText } from './inline'
import type { Item, ResumeDoc, Section } from './types'

/**
 * 修改标记：对比基准与当前内容，得到「纸面上哪里变了」。
 * 与 diff.ts（历史版本的文字清单）不同，这里每一处都带有纸面锚点和撤回方法。
 */

const M = defineMessages(
  {
    name: '姓名',
    headline: '一句话定位',
    contact: '联系方式',
    section: '区块',
    sectionTitle: '区块标题',
    item: '条目',
    bullet: '要点',
    title: '标题',
    subtitle: '副标题',
    location: '地点',
    tags: '关键词',
    text: '描述',
    start: '开始时间',
    end: '结束时间',
    links: '链接',
  },
  {
    name: 'Name',
    headline: 'Headline',
    contact: 'Contact',
    section: 'Section',
    sectionTitle: 'Section title',
    item: 'Entry',
    bullet: 'Bullet',
    title: 'Title',
    subtitle: 'Subtitle',
    location: 'Location',
    tags: 'Keywords',
    text: 'Description',
    start: 'Start date',
    end: 'End date',
    links: 'Links',
  }
)

export type MarkKind = 'added' | 'changed' | 'removed'

/**
 * 纸面锚点（CSS 选择器）：
 * - 新增 / 修改：标记画在 `el` 的高度范围内；`el` 不可见时退到 `fallback`；
 * - 删除：标记画在 `before` 的顶部，没有时画在 `after` 的底部。
 */
export interface Anchor {
  el?: string
  fallback?: string
  before?: string
  after?: string
}

export interface Mark {
  /** 稳定 id，用于 React key 与「下一处」定位 */
  id: string
  kind: MarkKind
  anchor: Anchor
  label: string
  before?: string
  after?: string
  /** 在当前内容的草稿上撤回这一处 */
  revert(draft: ResumeDoc): void
}

const q = (attr: string, value: string) =>
  `[${attr}="${value.replace(/["\\]/g, '\\$&')}"]`
const fieldSel = (key: string) => q('data-fkey', key)
const itemSel = (id: string) => q('data-item', id)
const sectionSel = (id: string) => q('data-section', id)

const ITEM_FIELDS = [
  'title',
  'subtitle',
  'location',
  'tags',
  'text',
  'start',
  'end',
] as const

/** 对齐两个序列：返回按顺序排列的相同 / 删除 / 新增操作 */
export function align<T>(
  a: T[],
  b: T[],
  same: (x: T, y: T) => boolean = (x, y) => x === y
): { op: 'eq' | 'del' | 'add'; a?: number; b?: number }[] {
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  )
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = same(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ops: { op: 'eq' | 'del' | 'add'; a?: number; b?: number }[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (same(a[i], b[j])) ops.push({ op: 'eq', a: i++, b: j++ })
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ op: 'del', a: i++ })
    else ops.push({ op: 'add', b: j++ })
  }
  while (i < n) ops.push({ op: 'del', a: i++ })
  while (j < m) ops.push({ op: 'add', b: j++ })
  return ops
}

/** 词级对比：中文按字、英文按词，用于弹层里的前后对照 */
export function wordDiff(
  before: string,
  after: string
): { type: 'same' | 'del' | 'add'; text: string }[] {
  const tokens = (s: string) =>
    s.match(/[\u3400-\u9fff\uf900-\ufaff]|[\p{L}\p{N}_]+|\s+|[^\s]/gu) ?? []
  const a = tokens(before)
  const b = tokens(after)
  // 过长的文本不做细分，避免 O(n·m) 过大
  if (a.length * b.length > 250_000)
    return [
      { type: 'del', text: before },
      { type: 'add', text: after },
    ]
  const ops = align(a, b).map((o) =>
    o.op === 'add'
      ? { op: o.op, text: b[o.b as number] }
      : { op: o.op as 'eq' | 'del' | 'both', text: a[o.a as number] }
  )
  // 夹在两处改动之间的空格算进改动里，让「the team → two teams」整体显示
  ops.forEach((o, i) => {
    if (
      o.op === 'eq' &&
      /^\s+$/.test(o.text) &&
      ops[i - 1] &&
      ops[i - 1].op !== 'eq' &&
      ops[i + 1] &&
      ops[i + 1].op !== 'eq'
    )
      o.op = 'both'
  })
  const out: { type: 'same' | 'del' | 'add'; text: string }[] = []
  let del = ''
  let add = ''
  const flush = () => {
    if (del) out.push({ type: 'del', text: del })
    if (add) out.push({ type: 'add', text: add })
    del = ''
    add = ''
  }
  for (const o of ops) {
    if (o.op === 'eq') {
      flush()
      const last = out[out.length - 1]
      if (last?.type === 'same') last.text += o.text
      else out.push({ type: 'same', text: o.text })
      continue
    }
    if (o.op !== 'add') del += o.text
    if (o.op !== 'del') add += o.text
  }
  flush()
  return out
}

/** 两段文字是否相近（字二元组的 Dice 系数），用于判断是「改写」还是「换了一条」 */
export function similar(a: string, b: string) {
  const grams = (s: string) => {
    const t = plainText(s).toLowerCase().replace(/\s+/g, '')
    const out = new Map<string, number>()
    for (let i = 0; i < t.length - 1; i++) {
      const g = t.slice(i, i + 2)
      out.set(g, (out.get(g) ?? 0) + 1)
    }
    return { out, n: Math.max(0, t.length - 1), t }
  }
  const x = grams(a)
  const y = grams(b)
  if (!x.n || !y.n) return x.t === y.t
  let both = 0
  for (const [g, c] of x.out) both += Math.min(c, y.out.get(g) ?? 0)
  return (2 * both) / (x.n + y.n) >= 0.35
}

const findSection = (d: ResumeDoc, id: string) =>
  d.sections.find((s) => s.id === id)
const findItem = (d: ResumeDoc, sid: string, iid: string) =>
  findSection(d, sid)?.items.find((i) => i.id === iid)

const itemLabel = (i: Item) =>
  plainText(i.title || i.subtitle || i.text || i.bullets.find(Boolean) || '')

/** 把一段「删除 + 新增」配对成修改，多出来的算删除或新增 */
function hunks(ops: ReturnType<typeof align>) {
  const out: {
    del: number[]
    add: number[]
    prevB?: number
    nextB?: number
  }[] = []
  let cur: { del: number[]; add: number[]; prevB?: number } | null = null
  let lastB: number | undefined
  for (const o of ops) {
    if (o.op === 'eq') {
      if (cur) out.push({ ...cur, nextB: o.b })
      cur = null
      lastB = o.b
      continue
    }
    cur ??= { del: [], add: [], prevB: lastB }
    if (o.op === 'del') cur.del.push(o.a as number)
    else cur.add.push(o.b as number)
  }
  if (cur) out.push(cur)
  return out
}

function itemMarks(
  t: (typeof M)['zh'],
  sid: string,
  base: Item,
  cur: Item,
  out: Mark[]
) {
  const iid = cur.id
  for (const f of ITEM_FIELDS) {
    const before = String(base[f] ?? '')
    const after = String(cur[f] ?? '')
    if (before === after) continue
    out.push({
      id: `${iid}:${f}`,
      kind: 'changed',
      anchor: { el: fieldSel(`${iid}:${f}`), fallback: itemSel(iid) },
      label: t[f],
      before: plainText(before),
      after: plainText(after),
      revert: (d) => {
        const it = findItem(d, sid, iid)
        if (it) it[f] = before
      },
    })
  }
  if (base.links.join('\n') !== cur.links.join('\n')) {
    const before = [...base.links]
    out.push({
      id: `${iid}:links`,
      kind: 'changed',
      anchor: { el: fieldSel(`${iid}:links`), fallback: itemSel(iid) },
      label: t.links,
      before: base.links.join('  '),
      after: cur.links.join('  '),
      revert: (d) => {
        const it = findItem(d, sid, iid)
        if (it) it.links = [...before]
      },
    })
  }

  // 要点：按文字对齐（只看非空要点，保留它们在原数组里的位置）
  const idx = (bs: string[]) => bs.flatMap((b, i) => (b.trim() ? [i] : []))
  const ai = idx(base.bullets)
  const bi = idx(cur.bullets)
  const ops = align(
    ai.map((i) => base.bullets[i]),
    bi.map((i) => cur.bullets[i])
  )
  const bulletSel = (j: number) => fieldSel(`${iid}:b:${bi[j]}`)
  for (const h of hunks(ops)) {
    // 只把内容相近的「删 + 增」看成修改；不相干的仍然是一删一增
    const matched: [number, number][] = []
    let from = 0
    for (const d of h.del) {
      const before = base.bullets[ai[d]]
      const at = h.add.findIndex(
        (k, n) => n >= from && similar(before, cur.bullets[bi[k]])
      )
      if (at < 0) continue
      matched.push([d, h.add[at]])
      from = at + 1
    }
    const addedKs = h.add.filter((k) => !matched.some((m) => m[1] === k))
    const removedKs = h.del.filter((k) => !matched.some((m) => m[0] === k))
    for (const [d, k] of matched) {
      const raw = bi[k]
      const before = base.bullets[ai[d]]
      out.push({
        id: `${iid}:b:${raw}`,
        kind: 'changed',
        anchor: { el: bulletSel(k), fallback: itemSel(iid) },
        label: t.bullet,
        before: plainText(before),
        after: plainText(cur.bullets[raw]),
        revert: (d) => {
          const it = findItem(d, sid, iid)
          if (it && raw < it.bullets.length) it.bullets[raw] = before
        },
      })
    }
    for (const k of addedKs) {
      const raw = bi[k]
      const text = cur.bullets[raw]
      out.push({
        id: `${iid}:b:${raw}`,
        kind: 'added',
        anchor: { el: bulletSel(k), fallback: itemSel(iid) },
        label: t.bullet,
        after: plainText(text),
        revert: (d) => {
          const it = findItem(d, sid, iid)
          const at = it?.bullets.indexOf(text) ?? -1
          if (it && at >= 0) it.bullets.splice(at, 1)
        },
      })
    }
    const removed = removedKs.map((k) => base.bullets[ai[k]])
    if (removed.length) {
      // 插回到下一条保留要点之前（没有则放到最后）
      const anchorText =
        h.nextB !== undefined ? cur.bullets[bi[h.nextB]] : undefined
      out.push({
        id: `${iid}:b-del:${h.nextB ?? 'end'}`,
        kind: 'removed',
        anchor: {
          before: h.nextB !== undefined ? bulletSel(h.nextB) : undefined,
          after:
            h.prevB !== undefined
              ? bulletSel(h.prevB)
              : fieldSel(`${iid}:title`),
          fallback: itemSel(iid),
        },
        label: t.bullet,
        before: removed.map(plainText).join('\n'),
        revert: (d) => {
          const it = findItem(d, sid, iid)
          if (!it) return
          const at =
            anchorText !== undefined ? it.bullets.indexOf(anchorText) : -1
          // 只剩一条空要点时直接替换，避免留下空行
          if (it.bullets.length === 1 && !it.bullets[0].trim())
            it.bullets = [...removed]
          else
            it.bullets.splice(at >= 0 ? at : it.bullets.length, 0, ...removed)
        },
      })
    }
  }
}

function sectionMarks(
  t: (typeof M)['zh'],
  base: Section,
  cur: Section,
  out: Mark[]
) {
  const sid = cur.id
  if (base.title !== cur.title) {
    const before = base.title
    out.push({
      id: `${sid}:title`,
      kind: 'changed',
      anchor: { el: fieldSel(`${sid}:title`), fallback: sectionSel(sid) },
      label: t.sectionTitle,
      before,
      after: cur.title,
      revert: (d) => {
        const s = findSection(d, sid)
        if (s) s.title = before
      },
    })
  }
  const ops = align(base.items, cur.items, (x, y) => x.id === y.id)
  for (const o of ops) {
    if (o.op === 'eq')
      itemMarks(
        t,
        sid,
        base.items[o.a as number],
        cur.items[o.b as number],
        out
      )
  }
  for (const h of hunks(ops)) {
    for (const k of h.add) {
      const it = cur.items[k]
      out.push({
        id: `${it.id}:item`,
        kind: 'added',
        anchor: { el: itemSel(it.id) },
        label: t.item,
        after: itemLabel(it),
        revert: (d) => {
          const s = findSection(d, sid)
          if (s) s.items = s.items.filter((x) => x.id !== it.id)
        },
      })
    }
    for (const k of h.del) {
      const it = base.items[k]
      const nextId = h.nextB !== undefined ? cur.items[h.nextB].id : undefined
      const prevId = h.prevB !== undefined ? cur.items[h.prevB].id : undefined
      out.push({
        id: `${it.id}:item-del`,
        kind: 'removed',
        anchor: {
          before: nextId ? itemSel(nextId) : undefined,
          after: prevId ? itemSel(prevId) : fieldSel(`${sid}:title`),
          fallback: sectionSel(sid),
        },
        label: t.item,
        before: itemLabel(it),
        revert: (d) => {
          const s = findSection(d, sid)
          if (!s || s.items.some((x) => x.id === it.id)) return
          const at = nextId ? s.items.findIndex((x) => x.id === nextId) : -1
          s.items.splice(at >= 0 ? at : s.items.length, 0, structuredClone(it))
        },
      })
    }
  }
}

/** 从 base 到 cur 的修改标记（只看内容，不看主题） */
export function computeMarks(
  base: ResumeDoc,
  cur: ResumeDoc,
  lang: Lang = getLang()
): Mark[] {
  const t = M[lang]
  const out: Mark[] = []
  const pa = base.profile
  const pb = cur.profile
  for (const f of ['name', 'headline'] as const) {
    if (pa[f] === pb[f]) continue
    const before = pa[f]
    out.push({
      id: `profile:${f}`,
      kind: 'changed',
      anchor: { el: fieldSel(`profile:${f}`), fallback: itemSel('profile') },
      label: t[f],
      before,
      after: pb[f],
      revert: (d) => {
        d.profile[f] = before
      },
    })
  }
  const cops = align(pa.contacts, pb.contacts, (x, y) => x.id === y.id)
  for (const o of cops) {
    const c = o.b !== undefined ? pb.contacts[o.b] : undefined
    const old = o.a !== undefined ? pa.contacts[o.a] : undefined
    if (o.op === 'eq' && c && old && c.value !== old.value) {
      out.push({
        id: `contact:${c.id}`,
        kind: c.value.trim()
          ? old.value.trim()
            ? 'changed'
            : 'added'
          : 'removed',
        anchor: {
          el: fieldSel(`contact:${c.id}`),
          before: fieldSel(`contact:${c.id}`),
          fallback: itemSel('profile'),
        },
        label: t.contact,
        before: old.value,
        after: c.value,
        revert: (d) => {
          const x = d.profile.contacts.find((y) => y.id === c.id)
          if (x) x.value = old.value
        },
      })
    } else if (o.op === 'add' && c?.value.trim()) {
      out.push({
        id: `contact:${c.id}`,
        kind: 'added',
        anchor: {
          el: fieldSel(`contact:${c.id}`),
          fallback: itemSel('profile'),
        },
        label: t.contact,
        after: c.value,
        revert: (d) => {
          d.profile.contacts = d.profile.contacts.filter((y) => y.id !== c.id)
        },
      })
    } else if (o.op === 'del' && old?.value.trim()) {
      out.push({
        id: `contact-del:${old.id}`,
        kind: 'removed',
        anchor: { after: itemSel('profile'), fallback: itemSel('profile') },
        label: t.contact,
        before: old.value,
        revert: (d) => {
          if (!d.profile.contacts.some((y) => y.id === old.id))
            d.profile.contacts.push(structuredClone(old))
        },
      })
    }
  }

  const sops = align(base.sections, cur.sections, (x, y) => x.id === y.id)
  for (const o of sops)
    if (o.op === 'eq')
      sectionMarks(
        t,
        base.sections[o.a as number],
        cur.sections[o.b as number],
        out
      )
  for (const h of hunks(sops)) {
    for (const k of h.add) {
      const s = cur.sections[k]
      out.push({
        id: `${s.id}:section`,
        kind: 'added',
        anchor: { el: sectionSel(s.id) },
        label: t.section,
        after: s.title,
        revert: (d) => {
          d.sections = d.sections.filter((x) => x.id !== s.id)
        },
      })
    }
    for (const k of h.del) {
      const s = base.sections[k]
      const nextId =
        h.nextB !== undefined ? cur.sections[h.nextB].id : undefined
      const prevId =
        h.prevB !== undefined ? cur.sections[h.prevB].id : undefined
      out.push({
        id: `${s.id}:section-del`,
        kind: 'removed',
        anchor: {
          before: nextId ? sectionSel(nextId) : undefined,
          after: prevId ? sectionSel(prevId) : itemSel('profile'),
        },
        label: t.section,
        before: s.title,
        revert: (d) => {
          if (d.sections.some((x) => x.id === s.id)) return
          const at = nextId ? d.sections.findIndex((x) => x.id === nextId) : -1
          d.sections.splice(
            at >= 0 ? at : d.sections.length,
            0,
            structuredClone(s)
          )
        },
      })
    }
  }
  return out
}
