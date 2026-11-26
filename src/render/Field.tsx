import {
  createContext,
  type KeyboardEvent,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react'
import { plainText, plainToRawOffset } from '../model/inline'
import type { ResumeDoc } from '../model/types'
import { caretOffset, placeCaret } from './caret'
import { Inline, inlineHtml } from './inline'

export interface EditApi {
  update(recipe: (draft: ResumeDoc) => void, coalesce?: string): void
  /** 字段获得焦点时通知编辑器（用于大纲高亮、批注对齐） */
  focus?(target: { sectionId?: string; itemId?: string } | null): void
}

export const EditContext = createContext<EditApi | null>(null)
export const useEdit = () => useContext(EditContext)

/** 渲染后需要聚焦的字段（回车拆分、退格合并、新增条目后使用） */
let pendingFocus: { key: string; offset: number | 'end' } | null = null
export function requestFocus(key: string, offset: number | 'end' = 'end') {
  pendingFocus = { key, offset }
  // 若目标已经存在于 DOM（例如只是移动焦点），直接处理
  queueMicrotask(() => {
    if (!pendingFocus) return
    const el = document.querySelector<HTMLElement>(
      `[data-fkey="${CSS.escape(pendingFocus.key)}"]`
    )
    if (el) applyFocus(el)
  })
}
function applyFocus(el: HTMLElement) {
  if (!pendingFocus) return
  const { offset } = pendingFocus
  pendingFocus = null
  el.focus({ preventScroll: false })
  el.textContent = el.dataset.raw ?? el.textContent
  placeCaret(el, offset)
}

type Tag = 'span' | 'div' | 'h1' | 'h2' | 'p' | 'dt' | 'dd' | 'time'

export interface FieldProps {
  fkey: string
  value: string
  onChange(value: string): void
  placeholder?: string
  className?: string
  as?: Tag
  /** 失焦时按 **粗体** / 链接渲染 */
  rich?: boolean
  /** 失焦时的展示文本（如格式化日期） */
  display?: string
  onKey?(event: KeyboardEvent<HTMLElement>, el: HTMLElement): void
  /** 粘贴多行文本时调用；返回 true 表示已处理 */
  onPasteLines?(lines: string[], el: HTMLElement): boolean
  target?: { sectionId?: string; itemId?: string }
}

/** 只读渲染时字段的展示内容 */
function View({
  as: Tag = 'span',
  className,
  value,
  rich,
  display,
}: FieldProps) {
  if (!value && !display) return null
  return (
    <Tag className={className}>
      {rich ? <Inline text={value} /> : (display ?? value)}
    </Tag>
  )
}

/**
 * 非受控的 contenteditable 字段：
 * 聚焦时显示源码，失焦时显示渲染结果；仅在内容确实不同的时候回写 DOM，避免光标跳动。
 */
export function Field(props: FieldProps) {
  const edit = useEdit()
  if (!edit) return <View {...props} />
  return <EditableField {...props} edit={edit} />
}

function EditableField({
  fkey,
  value,
  onChange,
  placeholder,
  className,
  as: Tag = 'span',
  rich,
  display,
  onKey,
  onPasteLines,
  target,
  edit,
}: FieldProps & { edit: EditApi }) {
  const ref = useRef<HTMLElement>(null)
  const focused = useRef(false)

  const showDisplay = (el: HTMLElement) => {
    if (rich) el.innerHTML = inlineHtml(value)
    else el.textContent = display ?? value
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.dataset.raw = value
    if (pendingFocus?.key === fkey) {
      applyFocus(el)
      focused.current = true
      return
    }
    if (!focused.current) showDisplay(el)
    else if (el.textContent !== value) {
      el.textContent = value
      placeCaret(el, 'end')
    }
  })

  const shown = rich ? plainText(value) : (display ?? value)

  return (
    <Tag
      ref={ref as never}
      className={`${className ?? ''} f`.trim()}
      data-fkey={fkey}
      data-ph={placeholder}
      data-empty={shown ? undefined : ''}
      contentEditable='plaintext-only'
      suppressContentEditableWarning
      spellCheck={false}
      role='textbox'
      aria-label={placeholder}
      tabIndex={0}
      onFocus={(e) => {
        const el = e.currentTarget
        focused.current = true
        edit.focus?.(target ?? null)
        if (el.textContent === value) return
        const at = caretOffset(el)
        el.textContent = value
        placeCaret(
          el,
          at === null
            ? 'end'
            : rich
              ? plainToRawOffset(value, at)
              : display
                ? 'end'
                : at
        )
      }}
      onBlur={(e) => {
        focused.current = false
        showDisplay(e.currentTarget)
      }}
      onInput={(e) => {
        const el = e.currentTarget
        const text = (el.textContent ?? '').replace(/\n/g, ' ')
        if (!text && el.innerHTML) el.innerHTML = ''
        el.dataset.raw = text
        onChange(text)
      }}
      onKeyDown={(e) => {
        onKey?.(e, e.currentTarget)
        if (!e.defaultPrevented && e.key === 'Enter') {
          e.preventDefault()
          // 回车跳到下一个字段（跨到下一个条目），纸面上最后一个字段才结束编辑
          const next = nextField(e.currentTarget)
          if (next) next.focus()
          else endEditing(e.currentTarget)
        }
        if (e.key === 'Escape') endEditing(e.currentTarget)
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain')
        e.preventDefault()
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
        if (lines.length > 1 && onPasteLines?.(lines, e.currentTarget)) return
        document.execCommand('insertText', false, lines.join(' '))
      }}
    />
  )
}

/** 结束编辑：除了失焦还要清掉选区，否则 Chrome 会把之后的按键又送回这个字段 */
function endEditing(el: HTMLElement) {
  el.blur()
  window.getSelection()?.removeAllRanges()
}

const SCOPE = '.r-entry, .r-row, .r-header, .r-textblock'
/** 空着的可选字段（城市、链接、技术栈）是「+ 添加」入口，回车时跳过；Tab 仍能到达 */
const FIELD = '[contenteditable][role=textbox]:not(.r-opt[data-empty])'

/**
 * 回车的去处：同一条目 / 行 / 页眉里的下一个字段；已经是最后一个时，
 * 跳到纸面上下一个条目的第一个字段（填完页眉接着写第一段经历）。
 */
function nextField(el: HTMLElement): HTMLElement | null {
  const paper = el.closest('[data-editable]')
  if (!paper) return null
  // 当前字段可能自己就是空的可选字段（不在 FIELD 里），所以按文档位置往后找
  const after = (n: Node) =>
    el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING
  const scope = el.closest(SCOPE)
  const next = scope
    ? [...scope.querySelectorAll<HTMLElement>(FIELD)].find(after)
    : undefined
  if (next) return next
  // 区块标题、或者条目的最后一个字段：跳到后面第一个条目的第一个字段
  for (const s of paper.querySelectorAll(SCOPE)) {
    if (!after(s)) continue
    const first = s.querySelector<HTMLElement>(FIELD)
    if (first) return first
  }
  return null
}
