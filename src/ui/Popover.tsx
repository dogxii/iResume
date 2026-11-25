import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useMedia } from './useMedia'

interface Props {
  anchor: HTMLElement | null
  open: boolean
  onClose(): void
  children: ReactNode
  placement?: 'top' | 'bottom' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
  /** 手机上以底部抽屉呈现时的标题 */
  title?: string
}

/** 锚定弹层；窄屏自动变为底部抽屉。点击外部或按 Esc 关闭。 */
export function Popover({
  anchor,
  open,
  onClose,
  children,
  placement = 'bottom',
  align = 'start',
  className,
  title,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mobile = useMedia('(max-width: 700px)')
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || mobile || !anchor || !ref.current) return
    const place = () => {
      const a = anchor.getBoundingClientRect()
      const el = ref.current
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const maxTop = window.innerHeight - h - 8
      if (placement === 'right') {
        // 贴着锚点右侧，尽量与锚点顶部对齐，放不下时向上移
        const left = Math.min(a.right + 8, window.innerWidth - w - 8)
        setPos({ left, top: Math.max(8, Math.min(a.top - 6, maxTop)) })
        return
      }
      let left =
        align === 'start'
          ? a.left
          : align === 'end'
            ? a.right - w
            : a.left + a.width / 2 - w / 2
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      const below = a.bottom + 8
      const above = a.top - h - 8
      let top = placement === 'top' ? above : below
      if (top < 8) top = below
      if (top > maxTop) top = above >= 8 ? above : Math.max(8, maxTop)
      setPos({ left, top })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(ref.current)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [open, mobile, anchor, placement, align])

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key)
    }
  }, [open, anchor, onClose])

  if (!open) return null
  if (mobile) {
    return createPortal(
      <div className='u-sheet-layer'>
        <div className='u-sheet' ref={ref} role='dialog' aria-label={title}>
          <div className='u-sheet-grip' />
          {title && <div className='u-sheet-title'>{title}</div>}
          {children}
        </div>
      </div>,
      document.body
    )
  }
  return createPortal(
    <div
      ref={ref}
      role='dialog'
      className={`u-pop ${className ?? ''}`}
      style={
        pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }
      }
    >
      {children}
    </div>,
    document.body
  )
}
