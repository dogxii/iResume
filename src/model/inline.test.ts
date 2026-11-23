import { describe, expect, it } from 'vitest'
import {
  parseInline,
  plainText,
  plainToRawOffset,
  splitBullets,
  toHref,
} from './inline'

describe('parseInline', () => {
  it('parses bold, links and bare urls', () => {
    expect(
      parseInline('提升 **30%**，见 [文档](docs.dev) 和 https://a.com/x。')
    ).toEqual([
      { type: 'text', text: '提升 ' },
      { type: 'bold', text: '30%' },
      { type: 'text', text: '，见 ' },
      { type: 'link', text: '文档', href: 'https://docs.dev' },
      { type: 'text', text: ' 和 ' },
      { type: 'link', text: 'https://a.com/x', href: 'https://a.com/x' },
      { type: 'text', text: '。' },
    ])
  })

  it('strips markup for plain text', () => {
    expect(plainText('**粗** [链接](x.com)')).toBe('粗 链接')
  })
})

describe('toHref', () => {
  it.each([
    ['a@b.co', 'mailto:a@b.co'],
    ['+86 138 0000 0000', 'tel:+8613800000000'],
    ['github.com/x', 'https://github.com/x'],
    ['http://x.dev', 'http://x.dev'],
  ])('%s', (input, expected) => expect(toHref(input)).toBe(expected))
})

describe('splitBullets', () => {
  it('removes list markers but keeps bold and decimals', () => {
    expect(
      splitBullets('- 一\n• 二\n\n1. 三\n**粗体**开头\n3.5 倍提升')
    ).toEqual(['一', '二', '三', '**粗体**开头', '3.5 倍提升'])
  })
})

describe('plainToRawOffset', () => {
  const raw = 'a**bc**d[ef](x.com)g'
  it.each([
    [0, 0],
    [1, 1],
    [2, 4],
    [3, 5],
    [4, 8],
    [5, 10],
    [6, 11],
    [7, 20],
  ])('plain %i → raw %i', (p, r) => expect(plainToRawOffset(raw, p)).toBe(r))
})
