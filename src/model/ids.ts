let counter = 0

/** 短而唯一的 id：时间 + 计数 + 随机，足够本地使用且便于调试。 */
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1296
  const time = Date.now().toString(36).slice(-6)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}${time}${counter.toString(36).padStart(2, '0')}${rand}`
}
