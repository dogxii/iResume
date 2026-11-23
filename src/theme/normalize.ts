import type { DateStyle } from '../model/dates'
import type { SectionKind } from '../model/types'
import { DEFAULT_THEME, presetById } from './presets'
import type { FontId, Theme } from './types'

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const pick = <T extends string>(
  v: unknown,
  options: readonly T[],
  fallback: T
): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v)
    ? (v as T)
    : fallback

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100
}

const bool = (v: unknown, fallback: boolean) =>
  typeof v === 'boolean' ? v : fallback

const color = (v: unknown, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())
    ? v.trim().toLowerCase()
    : fallback

const str = (v: unknown, fallback: string, max = 40) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback

export const FONT_IDS: readonly FontId[] = [
  'sans',
  'serif',
  'humanist',
  'rounded',
  'mono',
  'kai',
]
const KINDS: readonly SectionKind[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'awards',
  'activities',
  'publications',
  'custom',
]
const DATE_STYLES: readonly DateStyle[] = [
  'dot',
  'slash',
  'dash',
  'month-en',
  'cn',
]

export const LIMITS = {
  size: [8, 13],
  leading: [1.1, 2],
  name: [1.4, 3.6],
  title: [0.8, 1.6],
  margin: [6, 28],
  section: [0.4, 2.6],
  entry: [0.2, 1.6],
} as const

/** 把任意输入（旧数据、导入的主题文件）变成完整合法的主题。 */
export function normalizeTheme(value: unknown): Theme {
  const raw = isRec(value) ? value : {}
  const presetId =
    typeof raw.preset === 'string' ? raw.preset : DEFAULT_THEME.preset
  const d = presetById(presetId)?.theme ?? DEFAULT_THEME
  const header = isRec(raw.header) ? raw.header : {}
  const heading = isRec(raw.heading) ? raw.heading : {}
  const entry = isRec(raw.entry) ? raw.entry : {}
  const font = isRec(raw.font) ? raw.font : {}
  const c = isRec(raw.color) ? raw.color : {}
  const space = isRec(raw.space) ? raw.space : {}
  const date = isRec(raw.date) ? raw.date : {}

  return {
    preset: d.preset,
    name: str(raw.name, d.name),
    layout: pick(
      raw.layout,
      ['single', 'aside-left', 'aside-right', 'side-headings'],
      d.layout
    ),
    aside: Array.isArray(raw.aside)
      ? raw.aside.filter((k): k is SectionKind =>
          KINDS.includes(k as SectionKind)
        )
      : [...d.aside],
    header: {
      align: pick(header.align, ['left', 'center', 'split'], d.header.align),
      photo: pick(header.photo, ['none', 'circle', 'rounded'], d.header.photo),
      contacts: pick(header.contacts, ['inline', 'stacked'], d.header.contacts),
    },
    heading: {
      style: pick(
        heading.style,
        ['rule', 'underline', 'bar', 'band', 'plain'],
        d.heading.style
      ),
      caps: bool(heading.caps, d.heading.caps),
    },
    entry: {
      date: pick(entry.date, ['right', 'below', 'gutter'], d.entry.date),
      sub: pick(entry.sub, ['inline', 'below'], d.entry.sub),
      timeline: bool(entry.timeline, d.entry.timeline),
    },
    bullet: pick(raw.bullet, ['dot', 'dash', 'square', 'none'], d.bullet),
    skills: pick(raw.skills, ['rows', 'inline', 'tags'], d.skills),
    font: {
      body: pick(font.body, FONT_IDS, d.font.body),
      heading: pick(font.heading, FONT_IDS, d.font.heading),
      size: num(font.size, ...LIMITS.size, d.font.size),
      leading: num(font.leading, ...LIMITS.leading, d.font.leading),
      name: num(font.name, ...LIMITS.name, d.font.name),
      title: num(font.title, ...LIMITS.title, d.font.title),
    },
    color: {
      accent: color(c.accent, d.color.accent),
      ink: color(c.ink, d.color.ink),
      muted: color(c.muted, d.color.muted),
      rule: color(c.rule, d.color.rule),
      aside: color(c.aside, d.color.aside),
      onName: bool(c.onName, d.color.onName),
      onHeadings: bool(c.onHeadings, d.color.onHeadings),
      onLinks: bool(c.onLinks, d.color.onLinks),
      onRules: bool(c.onRules, d.color.onRules),
    },
    space: {
      margin: num(space.margin, ...LIMITS.margin, d.space.margin),
      section: num(space.section, ...LIMITS.section, d.space.section),
      entry: num(space.entry, ...LIMITS.entry, d.space.entry),
    },
    page: pick(raw.page, ['A4', 'Letter'], d.page),
    date: {
      style: pick(date.style, DATE_STYLES, d.date.style),
      present: str(date.present, d.date.present, 12),
    },
  }
}

/** 主题是否与来源预设完全一致（用于显示「已自定义」）。 */
export function isPristine(theme: Theme): boolean {
  const preset = presetById(theme.preset)?.theme
  return (
    !!preset &&
    JSON.stringify({ ...preset, name: '' }) ===
      JSON.stringify({ ...theme, name: '' })
  )
}
