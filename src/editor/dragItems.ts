import { type RefObject, useEffect } from 'react'
import type { Actions } from './actions'

/** 正在拖动的条目（dragover 时读不到 dataTransfer 的内容，所以记在这里） */
let dragging: { sectionId: string; itemId: string; el: HTMLElement } | null =
  null

const ITEM = '.r-entry, .r-row, .r-textblock'

/** 条目工具条里的拖动柄：开始拖动整条 */
export function startItemDrag(
  e: React.DragEvent<HTMLElement>,
  sectionId: string,
  itemId: string
) {
  const el = e.currentTarget.closest<HTMLElement>(ITEM)
  if (!el) return
  dragging = { sectionId, itemId, el }
  e.dataTransfer.effectAllowed = 'move'
  // 自定义类型：可编辑的文字不会把它当成文字插进去（Firefox 需要设置数据才会开始拖动）
  e.dataTransfer.setData('application/x-iresume-item', itemId)
  // 拖动时的影像用整条条目，而不是小小的拖动柄
  const r = el.getBoundingClientRect()
  e.dataTransfer.setDragImage(el, e.clientX - r.left, e.clientY - r.top)
  requestAnimationFrame(() => el.setAttribute('data-dragging', ''))
}

/**
 * 在纸面上统一处理条目的放置：只能在同一区块内移动；
 * 指针在目标条目上半部放到它前面，下半部放到它后面，并显示一条插入线。
 */
export function useItemDrop(ref: RefObject<HTMLElement | null>, a: Actions) {
  useEffect(() => {
    const paper = ref.current
    if (!paper) return
    let marked: HTMLElement | null = null
    const clear = () => {
      marked?.removeAttribute('data-drop')
      marked = null
    }
    const target = (e: DragEvent) => {
      if (!dragging) return null
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(ITEM)
      if (!el || !paper.contains(el)) return null
      const section = el.closest<HTMLElement>('[data-section]')
      if (section?.dataset.section !== dragging.sectionId) return null
      const r = el.getBoundingClientRect()
      const after = e.clientY > r.top + r.height / 2
      return { el, after }
    }
    const over = (e: DragEvent) => {
      if (!dragging) return
      // 拖动条目时，纸面上任何地方都不接受默认的放置（不往文字里插入内容）
      e.preventDefault()
      const hit = target(e)
      if (!hit) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
        return clear()
      }
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      if (marked !== hit.el) clear()
      marked = hit.el
      hit.el.setAttribute('data-drop', hit.after ? 'after' : 'before')
    }
    const drop = (e: DragEvent) => {
      if (!dragging) return
      e.preventDefault()
      const hit = target(e)
      clear()
      if (!hit) return
      const ids = [
        ...(hit.el.parentElement?.querySelectorAll<HTMLElement>(
          `:scope > :is(${ITEM})`
        ) ?? []),
      ].map((x) => x.dataset.item)
      const from = ids.indexOf(dragging.itemId)
      let to = ids.indexOf(hit.el.dataset.item) + (hit.after ? 1 : 0)
      if (from < to) to -= 1
      if (from >= 0 && to >= 0 && from !== to)
        a.moveItemTo(dragging.sectionId, dragging.itemId, to)
    }
    const end = () => {
      clear()
      dragging?.el.removeAttribute('data-dragging')
      dragging = null
    }
    paper.addEventListener('dragover', over)
    paper.addEventListener('dragleave', clear)
    paper.addEventListener('drop', drop)
    document.addEventListener('dragend', end)
    return () => {
      paper.removeEventListener('dragover', over)
      paper.removeEventListener('dragleave', clear)
      paper.removeEventListener('drop', drop)
      document.removeEventListener('dragend', end)
    }
  }, [ref, a])
}
