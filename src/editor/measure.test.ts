import { describe, expect, it } from 'vitest'
import { paginate, type Unit } from './measure'

const o = { start: 50, pageContent: 1000, linePx: 20 }
const u = (top: number, h: number, kind: Unit['kind'] = 'block'): Unit => ({
  top,
  bottom: top + h,
  kind,
})

describe('paginate', () => {
  it('放得下就是一页', () => {
    expect(paginate([u(50, 100), u(200, 300)], { ...o, end: 500 })).toEqual([
      [50, 500],
    ])
  })
  it('放不下的条目整体移到下一页', () => {
    const r = paginate([u(50, 800), u(900, 300)], { ...o, end: 1200 })
    expect(r).toEqual([
      [50, 900],
      [900, 1200],
    ])
  })
  it('标题跟随其后的条目一起换页', () => {
    const r = paginate([u(50, 800), u(870, 30, 'heading'), u(900, 300)], {
      ...o,
      end: 1200,
    })
    expect(r[0]).toEqual([50, 870])
  })
  it('段落按行切开，至少留两行', () => {
    const r = paginate([u(50, 900), u(960, 200, 'text')], { ...o, end: 1160 })
    expect(r[0]).toEqual([50, 1040])
    const tight = paginate([u(50, 975), u(1025, 200, 'text')], {
      ...o,
      end: 1225,
    })
    expect(tight[0]).toEqual([50, 1025])
  })
  it('比一整页还高的块按行切', () => {
    const r = paginate([u(50, 2100)], { ...o, end: 2150 })
    expect(r.map(([a, b]) => b - a)).toEqual([1000, 1000, 100])
  })
})

describe('paginate · 侧标题', () => {
  it('被拉伸的侧标题不会把整个区块推到下一页', () => {
    const r = paginate(
      [u(50, 900, 'heading'), u(50, 400), u(460, 400), u(870, 300)],
      { ...o, end: 1170 }
    )
    expect(r).toEqual([
      [50, 870],
      [870, 1170],
    ])
  })
})
