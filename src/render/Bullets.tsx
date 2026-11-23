import { caretOffset, selectionCollapsed } from './caret'
import { Field, requestFocus, useEdit } from './Field'
import { Inline } from './inline'

interface Props {
  /** 字段 key 前缀，第 i 条为 `${base}:${i}` */
  base: string
  items: string[]
  onChange(next: string[], coalesce?: string): void
  placeholder?: string
  target?: { sectionId?: string; itemId?: string }
}

/**
 * 要点列表：回车拆分、行首退格合并、上下键跨条移动、多行粘贴自动拆条。
 */
export function Bullets({ base, items, onChange, placeholder, target }: Props) {
  const edit = useEdit()
  if (!edit) {
    const visible = items.filter((b) => b.trim())
    if (visible.length === 0) return null
    return (
      <ul className='r-bullets'>
        {visible.map((b, i) => (
          <li key={i}>
            <Inline text={b} />
          </li>
        ))}
      </ul>
    )
  }

  const list = items.length > 0 ? items : ['']
  const key = (i: number) => `${base}:${i}`
  return (
    <ul className='r-bullets'>
      {list.map((value, i) => (
        <li key={i}>
          <Field
            fkey={key(i)}
            value={value}
            rich
            placeholder={i === 0 ? placeholder : '继续写一条…'}
            target={target}
            onChange={(v) => {
              const next = [...list]
              next[i] = v
              onChange(next, key(i))
            }}
            onPasteLines={(lines, el) => {
              const at = caretOffset(el) ?? value.length
              const next = [...list]
              const head = value.slice(0, at) + lines[0]
              const tail = lines.slice(1)
              tail[tail.length - 1] += value.slice(at)
              next.splice(i, 1, head, ...tail)
              requestFocus(key(i + tail.length), 'end')
              onChange(next)
              return true
            }}
            onKey={(e, el) => {
              const raw = el.textContent ?? ''
              const at = caretOffset(el) ?? raw.length
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault()
                const next = [...list]
                next.splice(i, 1, raw.slice(0, at), raw.slice(at))
                requestFocus(key(i + 1), 0)
                onChange(next)
              } else if (
                e.key === 'Backspace' &&
                at === 0 &&
                selectionCollapsed()
              ) {
                if (i === 0 && (raw || list.length === 1)) return
                e.preventDefault()
                const next = [...list]
                if (i === 0) {
                  next.splice(0, 1)
                  requestFocus(key(0), 0)
                } else {
                  const prev = next[i - 1]
                  next.splice(i - 1, 2, prev + raw)
                  requestFocus(key(i - 1), prev.length)
                }
                onChange(next)
              } else if (
                e.key === 'Delete' &&
                at === raw.length &&
                i < list.length - 1 &&
                selectionCollapsed()
              ) {
                e.preventDefault()
                const next = [...list]
                next.splice(i, 2, raw + next[i + 1])
                requestFocus(key(i), raw.length)
                onChange(next)
              } else if (e.key === 'ArrowUp' && at === 0 && i > 0) {
                e.preventDefault()
                requestFocus(key(i - 1), 'end')
              } else if (
                e.key === 'ArrowDown' &&
                at === raw.length &&
                i < list.length - 1
              ) {
                e.preventDefault()
                requestFocus(key(i + 1), 0)
              }
            }}
          />
        </li>
      ))}
    </ul>
  )
}
