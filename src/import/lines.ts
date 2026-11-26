/**
 * 导入的中间表示：不论来自 PDF、Word 还是纯文本，都先变成一行一行的文字，
 * 再由 parse.ts 统一识别区块与条目。
 */
export interface Line {
  /** 整行文字（单元格之间用两个空格连接） */
  text: string
  /**
   * 按大间距切开的单元格：PDF 里右对齐的日期、技能行的标签与内容、Word 表格的列。
   * 纯文本里用制表符或连续多个空格分隔。
   */
  cells: string[]
  /** 字号（pt）。未知时为 0 */
  size: number
  /** 左边缘位置（pt）。未知时为 0 */
  x: number
  /** 以项目符号开头（符号本身已去掉） */
  bullet: boolean
  /** 来源明确标记为标题（Word 的标题样式、Markdown 的 #、整行加粗的短行） */
  heading?: boolean
  /** 这一行与上一行属于同一段落被自动换行切开（PDF 中按位置判断；纯文本为 false） */
  wrapped?: boolean
}

/** 项目符号字形（PDF 里常常单独成为一个文字项） */
export const GLYPHS = '•●○◦▪▫■□◆◇►▶✓✔➢➤'

/** 项目符号：上面的字形与「·」、后面跟空格的 -–—*，以及「1.」「1）」「(1)」「①」 */
const BULLET = new RegExp(
  `^\\s*(?:[${GLYPHS}·]|[-–—*](?=\\s)|\\(?\\d{1,2}[.)）、](?!\\d)|[①-⑳])\\s*`
)

export function stripBullet(text: string): { text: string; bullet: boolean } {
  const m = text.match(BULLET)
  if (!m) return { text: text.trim(), bullet: false }
  return { text: text.slice(m[0].length).trim(), bullet: true }
}

const CJK = /[　-〿㐀-鿿＀-￯]/

/** 把被自动换行切开的两段文字接起来：中文之间不加空格，英文之间加一个空格 */
export function joinWrapped(a: string, b: string) {
  if (!a) return b
  if (!b) return a
  const last = a[a.length - 1]
  const first = b[0]
  if (CJK.test(last) || CJK.test(first)) return a + b
  // 在连字符处换行（front-|end）：浏览器默认不自动断词，连字符是原文的一部分
  if (last === '-' && /[a-z]/i.test(a[a.length - 2] ?? '')) return a + b
  return `${a} ${b}`
}

export function isCjk(text: string) {
  const cjk = [...text].filter((c) => CJK.test(c)).length
  const latin = (text.match(/[a-z]/gi) ?? []).length
  return cjk * 2 >= latin
}

/** 纯文本 / Markdown：每行一条，Markdown 的 # 与 ** 作为标题提示 */
export function textToLines(input: string): Line[] {
  const out: Line[] = []
  for (const raw of input.replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim()) continue
    let text = raw.trim()
    let heading = false
    const md = text.match(/^#{1,6}\s+(.*)$/)
    if (md) {
      text = md[1]
      heading = true
    }
    const boxed = text.match(/^[【[](.+?)[】\]]$/)
    if (boxed) {
      text = boxed[1]
      heading = true
    }
    const bold = text.match(/^\*\*(.+?)\*\*[:：]?$/)
    if (bold && bold[1].length <= 24) {
      text = bold[1]
      heading = true
    }
    const b = stripBullet(text)
    const cells = b.text
      .split(/\t+|\s{3,}|\s+\|\s+/)
      .map((c) => c.trim())
      .filter(Boolean)
    out.push({
      text: cells.join('  '),
      cells,
      size: 0,
      x: 0,
      bullet: b.bullet,
      heading,
    })
  }
  return out
}
