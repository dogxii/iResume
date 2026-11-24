import { getLang, intlLocale } from '../i18n'

const formats = new Map<string, Intl.RelativeTimeFormat>()
const relative = (locale: string) => {
  let f = formats.get(locale)
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    formats.set(locale, f)
  }
  return f
}

export function ago(iso: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const fmt = relative(intlLocale())
  for (const [unit, s] of units)
    if (Math.abs(diff) >= s) return fmt.format(Math.round(diff / s), unit)
  return getLang() === 'en' ? 'just now' : '刚刚'
}

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString(intlLocale(), {
    month: getLang() === 'en' ? 'short' : 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
