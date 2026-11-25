import { type Line, stripBullet } from './lines'

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}
const decode = (s: string) =>
  s.replace(/&(#x?[\da-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' || e[1] === 'X'
          ? Number.parseInt(e.slice(2), 16)
          : Number(e.slice(1))
      )
    return ENTITIES[e.toLowerCase()] ?? m
  })
const strip = (html: string) => decode(html.replace(/<[^>]+>/g, ''))

/**
 * mammoth 转出的 HTML → 行。mammoth 的输出很规整：段落 p、标题 h1–h6、列表 li、表格 tr/td，
 * 行内只有 strong / em / a / br，所以用正则就够了（也能在没有 DOM 的单元测试里运行）。
 */
export function htmlToLines(html: string): Line[] {
  const out: Line[] = []
  const push = (
    text: string,
    o: { heading?: boolean; bullet?: boolean; cells?: string[] }
  ) => {
    const b = o.bullet ? { text: text.trim(), bullet: true } : stripBullet(text)
    const cells = (
      o.cells ?? b.text.split(/\t+|\s{3,}/).map((c) => c.trim())
    ).filter(Boolean)
    if (!cells.length) return
    out.push({
      text: cells.join('  '),
      cells,
      size: 0,
      x: 0,
      bullet: b.bullet,
      heading: o.heading,
      gap: 0,
    })
  }
  const blocks =
    /<table\b[^>]*>([\s\S]*?)<\/table>|<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\2>/gi
  for (const m of html.matchAll(blocks)) {
    if (m[1] !== undefined) {
      // 表格：每行一条，单元格保留（很多简历用表格排版：左边公司、右边日期）
      for (const row of m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [
          ...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
        ].flatMap((c) =>
          // 单元格里的多个段落各成一行
          c[1].includes('<p')
            ? [...c[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((p) =>
                strip(p[1]).trim()
              )
            : [strip(c[1]).trim()]
        )
        const kept = cells.filter(Boolean)
        if (kept.length) push(kept.join('  '), { cells: kept })
      }
      continue
    }
    const tag = m[2].toLowerCase()
    const inner = m[3]
    // 整段加粗的短行当作标题提示
    const plain = strip(inner).trim()
    const bold =
      /^<strong>[\s\S]*<\/strong>$/i.test(inner.trim()) && plain.length <= 24
    for (const part of inner.split(/<br\s*\/?>/i)) {
      push(strip(part), {
        heading: tag[0] === 'h' || bold,
        bullet: tag === 'li',
      })
    }
  }
  return out
}

/** 读取 Word 文档（按需加载 mammoth，不进入首屏包） */
export async function readDocx(data: ArrayBuffer): Promise<Line[]> {
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer: data })
  return htmlToLines(result.value)
}
