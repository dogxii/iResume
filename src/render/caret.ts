/** 光标前的字符数（相对 el 的纯文本） */
export function caretOffset(el: HTMLElement): number | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return null
  const pre = document.createRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

export function selectionCollapsed(): boolean {
  const sel = window.getSelection()
  return !sel || sel.isCollapsed
}

export function placeCaret(el: HTMLElement, offset: number | 'end') {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  const total = el.textContent?.length ?? 0
  let remaining =
    offset === 'end' ? total : Math.max(0, Math.min(offset, total))
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      range.setStart(node, remaining)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    remaining -= len
    node = walker.nextNode()
  }
  range.selectNodeContents(el)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}
