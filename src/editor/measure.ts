import { MM_TO_PX, PAGE_MM } from '../theme/css'
import type { Theme } from '../theme/types'

export interface Measure {
  pages: number
  /** 内容高度 / 单页可用高度 */
  fill: number
  /** 超出整页的行数（仅 >1 页时有意义） */
  overflowLines: number
  /** 单页可用高度，px（未缩放） */
  pageContent: number
  marginPx: number
}

const bottomOf = (el: Element | null) =>
  el instanceof HTMLElement ? el.offsetTop + el.offsetHeight : 0

/** 测量简历内容占几页。所有数值是未缩放的 CSS 像素。 */
export function measurePaper(paper: HTMLElement, theme: Theme): Measure {
  const marginPx = theme.space.margin * MM_TO_PX
  const pageContent = PAGE_MM[theme.page][1] * MM_TO_PX - marginPx * 2
  const columns = paper.querySelectorAll(':scope > .r-aside, :scope > .r-main')
  const lasts =
    columns.length > 0
      ? [...columns].map((c) => c.lastElementChild)
      : [paper.lastElementChild]
  const content = Math.max(0, ...lasts.map(bottomOf)) - marginPx
  const pages = Math.max(1, Math.ceil(content / pageContent - 0.001))
  const linePx = theme.font.size * (96 / 72) * theme.font.leading
  const over = content - pageContent * (pages - 1)
  return {
    pages,
    fill: content / pageContent,
    overflowLines: pages > 1 ? Math.ceil(over / linePx) : 0,
    pageContent,
    marginPx,
  }
}

/** 打印时的行高与屏幕存在细微差异，压缩到一页时预留约 1.5% 的余量 */
export const FIT_TARGET = 0.985

/** 「适配一页」的压缩步骤，按对阅读体验影响从小到大排列 */
export const FIT_STEPS: { label: string; apply(t: Theme): boolean }[] = [
  { label: '行高', apply: (t) => dec(t.font, 'leading', 0.05, 1.3) },
  { label: '区块间距', apply: (t) => dec(t.space, 'section', 0.1, 0.7) },
  { label: '条目间距', apply: (t) => dec(t.space, 'entry', 0.1, 0.35) },
  { label: '页边距', apply: (t) => dec(t.space, 'margin', 1, 10) },
  { label: '字号', apply: (t) => dec(t.font, 'size', 0.25, 9) },
]

function dec<T extends Record<K, number>, K extends string>(
  obj: T,
  key: K,
  step: number,
  min: number
) {
  if (obj[key] <= min + 1e-6) return false
  ;(obj as Record<K, number>)[key] =
    Math.round(Math.max(min, obj[key] - step) * 100) / 100
  return true
}
