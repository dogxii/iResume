export type DateStyle = 'dot' | 'slash' | 'dash' | 'month-en' | 'cn'

export type ParsedDate =
  | { kind: 'date'; year: number; month?: number }
  | { kind: 'present' }
  | { kind: 'raw'; text: string }

const PRESENT = /^(至今|现在|今|目前|在职|present|now|current|ongoing)$/i
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const validMonth = (m: number) => m >= 1 && m <= 12

export function parseDate(input: string): ParsedDate | null {
  const text = input.trim()
  if (!text) return null
  if (PRESENT.test(text)) return { kind: 'present' }

  let m = text.match(
    /^(\d{4})\s*(?:[./\-年])\s*(\d{1,2})(?:\s*月)?(?:[./-]\d{1,2}日?)?$/
  )
  if (m && validMonth(Number(m[2]))) {
    return { kind: 'date', year: Number(m[1]), month: Number(m[2]) }
  }
  m = text.match(/^(\d{4})\s*年?$/)
  if (m) return { kind: 'date', year: Number(m[1]) }
  m = text.match(/^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/)
  if (m) {
    const index = MONTHS.findIndex(
      (name) => name.toLowerCase() === m?.[1].slice(0, 3).toLowerCase()
    )
    if (index >= 0)
      return { kind: 'date', year: Number(m[2]), month: index + 1 }
  }
  return { kind: 'raw', text }
}

/** 把「2022.07 - 2023.06」「2021.09～至今」等旧格式拆成开始 / 结束。 */
export function splitRange(input: string): [string, string] {
  const text = input.trim()
  if (!text) return ['', '']
  const spaced = text.split(/\s*(?:–|—|~|～|至(?!今)|\bto\b)\s*|\s+-\s+/)
  if (spaced.length === 2) return [spaced[0].trim(), spaced[1].trim()]
  const hyphen = text.split('-')
  if (hyphen.length === 2) {
    const [a, b] = hyphen.map((part) => part.trim())
    const pa = parseDate(a)
    const pb = parseDate(b)
    if (pa && pb && pa.kind !== 'raw' && pb.kind !== 'raw') return [a, b]
  }
  return [text, '']
}

export interface DateFormat {
  style: DateStyle
  present: string
}

export function formatDate(input: string, format: DateFormat): string {
  const parsed = parseDate(input)
  if (!parsed) return ''
  if (parsed.kind === 'present') return format.present
  if (parsed.kind === 'raw') return parsed.text
  const { year, month } = parsed
  if (month === undefined) {
    return format.style === 'cn' ? `${year}年` : String(year)
  }
  const mm = String(month).padStart(2, '0')
  switch (format.style) {
    case 'slash':
      return `${year}/${mm}`
    case 'dash':
      return `${year}-${mm}`
    case 'month-en':
      return `${MONTHS[month - 1]} ${year}`
    case 'cn':
      return `${year}年${month}月`
    default:
      return `${year}.${mm}`
  }
}

export function formatRange(
  start: string,
  end: string,
  format: DateFormat
): string {
  const a = formatDate(start, format)
  const b = formatDate(end, format)
  if (a && b) return `${a} – ${b}`
  return a || b
}

/** 用于排序与检查：返回 year*12+month，「至今」视为无穷大。 */
export function dateOrdinal(input: string): number | null {
  const parsed = parseDate(input)
  if (!parsed || parsed.kind === 'raw') return null
  if (parsed.kind === 'present') return Number.POSITIVE_INFINITY
  return parsed.year * 12 + (parsed.month ?? 1)
}
