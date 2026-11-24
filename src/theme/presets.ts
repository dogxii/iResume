import type { Theme } from './types'

const base: Theme = {
  preset: 'clean',
  name: '清简',
  layout: 'single',
  aside: [],
  header: { align: 'left', photo: 'none', contacts: 'inline' },
  heading: { style: 'rule', caps: false },
  entry: { date: 'right', sub: 'inline', timeline: false },
  bullet: 'dot',
  skills: 'rows',
  font: {
    body: 'sans',
    heading: 'sans',
    size: 10,
    leading: 1.5,
    name: 2.4,
    title: 1.15,
  },
  color: {
    accent: '#2456d6',
    ink: '#16181d',
    muted: '#666b75',
    rule: '#d9dbe0',
    aside: '#f3f4f6',
    onName: false,
    onHeadings: false,
    onLinks: true,
    onRules: false,
  },
  space: { margin: 16, section: 1.35, entry: 0.8 },
  page: 'A4',
  date: { style: 'dot', present: '至今' },
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

function derive(patch: DeepPartial<Theme>): Theme {
  return {
    ...base,
    ...patch,
    header: { ...base.header, ...patch.header },
    heading: { ...base.heading, ...patch.heading },
    entry: { ...base.entry, ...patch.entry },
    font: { ...base.font, ...patch.font },
    color: { ...base.color, ...patch.color },
    space: { ...base.space, ...patch.space },
    date: { ...base.date, ...patch.date },
    aside: patch.aside ?? base.aside,
  } as Theme
}

export interface PresetMeta {
  theme: Theme
  blurb: string
  /** 是否适合 ATS（单栏、无表格、标准标题） */
  ats: boolean
}

export const PRESETS: PresetMeta[] = [
  {
    theme: base,
    blurb: '单栏、细线标题，最稳妥的默认选择',
    ats: true,
  },
  {
    theme: derive({
      preset: 'classic',
      name: '经典',
      header: { align: 'center' },
      heading: { style: 'rule', caps: true },
      font: {
        body: 'serif',
        heading: 'serif',
        size: 10.5,
        name: 2.3,
        title: 1.05,
      },
      color: { accent: '#1d2433', onLinks: false, rule: '#1d2433' },
      bullet: 'dot',
    }),
    blurb: '居中页眉、衬线字体，适合金融、法律、学术',
    ats: true,
  },
  {
    theme: derive({
      preset: 'margin',
      name: '侧标题',
      layout: 'side-headings',
      heading: { style: 'plain', caps: true },
      color: { accent: '#0f766e', onHeadings: true },
      font: { title: 0.82 },
      bullet: 'dash',
    }),
    blurb: '标题放在左侧页边，留白大、层次清楚',
    ats: true,
  },
  {
    theme: derive({
      preset: 'sidebar',
      name: '双栏',
      layout: 'aside-left',
      aside: ['skills', 'education', 'awards', 'activities'],
      header: { align: 'left', contacts: 'stacked' },
      heading: { style: 'underline', caps: false },
      color: { accent: '#2456d6', onHeadings: true, onRules: true },
      skills: 'tags',
      space: { margin: 14 },
    }),
    blurb: '侧栏放技能与教育，信息密度高（部分 ATS 解析不佳）',
    ats: false,
  },
  {
    theme: derive({
      preset: 'modern',
      name: '现代',
      heading: { style: 'bar', caps: false },
      font: { name: 2.8, title: 1.2, body: 'humanist', heading: 'humanist' },
      color: { accent: '#4f46e5', onName: true, onRules: true },
    }),
    blurb: '大姓名、强调色色条，适合互联网与设计岗位',
    ats: true,
  },
  {
    theme: derive({
      preset: 'compact',
      name: '紧凑',
      header: { align: 'split', contacts: 'stacked' },
      heading: { style: 'band', caps: false },
      font: { size: 9.5, leading: 1.38, name: 2.1, title: 1.05 },
      space: { margin: 12, section: 1, entry: 0.55 },
      skills: 'inline',
      color: { accent: '#334155', aside: '#eef0f3' },
    }),
    blurb: '小字号、窄边距，经历多时也能放进一页',
    ats: true,
  },
  {
    theme: derive({
      preset: 'timeline',
      name: '时间线',
      heading: { style: 'plain', caps: true },
      entry: { date: 'gutter', timeline: true },
      color: { accent: '#0e7490', onHeadings: true, onRules: true },
      font: { title: 0.9 },
    }),
    blurb: '日期列在左、时间轴串起经历，成长路径一目了然',
    ats: true,
  },
  {
    theme: derive({
      preset: 'editorial',
      name: '书卷',
      header: { align: 'center' },
      heading: { style: 'underline', caps: false },
      font: { body: 'humanist', heading: 'serif', name: 2.6, title: 1.25 },
      color: {
        accent: '#9a3412',
        onHeadings: false,
        onRules: true,
        ink: '#1f1b16',
      },
      bullet: 'dash',
      date: { style: 'cn' },
    }),
    blurb: '衬线标题配人文无衬线正文，温和、有书卷气',
    ats: true,
  },
]

export const DEFAULT_THEME = base

export function presetById(id: string): PresetMeta | undefined {
  return PRESETS.find((preset) => preset.theme.preset === id)
}

export const ACCENTS = [
  '#16181d',
  '#2456d6',
  '#4f46e5',
  '#0f766e',
  '#0e7490',
  '#15803d',
  '#b45309',
  '#9a3412',
  '#be123c',
  '#7c3aed',
]
