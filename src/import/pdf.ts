import type { Line } from './lines'
import { stripBullet } from './lines'

/** pdf.js 文字项的精简形式（坐标单位 pt，y 轴向上） */
export interface PdfItem {
  str: string
  x: number
  y: number
  w: number
  h: number
}

interface Raw {
  items: PdfItem[]
  size: number
  y: number
}

const BULLET_GLYPH = /^[•●○◦▪▫■□◆◇►▶✓✔➢➤]$/

/**
 * 把一页页的文字项还原成行。
 * - 先找竖向的栏间空白：没有任何文字跨过它、且左边一栏有正文（不只是侧标题）时，按两栏分别读；
 * - 每栏内按从上到下、从左到右排序，同一基线上的文字合成一行；
 * - 行内的大间距（右对齐的日期、表格列）切成单元格；行中间出现列表符号时（时间线版式里日期与要点同行）拆成两行；
 * - 自动换行：与上一行左边缘对齐、上一行几乎写满整栏宽度时，视为同一段落。
 */
export function itemsToLines(pages: PdfItem[][]): Line[] {
  const out: Line[] = []
  for (const page of pages) {
    const items = page.filter((it) => it.str.trim())
    for (const column of splitColumns(items)) {
      const sorted = [...column].sort((a, b) => b.y - a.y || a.x - b.x)
      const raws: Raw[] = []
      let cur: Raw | null = null
      for (const it of sorted) {
        const tol = Math.max(1.5, Math.min(it.h, cur?.size ?? it.h) * 0.3)
        if (!cur || Math.abs(cur.y - it.y) > tol) {
          cur = { items: [], size: 0, y: it.y }
          raws.push(cur)
        }
        cur.items.push(it)
        cur.size = Math.max(cur.size, it.h)
      }
      const lines = raws.flatMap(toLines)
      const rightEdge = (l: Built) =>
        Math.max(
          ...lines
            .filter((o) => Math.abs(o.left - l.left) < 24)
            .map((o) => o.right)
        )
      lines.forEach((l, i) => {
        const prev = lines[i - 1]
        if (prev) {
          const dy = prev.y - l.y
          l.line.gap = dy > 0 ? Math.max(0, dy / Math.max(1, l.size) - 1.6) : 0
          l.line.wrapped =
            !l.line.bullet &&
            dy > 0 &&
            dy <= l.size * 1.9 &&
            Math.abs(prev.size - l.size) < 0.3 &&
            // 与上一行左对齐；或者上一行是要点，这一行与要点文字对齐（缩进不超过一个半字）
            (Math.abs(l.left - prev.left) < 2.5 ||
              (prev.line.bullet &&
                l.left > prev.left &&
                l.left - prev.left < l.size * 1.5)) &&
            prev.line.cells.length === 1 &&
            l.line.cells.length === 1 &&
            // 上一行写不下这一行的第一个词，才是自动换行
            prev.right + firstWord(l) >= rightEdge(prev) - 2
        }
        out.push(l.line)
      })
    }
  }
  return out
}

/** 这一行第一个词（中文是第一个字）的宽度，按这一行的平均字宽估算 */
function firstWord(l: Built) {
  const text = l.line.text
  const avg = (l.right - l.left) / Math.max(1, text.length)
  const word = text.match(/^[^\s\u3400-\u9fff]+/)?.[0] ?? text[0] ?? ''
  return (word.length + 1) * avg
}

/** 双栏版式：找一条没有任何文字跨过的竖线，把一页分成左右两栏 */
function splitColumns(items: PdfItem[]): PdfItem[][] {
  if (items.length < 8) return [items]
  const left = Math.min(...items.map((i) => i.x))
  const right = Math.max(...items.map((i) => i.x + i.w))
  const width = right - left
  let best: [number, number] | null = null
  let run: [number, number] | null = null
  for (let g = left + width * 0.15; g <= left + width * 0.7; g += 1) {
    const crossed = items.some((i) => i.x < g - 0.5 && i.x + i.w > g + 0.5)
    if (crossed) {
      run = null
      continue
    }
    run = run ? [run[0], g] : [g, g]
    if (!best || run[1] - run[0] > best[1] - best[0]) best = [run[0], run[1]]
  }
  if (!best || best[1] - best[0] < 8) return [items]
  const mid = (best[0] + best[1]) / 2
  const a = items.filter((i) => i.x < mid)
  const b = items.filter((i) => i.x >= mid)
  // 侧标题版式：左边只有几个短标题，不算一栏
  const text = a.map((i) => i.str).join('')
  if (a.length < 8 || text.length < 40) return [items]
  return [a, b]
}

interface Built {
  line: Line
  y: number
  size: number
  left: number
  right: number
}

/** 一条基线上的文字 → 一行或几行 */
function toLines(raw: Raw): Built[] {
  const items = [...raw.items].sort((a, b) => a.x - b.x)
  // 行中间的列表符号：之前的部分（时间线里的日期）单独成行
  const at = items.findIndex(
    (it, i) => i > 0 && BULLET_GLYPH.test(it.str.trim()) && i < items.length - 1
  )
  if (at > 0)
    return [
      ...toLines({ ...raw, items: items.slice(0, at) }),
      ...toLines({ ...raw, items: items.slice(at) }),
    ]
  const size = Math.round(Math.max(...items.map((i) => i.h)) * 10) / 10
  let bullet = false
  if (items.length > 1 && BULLET_GLYPH.test(items[0].str.trim())) {
    bullet = true
    items.shift()
  }
  const cells: { text: string; size: number; end: number }[] = []
  let end = Number.NEGATIVE_INFINITY
  for (const it of items) {
    const gap = it.x - end
    let cell = cells[cells.length - 1]
    // 词间空格约 0.3em；超过一个字宽的间距是分栏（右对齐的日期、技能标签与内容、标签之间）
    if (!cell || gap > Math.max(size * 1.1, 8)) {
      cell = { text: '', size: 0, end: 0 }
      cells.push(cell)
    } else if (
      gap > size * 0.15 &&
      !/\s$/.test(cell.text) &&
      !/^\s/.test(it.str)
    )
      cell.text += ' '
    cell.text += it.str
    cell.size = Math.max(cell.size, it.h)
    end = Math.max(end, it.x + it.w)
    cell.end = end
  }
  for (const c of cells) c.text = c.text.replace(/\s+/g, ' ').trim()
  const kept = cells.filter((c) => c.text)
  // 「• 」作为普通文字写在行首的情况
  if (!bullet && kept[0]) {
    const b = stripBullet(kept[0].text)
    // 「– 」也是常见的列表符号，但「– 至今」是被换到下一行的结束时间
    const dash =
      /^[-–—]\s/.test(kept[0].text) && !/^(?:\d{4}|至今|present)/i.test(b.text)
    if (b.bullet && (dash || /^[•●○◦▪▫■□◆◇►▶✓✔➢➤]/.test(kept[0].text))) {
      bullet = true
      kept[0].text = b.text
    }
  }
  const make = (cs: typeof kept, x: number, isBullet: boolean): Built => ({
    line: {
      text: cs.map((c) => c.text).join('  '),
      cells: cs.map((c) => c.text),
      size: Math.round(Math.max(...cs.map((c) => c.size)) * 10) / 10,
      x: Math.round(x),
      bullet: isBullet,
      gap: 0,
    },
    y: raw.y,
    size: Math.max(...cs.map((c) => c.size)),
    left: x,
    right: cs[cs.length - 1].end,
  })
  const x = items[0]?.x ?? 0
  // 同一基线上字号明显不同的第一个单元格（侧标题与条目同行）单独成行
  if (
    !bullet &&
    kept.length > 1 &&
    Math.abs(kept[0].size - Math.max(...kept.slice(1).map((c) => c.size))) > 0.8
  ) {
    const second = items.find((it) => it.x >= kept[0].end - 0.5 && it.x > x)
    return [
      make([kept[0]], x, false),
      make(kept.slice(1), second?.x ?? x, false),
    ]
  }
  return kept.length ? [make(kept, x, bullet)] : []
}

/** 读取 PDF 文件（按需加载 pdf.js，不进入首屏包） */
export async function readPdf(data: ArrayBuffer): Promise<Line[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(data) })
  const doc = await task.promise
  const pages: PdfItem[][] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    pages.push(
      content.items.flatMap((it) =>
        'str' in it
          ? [
              {
                str: it.str,
                x: it.transform[4],
                y: it.transform[5],
                w: it.width,
                h: it.height,
              },
            ]
          : []
      )
    )
  }
  await task.destroy()
  return itemsToLines(pages)
}
