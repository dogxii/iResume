import { Check } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { Suggestion } from '../lint'

interface Props {
  notes: Suggestion[]
  /** 纸面元素，用于定位批注目标 */
  paper: HTMLElement | null
  /** 批注列所在容器（定位参照） */
  stage: HTMLElement | null
  /** 任何会改变布局的值变化时都需要重新计算 */
  layoutKey: unknown
  active?: string
  onDismiss(id: string): void
  onOpen(target: string): void
}

const GAP = 8

export function focusTarget(paper: HTMLElement | null, target: string) {
  const el = paper?.querySelector<HTMLElement>(
    `[data-item="${CSS.escape(target)}"]`
  )
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const field =
    el.querySelector<HTMLElement>('.f[data-empty]') ??
    el.querySelector<HTMLElement>('.r-bullets .f, .f')
  field?.focus({ preventScroll: true })
}

/** 页边批注：与目标条目顶部对齐，互相不重叠。 */
export function MarginNotes({
  notes,
  paper,
  stage,
  layoutKey,
  active,
  onDismiss,
  onOpen,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tops, setTops] = useState<Record<string, number>>({})

  useLayoutEffect(() => {
    if (!paper || !stage || !ref.current) return
    const compute = () => {
      const base = stage.getBoundingClientRect().top
      const next: Record<string, number> = {}
      let bottom = -Infinity
      const nodes = [...(ref.current?.children ?? [])] as HTMLElement[]
      const desired = notes
        .map((n, i) => {
          const el = paper.querySelector(
            `[data-item="${CSS.escape(n.target)}"]`
          )
          return {
            n,
            node: nodes[i],
            top: el ? el.getBoundingClientRect().top - base : 0,
          }
        })
        .sort((x, y) => x.top - y.top)
      for (const { n, node, top } of desired) {
        const t = Math.max(top, bottom + GAP)
        next[n.id] = Math.round(t)
        bottom = t + (node?.offsetHeight ?? 60)
      }
      setTops((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      )
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(paper)
    return () => ro.disconnect()
  }, [notes, paper, stage, layoutKey])

  const highlight = (target: string, on: boolean) => {
    paper
      ?.querySelector(`[data-item="${CSS.escape(target)}"]`)
      ?.classList.toggle('is-noted', on)
  }

  return (
    <div className='e-notes' ref={ref}>
      {notes.map((n) => (
        <div
          key={n.id}
          className={`e-note is-${n.level} ${active === n.target ? 'is-active' : ''}`}
          style={{ top: tops[n.id] ?? 0, opacity: n.id in tops ? 1 : 0 }}
          onMouseEnter={() => highlight(n.target, true)}
          onMouseLeave={() => highlight(n.target, false)}
        >
          <button
            type='button'
            className='e-note-body'
            onClick={() => onOpen(n.target)}
          >
            <strong>{n.title}</strong>
            <p>{n.detail}</p>
          </button>
          <button
            type='button'
            className='e-note-ok'
            title='忽略这条建议'
            onClick={() => {
              highlight(n.target, false)
              onDismiss(n.id)
            }}
          >
            <Check size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function NotesList({
  notes,
  onDismiss,
  onOpen,
}: Pick<Props, 'notes' | 'onDismiss' | 'onOpen'>) {
  if (notes.length === 0)
    return <div className='e-notes-empty'>没有建议了，写得不错。</div>
  return (
    <div className='e-notes-list'>
      {notes.map((n) => (
        <div key={n.id} className={`e-note is-static is-${n.level}`}>
          <button
            type='button'
            className='e-note-body'
            onClick={() => onOpen(n.target)}
          >
            <strong>{n.title}</strong>
            <p>{n.detail}</p>
          </button>
          <button
            type='button'
            className='e-note-ok'
            title='忽略'
            onClick={() => onDismiss(n.id)}
          >
            <Check size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
