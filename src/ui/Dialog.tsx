import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { defineMessages, useT } from '../i18n'
import { IconButton } from './controls'

const M = defineMessages({ close: '关闭' }, { close: 'Close' })

/**
 * 模态对话框：用原生 <dialog>，焦点限制、Esc、背景不可交互都由浏览器处理。
 * 点击遮罩关闭。
 */
export function Dialog({
  open,
  onClose,
  title,
  label,
  className,
  children,
}: {
  open: boolean
  onClose(): void
  /** 显示在顶部的标题 */
  title: ReactNode
  /** 读屏用的名称（标题会变化时保持不变） */
  label?: string
  className?: string
  children: ReactNode
}) {
  const t = useT(M)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 键盘用户按 Esc 关闭（onCancel）
    <dialog
      ref={ref}
      className={`u-dialog ${className ?? ''}`}
      aria-label={label ?? (typeof title === 'string' ? title : undefined)}
      onClose={() => open && onClose()}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className='u-dialog-head'>
        <h2>{title}</h2>
        <IconButton label={t.close} onClick={onClose}>
          <X size={17} />
        </IconButton>
      </div>
      {children}
    </dialog>
  )
}
