import type { Locale } from '../model/types'
import type { FontId, PageSize, Theme } from './types'

export const FONT_STACKS: Record<FontId, string> = {
  sans: '"Inter", "Helvetica Neue", -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif',
  serif:
    '"Source Serif 4", "Iowan Old Style", Georgia, "Times New Roman", "Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif',
  humanist:
    '"Avenir Next", Seravek, "Segoe UI", Ubuntu, Candara, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  rounded:
    'ui-rounded, "SF Pro Rounded", Nunito, "Varela Round", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace',
  kai: '"LXGW WenKai", "Kaiti SC", STKaiti, KaiTi, "Iowan Old Style", Georgia, serif',
}

/** 字体的显示名称（界面语言） */
export const FONT_LABELS: Record<FontId, Record<Locale, string>> = {
  sans: { zh: '无衬线', en: 'Sans' },
  serif: { zh: '衬线', en: 'Serif' },
  humanist: { zh: '人文', en: 'Humanist' },
  rounded: { zh: '圆体', en: 'Rounded' },
  mono: { zh: '等宽', en: 'Mono' },
  kai: { zh: '楷体', en: 'Kaiti' },
}

/** 纸张尺寸，单位 mm */
export const PAGE_MM: Record<PageSize, [number, number]> = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
}

export const MM_TO_PX = 96 / 25.4

export function pagePx(size: PageSize): [number, number] {
  const [w, h] = PAGE_MM[size]
  return [w * MM_TO_PX, h * MM_TO_PX]
}

/** 主题 → CSS 变量。枚举类参数通过 data-* 属性输出，见 themeAttrs。 */
export function themeVars(theme: Theme): Record<string, string> {
  const { color, font, space } = theme
  const [w, h] = PAGE_MM[theme.page]
  return {
    '--r-accent': color.accent,
    '--r-ink': color.ink,
    '--r-muted': color.muted,
    '--r-rule': color.onRules ? color.accent : color.rule,
    '--r-aside': color.aside,
    '--r-name-color': color.onName ? color.accent : color.ink,
    '--r-heading-color': color.onHeadings ? color.accent : color.ink,
    '--r-link-color': color.onLinks ? color.accent : 'inherit',
    '--r-font': FONT_STACKS[font.body],
    '--r-font-heading': FONT_STACKS[font.heading],
    '--r-size': `${font.size}pt`,
    '--r-leading': String(font.leading),
    '--r-name': `${font.name}em`,
    '--r-title': `${font.title}em`,
    '--r-margin': `${space.margin}mm`,
    '--r-section': `${space.section}em`,
    '--r-entry': `${space.entry}em`,
    '--r-page-w': `${w}mm`,
    '--r-page-h': `${h}mm`,
  }
}

export function themeAttrs(theme: Theme): Record<string, string> {
  return {
    'data-layout': theme.layout,
    'data-header': theme.header.align,
    'data-contacts': theme.header.contacts,
    'data-heading': theme.heading.style,
    'data-caps': String(theme.heading.caps),
    'data-date': theme.entry.date,
    'data-sub': theme.entry.sub,
    'data-timeline': String(theme.entry.timeline),
    'data-bullet': theme.bullet,
    'data-skills': theme.skills,
  }
}
