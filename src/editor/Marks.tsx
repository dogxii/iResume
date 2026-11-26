import { ChevronDown, ChevronUp, Undo2, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { defineMessages, useT } from '../i18n'
import { type Mark, wordDiff } from '../model/marks'
import type { Snapshot } from '../model/types'
import { Popover } from '../ui/Popover'
import { stamp } from '../ui/time'

const M = defineMessages(
  {
    added: '新增',
    changed: '修改',
    removed: '删除',
    revert: '撤回这一处',
    restore: '恢复',
    title: '修订',
    against: '对比',
    session: '本次打开时',
    exported: (when: string) => `上次导出 PDF 时（${when}）`,
    count: (n: number) => (n ? `${n} 处修改` : '没有修改'),
    prev: '上一处',
    next: '下一处',
    close: '关闭修订标记',
    empty: '（空）',
  },
  {
    added: 'Added',
    changed: 'Changed',
    removed: 'Removed',
    revert: 'Revert this change',
    restore: 'Restore',
    title: 'Changes',
    against: 'Compare with',
    session: 'When opened',
    exported: (when: string) => `Last PDF export (${when})`,
    count: (n: number) =>
      n ? `${n} ${n === 1 ? 'change' : 'changes'}` : 'No changes',
    prev: 'Previous change',
    next: 'Next change',
    close: 'Hide change marks',
    empty: '(empty)',
  }
)

/** 修改标记的对比基准：本次打开时 / 上次导出时 / 某个历史版本 id */
export type MarksBase = 'session' | 'export' | (string & {})

/** 找到一处修改在纸面上对应的元素与纵向位置 */
function resolveMark(paper: HTMLElement, m: Mark) {
  const find = (sel?: string) => {
    if (!sel) return null
    const el = paper.querySelector<HTMLElement>(sel)
    return el && el.getClientRects().length > 0 ? el : null
  }
  if (m.kind === 'removed') {
    const before = find(m.anchor.before)
    if (before) return { el: before, edge: 'top' as const }
    const after = find(m.anchor.after) ?? find(m.anchor.fallback)
    return after ? { el: after, edge: 'bottom' as const } : null
  }
  const el = find(m.anchor.el) ?? find(m.anchor.fallback)
  if (!el) return null
  // 要点标记整行（含项目符号）
  return { el: el.closest('li') ?? el, edge: 'span' as const }
}

interface Box {
  top: number
  height: number
  left: number
}

/** 纸面左侧页边的修改竖条。不在纸面内容里，所以永远不会被打印。 */
export function MarksLayer({
  marks,
  paper,
  stage,
  layoutKey,
  onRevert,
}: {
  marks: Mark[]
  paper: HTMLElement | null
  stage: HTMLElement | null
  layoutKey: unknown
  onRevert(m: Mark): void
}) {
  const [boxes, setBoxes] = useState<Record<string, Box>>({})
  const [open, setOpen] = useState<string | null>(null)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  useLayoutEffect(() => {
    if (!paper || !stage) return
    const compute = () => {
      const base = stage.getBoundingClientRect()
      const next: Record<string, Box> = {}
      for (const m of marks) {
        const hit = resolveMark(paper, m)
        if (!hit) continue
        const r = hit.el.getBoundingClientRect()
        // 竖条对齐到所在区块（或页眉）的左边缘，同一栏里的竖条排成一列
        const col =
          hit.el.closest<HTMLElement>('.r-section, .r-header') ?? hit.el
        const left = col.getBoundingClientRect().left - base.left - 12
        next[m.id] =
          hit.edge === 'span'
            ? { top: r.top - base.top, height: r.height, left }
            : {
                top: (hit.edge === 'top' ? r.top : r.bottom) - base.top,
                height: 0,
                left,
              }
      }
      setBoxes(next)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(paper)
    return () => ro.disconnect()
  }, [marks, paper, stage, layoutKey])

  const highlight = (m: Mark, on: boolean) => {
    // 删除的内容已不在纸面上，不去高亮旁边的元素
    if (!paper || m.kind === 'removed') return
    resolveMark(paper, m)?.el.classList.toggle('is-mark-hover', on)
  }
  const current = marks.find((m) => m.id === open)

  return (
    <div className='e-marks'>
      {marks.map((m) => {
        const b = boxes[m.id]
        if (!b) return null
        return (
          <MarkButton
            key={m.id}
            mark={m}
            box={b}
            on={open === m.id}
            ref={(el) => {
              buttons.current[m.id] = el
            }}
            onClick={() => setOpen((v) => (v === m.id ? null : m.id))}
            onHover={(on) => highlight(m, on)}
          />
        )
      })}
      {current && (
        <Popover
          anchor={buttons.current[current.id] ?? null}
          open
          onClose={() => setOpen(null)}
          placement='right'
          className='e-mark-pop'
        >
          <MarkDetail
            mark={current}
            onRevert={() => {
              highlight(current, false)
              setOpen(null)
              onRevert(current)
            }}
          />
        </Popover>
      )}
    </div>
  )
}

function MarkButton({
  mark,
  box,
  on,
  ref,
  onClick,
  onHover,
}: {
  mark: Mark
  box: Box
  on: boolean
  ref: (el: HTMLButtonElement | null) => void
  onClick(): void
  onHover(on: boolean): void
}) {
  const t = useT(M)
  return (
    <button
      ref={ref}
      type='button'
      className={`e-mark is-${mark.kind} ${on ? 'is-on' : ''}`}
      style={{ top: box.top, height: box.height || undefined, left: box.left }}
      aria-label={`${t[mark.kind]} · ${mark.label}`}
      title={`${t[mark.kind]} · ${mark.label}`}
      data-mark={mark.id}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    />
  )
}

function MarkDetail({ mark, onRevert }: { mark: Mark; onRevert(): void }) {
  const t = useT(M)
  const parts =
    mark.kind === 'changed'
      ? wordDiff(mark.before ?? '', mark.after ?? '')
      : [
          {
            type: mark.kind === 'added' ? ('add' as const) : ('del' as const),
            text: (mark.kind === 'added' ? mark.after : mark.before) ?? '',
          },
        ]
  return (
    <div className='e-mark-detail'>
      <div className='e-mark-head'>
        <span className={`e-mark-kind is-${mark.kind}`}>{t[mark.kind]}</span>
        <span>{mark.label}</span>
      </div>
      <p className='e-mark-diff'>
        {parts.map((p, i) =>
          p.type === 'same' ? (
            <span key={i}>{p.text}</span>
          ) : p.type === 'del' ? (
            <del key={i}>{p.text || t.empty}</del>
          ) : (
            <ins key={i}>{p.text || t.empty}</ins>
          )
        )}
      </p>
      <button type='button' className='u-btn is-sm' onClick={onRevert}>
        <Undo2 size={14} /> {mark.kind === 'removed' ? t.restore : t.revert}
      </button>
    </div>
  )
}

/** 修订标记打开时浮在顶栏下方的控制条：基准、计数、上一处 / 下一处、关闭 */
export function MarksBar({
  count,
  base,
  snapshots,
  onBase,
  onStep,
  onClose,
}: {
  count: number
  base: MarksBase
  snapshots: Snapshot[]
  onBase(b: MarksBase): void
  onStep(dir: 1 | -1): void
  onClose(): void
}) {
  const t = useT(M)
  const exportSnap = snapshots.find((s) => s.exported)
  const versions = snapshots.filter((s) => !s.exported)
  return (
    <div className='e-marks-bar' role='toolbar' aria-label={t.title}>
      <label>
        <span>{t.against}</span>
        <select
          value={base}
          onChange={(e) => onBase(e.currentTarget.value as MarksBase)}
        >
          <option value='session'>{t.session}</option>
          {exportSnap && (
            <option value='export'>
              {t.exported(stamp(exportSnap.createdAt))}
            </option>
          )}
          {versions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} · {stamp(s.createdAt)}
            </option>
          ))}
        </select>
      </label>
      <span className='e-marks-count' aria-live='polite'>
        {t.count(count)}
      </span>
      <button
        type='button'
        className='u-icon-btn is-sm'
        aria-label={t.prev}
        title={t.prev}
        disabled={!count}
        onClick={() => onStep(-1)}
      >
        <ChevronUp size={16} />
      </button>
      <button
        type='button'
        className='u-icon-btn is-sm'
        aria-label={t.next}
        title={t.next}
        disabled={!count}
        onClick={() => onStep(1)}
      >
        <ChevronDown size={16} />
      </button>
      <button
        type='button'
        className='u-icon-btn is-sm'
        aria-label={t.close}
        title={t.close}
        onClick={onClose}
      >
        <X size={15} />
      </button>
    </div>
  )
}
