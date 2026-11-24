import { describe, expect, it } from 'vitest'
import { ACCENTS, PRESETS } from './presets'

/** WCAG 2 相对亮度与对比度 */
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((x) =>
    x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

describe('颜色对比度（WCAG AA 4.5:1）', () => {
  it.each(ACCENTS)('强调色 %s 在白纸上可读', (c) => {
    expect(contrast(c, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
  it.each(PRESETS.map((p) => [p.theme.name, p.theme] as const))(
    '预设「%s」的文字颜色',
    (_, t) => {
      for (const c of [t.color.ink, t.color.muted, t.color.accent]) {
        expect(contrast(c, '#ffffff')).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c, t.color.aside)).toBeGreaterThanOrEqual(4.5)
      }
    }
  )
})
