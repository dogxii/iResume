const fmt = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
export function ago(iso: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, s] of units)
    if (Math.abs(diff) >= s) return fmt.format(Math.round(diff / s), unit)
  return '刚刚'
}

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
