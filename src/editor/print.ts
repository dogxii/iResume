import { PAGE_MM } from '../theme/css'
import type { Theme } from '../theme/types'

/** 打印 / 导出 PDF：按主题设置 @page，打印期间临时修改标题作为默认文件名。 */
export function printResume(
  theme: Theme,
  title: string,
  onDone?: () => void,
  pages = 1
) {
  const [w, h] = PAGE_MM[theme.page]
  const aside = theme.layout === 'aside-left' || theme.layout === 'aside-right'
  const style = document.createElement('style')
  style.textContent = `@page { size: ${w}mm ${h}mm; margin: ${aside ? 0 : `${theme.space.margin}mm 0`}; }`
  // 双栏：纸张撑满整数页，侧栏色带才能通到最后一页底部
  if (aside)
    style.textContent += `.print-root .r-paper { min-height: ${h * Math.max(1, pages) - 1}mm !important; }`
  document.head.append(style)
  const previous = document.title
  document.title = title
  document.documentElement.dataset.printing = aside ? 'aside' : 'flow'
  const cleanup = () => {
    style.remove()
    document.title = previous
    delete document.documentElement.dataset.printing
    window.removeEventListener('afterprint', cleanup)
    onDone?.()
  }
  window.addEventListener('afterprint', cleanup)
  // 等待打印区域渲染
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
}

export function download(
  filename: string,
  content: string,
  type = 'application/json'
) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'resume'
}
