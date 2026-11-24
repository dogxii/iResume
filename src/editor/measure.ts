import { MM_TO_PX, PAGE_MM } from '../theme/css'
import type { Theme } from '../theme/types'

/** 一页上的一个窗口：把纸面 [from, to) 这一段放到页面的 (left, top) 处 */
export interface Frame {
  left: number
  width: number
  top: number
  from: number
  to: number
}

export interface Measure {
  pages: number
  /**
   * 每页由哪些窗口组成（未缩放 px），与打印分页一致：
   * - 单栏版式：页边距由 @page 提供，条目不拆开、标题跟随内容；
   * - 双栏版式：两栏各自分页，续页的上下白边来自复制的栏内边距。
   */
  frames: Frame[][]
  /** 内容高度 / 单页可用高度 */
  fill: number
  /** 超出整页的行数（仅 >1 页时有意义） */
  overflowLines: number
  /** 单页可用高度，px（未缩放） */
  pageContent: number
  marginPx: number
}

/** 测量简历内容占几页。所有数值是未缩放的 CSS 像素。 */
export function measurePaper(paper: HTMLElement, theme: Theme): Measure {
  const marginPx = theme.space.margin * MM_TO_PX
  const pageH = PAGE_MM[theme.page][1] * MM_TO_PX
  const pageContent = pageH - marginPx * 2
  const linePx = theme.font.size * (96 / 72) * theme.font.leading
  const columns = [
    ...paper.querySelectorAll<HTMLElement>(
      ':scope > .r-aside, :scope > .r-main'
    ),
  ]
  const endOf = (box: HTMLElement) => {
    const last = box.lastElementChild
    if (!(last instanceof HTMLElement)) return 0
    const b = boxIn(last, paper)
    return b.top + b.height
  }

  let frames: Frame[][]
  let content: number
  let lastPage: number
  if (columns.length > 0) {
    content = Math.max(0, ...columns.map(endOf)) - marginPx
    const perColumn = columns.map((col) => ({
      col,
      ranges: paginate(collectUnits(col, paper), {
        start: marginPx,
        end: endOf(col),
        pageContent,
        linePx,
      }),
    }))
    const n = Math.max(...perColumn.map((c) => c.ranges.length))
    frames = Array.from({ length: n }, (_, k) =>
      perColumn
        .filter((c) => c.ranges[k])
        .map(({ col, ranges }) => {
          const [from, to] = ranges[k]
          return {
            left: col.offsetLeft,
            width: col.offsetWidth,
            top: marginPx,
            from,
            to,
          }
        })
    )
    const main =
      perColumn.find((c) => c.col.classList.contains('r-main')) ?? perColumn[0]
    const lr = main.ranges[main.ranges.length - 1]
    lastPage = lr[1] - lr[0]
  } else {
    content = endOf(paper) - marginPx
    const ranges = paginate(collectUnits(paper, paper), {
      start: marginPx,
      end: marginPx + content,
      pageContent,
      linePx,
    })
    frames = ranges.map(([from, to]) => [
      { left: 0, width: paper.offsetWidth, top: marginPx, from, to },
    ])
    const lr = ranges[ranges.length - 1]
    lastPage = lr[1] - lr[0]
  }
  const pages = frames.length
  return {
    pages,
    frames,
    fill: content / pageContent,
    overflowLines: pages > 1 ? Math.max(1, Math.ceil(lastPage / linePx)) : 0,
    pageContent,
    marginPx,
  }
}

// —— 分页模拟 ————————————————————————————————————————————————

export interface Unit {
  top: number
  bottom: number
  /** heading：不能留在页尾；text：可以按行拆开；block：整体不拆 */
  kind: 'heading' | 'text' | 'block'
}

/** 元素相对纸面顶部的位置与高度（亚像素精度，已扣除缩放） */
function boxIn(el: HTMLElement, root: HTMLElement) {
  const r = el.getBoundingClientRect()
  const base = root.getBoundingClientRect()
  const scale = root.offsetHeight ? base.height / root.offsetHeight : 1
  return { top: (r.top - base.top) / scale, height: r.height / scale }
}
function collectUnits(scope: HTMLElement, paper: HTMLElement): Unit[] {
  const els = scope.querySelectorAll<HTMLElement>(
    '.r-header, .r-heading, .r-entry, .r-row, .r-textblock'
  )
  return [...els].map((el) => {
    const { top, height } = boxIn(el, paper)
    return {
      top,
      bottom: top + height,
      kind: el.classList.contains('r-heading')
        ? 'heading'
        : el.classList.contains('r-textblock')
          ? 'text'
          : 'block',
    }
  })
}

/**
 * 按打印的分页规则切页：放不下的条目整体移到下一页，标题跟随其后的内容；
 * 比一整页还高的块、以及段落，按行切开。返回每页的 [起, 止)。
 */
/** 屏幕与打印排版有亚像素差异：超出不到 2px（约 0.5mm）时打印仍放得下 */
const TOLERANCE = 2

export function paginate(
  units: Unit[],
  o: { start: number; end: number; pageContent: number; linePx: number }
): [number, number][] {
  const ranges: [number, number][] = []
  let start = o.start
  const sorted = [...units].sort((a, b) => a.top - b.top)
  for (let i = 0; i < sorted.length; i++) {
    const u = sorted[i]
    // 标题本身不触发换页（侧标题版式里它会被拉伸到整个区块高），只跟随后面的内容
    if (u.kind === 'heading') continue
    let guard = 0
    while (u.bottom > start + o.pageContent + TOLERANCE && guard++ < 50) {
      const limit = start + o.pageContent
      // 整体换页的位置：本块顶部；若前面紧挨着标题，连同标题一起换页
      let before = u.top
      for (
        let j = i - 1;
        j >= 0 && sorted[j].kind === 'heading' && sorted[j].bottom <= u.top + 1;
        j--
      )
        if (sorted[j].top > start + 0.5) before = sorted[j].top
      const from = Math.max(u.top, start)
      const lines = Math.floor((limit - from) / o.linePx)
      const startsHere = u.top > start + 0.5
      let at: number
      if (u.kind === 'text' && (lines >= 2 || !startsHere))
        at = from + Math.max(1, lines) * o.linePx
      else if (startsHere) at = before
      else at = from + Math.max(1, lines) * o.linePx // 比一整页还高的块
      ranges.push([start, at])
      start = at
    }
  }
  ranges.push([start, Math.max(start, o.end)])
  return ranges
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
