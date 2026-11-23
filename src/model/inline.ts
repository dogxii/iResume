/** 简历正文唯一支持的行内语法：**粗体**、[文字](链接)、裸网址自动成链。 */
export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string }

const PATTERN =
  /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|((?:https?:\/\/|www\.)[^\s，。；、）)]+)/g

export function toHref(value: string): string {
  const v = value.trim()
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, '')}`
  return `https://${v.replace(/^\/+/, '')}`
}

export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let last = 0
  for (const match of source.matchAll(PATTERN)) {
    const index = match.index ?? 0
    if (index > last)
      tokens.push({ type: 'text', text: source.slice(last, index) })
    if (match[1] !== undefined) tokens.push({ type: 'bold', text: match[1] })
    else if (match[2] !== undefined)
      tokens.push({ type: 'link', text: match[2], href: toHref(match[3]) })
    else tokens.push({ type: 'link', text: match[4], href: toHref(match[4]) })
    last = index + match[0].length
  }
  if (last < source.length)
    tokens.push({ type: 'text', text: source.slice(last) })
  return tokens
}

/** 去掉行内标记后的纯文本，用于写作检查与纯文本导出。 */
export function plainText(source: string): string {
  return parseInline(source)
    .map((token) => token.text)
    .join('')
}

/** 把「- 一行」「• 一行」形式的多行文本拆成要点数组。 */
export function splitBullets(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-•·▪–]\s*|\*(?!\*)\s*|\d{1,2}(?:[.)]\s+|、))/, '')
        .trim()
    )
    .filter(Boolean)
}

/**
 * 把「去掉标记后的纯文本」中的光标位置映射回原始文本位置。
 * 用于：点击已渲染的粗体 / 链接后切换回源码编辑时，光标仍停在原处。
 */
export function plainToRawOffset(source: string, plainOffset: number): number {
  let raw = 0
  let plain = 0
  const advance = (rawStart: number, prefix: number, text: string) => {
    if (plainOffset <= plain + text.length)
      return rawStart + prefix + (plainOffset - plain)
    plain += text.length
    return null
  }
  for (const match of source.matchAll(PATTERN)) {
    const index = match.index ?? 0
    const between = source.slice(raw, index)
    const hit = advance(raw, 0, between)
    if (hit !== null) return hit
    const inner = match[1] ?? match[2] ?? match[4] ?? ''
    const prefix = match[1] !== undefined ? 2 : match[2] !== undefined ? 1 : 0
    const inside = advance(index, prefix, inner)
    if (inside !== null) return inside
    raw = index + match[0].length
  }
  return Math.min(source.length, raw + (plainOffset - plain))
}
