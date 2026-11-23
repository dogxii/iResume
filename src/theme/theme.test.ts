import { describe, expect, it } from 'vitest'
import { themeAttrs, themeVars } from './css'
import { isPristine, normalizeTheme } from './normalize'
import { DEFAULT_THEME, PRESETS } from './presets'

describe('theme', () => {
  it('normalizes garbage to the default theme', () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME)
    expect(
      normalizeTheme({ layout: 'nope', font: { size: 99 } }).font.size
    ).toBe(13)
  })

  it('round-trips every preset', () => {
    for (const { theme } of PRESETS) {
      expect(normalizeTheme(JSON.parse(JSON.stringify(theme)))).toEqual(theme)
      expect(isPristine(theme)).toBe(true)
    }
  })

  it('detects customisation', () => {
    const t = structuredClone(DEFAULT_THEME)
    t.color.accent = '#000000'
    expect(isPristine(t)).toBe(false)
  })

  it('produces css variables and attributes', () => {
    const vars = themeVars(DEFAULT_THEME)
    expect(vars['--r-size']).toBe('10pt')
    expect(vars['--r-page-w']).toBe('210mm')
    expect(themeAttrs(DEFAULT_THEME)['data-layout']).toBe('single')
  })

  it('has unique preset ids', () => {
    const ids = PRESETS.map((p) => p.theme.preset)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
