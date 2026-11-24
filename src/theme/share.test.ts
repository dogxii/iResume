import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import { decodeTheme, encodeTheme, themeLink } from './share'

describe('theme share', () => {
  it('预设原样只编码 id 与名称', () => {
    const t = structuredClone(PRESETS[1].theme)
    const code = encodeTheme(t)
    expect(code.length).toBeLessThan(80)
    expect(decodeTheme(code)).toEqual(t)
  })
  it('自定义参数往返无损', () => {
    const t = structuredClone(PRESETS[3].theme)
    t.name = '我的蓝色双栏'
    t.color.accent = '#1d4ed8'
    t.font.size = 10.5
    t.aside = ['skills']
    t.heading.caps = !t.heading.caps
    const code = encodeTheme(t)
    expect(code).toMatch(/^[\w-]+$/)
    expect(code.length).toBeLessThan(200)
    expect(decodeTheme(code)).toEqual(t)
  })
  it('非法内容被拒绝或修正', () => {
    expect(decodeTheme('%%%')).toBeNull()
    expect(decodeTheme('')).toBeNull()
    const evil = btoa(
      JSON.stringify({
        preset: 'clean',
        color: { accent: 'url(javascript:x)' },
        font: { size: 99 },
      })
    )
    const t = decodeTheme(evil.replace(/=+$/, ''))
    expect(t?.color.accent).toBe(PRESETS[0].theme.color.accent)
    expect(t?.font.size).toBeLessThanOrEqual(13)
  })
  it('生成完整链接', () => {
    expect(themeLink(PRESETS[0].theme, 'https://x.dev/')).toMatch(
      /^https:\/\/x\.dev\/#\/theme\/[\w-]+$/
    )
  })
})
