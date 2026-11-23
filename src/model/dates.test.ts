import { describe, expect, it } from 'vitest'
import {
  dateOrdinal,
  formatDate,
  formatRange,
  parseDate,
  splitRange,
} from './dates'

const dot = { style: 'dot' as const, present: '至今' }

describe('parseDate', () => {
  it.each([
    ['2023.07', { kind: 'date', year: 2023, month: 7 }],
    ['2023-7', { kind: 'date', year: 2023, month: 7 }],
    ['2023/07/15', { kind: 'date', year: 2023, month: 7 }],
    ['2023年7月', { kind: 'date', year: 2023, month: 7 }],
    ['2023', { kind: 'date', year: 2023 }],
    ['Jul 2023', { kind: 'date', year: 2023, month: 7 }],
    ['September 2021', { kind: 'date', year: 2021, month: 9 }],
    ['至今', { kind: 'present' }],
    ['Present', { kind: 'present' }],
    ['2023.13', { kind: 'raw', text: '2023.13' }],
    ['去年夏天', { kind: 'raw', text: '去年夏天' }],
  ])('%s', (input, expected) => {
    expect(parseDate(input)).toEqual(expected)
  })

  it('returns null for empty input', () => {
    expect(parseDate('  ')).toBeNull()
  })
})

describe('splitRange', () => {
  it.each([
    ['2022.07 - 2022.09', ['2022.07', '2022.09']],
    ['2021.10–至今', ['2021.10', '至今']],
    ['2021.10 ~ 2022.06', ['2021.10', '2022.06']],
    ['2022.07-2022.09', ['2022.07', '2022.09']],
    ['2022-07 - 2022-09', ['2022-07', '2022-09']],
    ['2021.12', ['2021.12', '']],
    ['', ['', '']],
  ])('%s', (input, expected) => {
    expect(splitRange(input)).toEqual(expected)
  })
})

describe('format', () => {
  it('formats in every style', () => {
    expect(formatDate('2023.7', dot)).toBe('2023.07')
    expect(formatDate('2023.7', { ...dot, style: 'slash' })).toBe('2023/07')
    expect(formatDate('2023.7', { ...dot, style: 'dash' })).toBe('2023-07')
    expect(formatDate('2023.7', { ...dot, style: 'month-en' })).toBe('Jul 2023')
    expect(formatDate('2023.7', { ...dot, style: 'cn' })).toBe('2023年7月')
    expect(formatDate('2023', { ...dot, style: 'cn' })).toBe('2023年')
    expect(formatDate('now', { style: 'month-en', present: 'Present' })).toBe(
      'Present'
    )
  })

  it('keeps unknown text as-is', () => {
    expect(formatDate('毕业前', dot)).toBe('毕业前')
  })

  it('formats ranges', () => {
    expect(formatRange('2022.7', '至今', dot)).toBe('2022.07 – 至今')
    expect(formatRange('', '2022.7', dot)).toBe('2022.07')
    expect(formatRange('', '', dot)).toBe('')
  })

  it('orders dates', () => {
    expect(dateOrdinal('2023.01')).toBeLessThan(
      dateOrdinal('2023.02') as number
    )
    expect(dateOrdinal('至今')).toBe(Number.POSITIVE_INFINITY)
    expect(dateOrdinal('foo')).toBeNull()
  })
})
