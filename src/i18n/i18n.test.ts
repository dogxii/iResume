import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineMessages, getLang, setLang, tr } from '.'

const M = defineMessages(
  { hello: '你好', pages: (n: number) => `${n} 页` },
  {
    hello: 'Hello',
    pages: (n: number) => `${n} ${n === 1 ? 'page' : 'pages'}`,
  }
)

describe('i18n', () => {
  afterEach(() => {
    setLang('zh')
    vi.unstubAllGlobals()
  })

  it('按当前语言取文案，切换后立即生效', () => {
    setLang('zh')
    expect(tr(M).hello).toBe('你好')
    expect(tr(M).pages(2)).toBe('2 页')
    setLang('en')
    expect(getLang()).toBe('en')
    expect(tr(M).hello).toBe('Hello')
    expect(tr(M).pages(1)).toBe('1 page')
    expect(tr(M).pages(3)).toBe('3 pages')
  })

  it('记住选择并同步 <html lang>', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
    vi.stubGlobal('document', { documentElement: { lang: '' } })
    setLang('en')
    expect(localStorage.getItem('iresume-lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    setLang('zh')
    expect(document.documentElement.lang).toBe('zh-CN')
  })
})
