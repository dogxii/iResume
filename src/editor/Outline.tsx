import { Eye, EyeOff, GripVertical, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ADDABLE_KINDS, KIND_META } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import type { Actions } from './actions'
import { sectionLabel } from './PaperTools'

interface Props {
  doc: ResumeDoc
  a: Actions
  active?: string
  onJump(sectionId: string): void
}

/** 纯文字大纲：跳转、拖动排序、显示 / 隐藏、添加区块 */
export function Outline({ doc, a, active, onJump }: Props) {
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null)
  return (
    <nav className='e-outline' aria-label='大纲'>
      <div className='e-outline-label'>大纲</div>
      <ol>
        <li>
          <button
            type='button'
            className={`e-outline-row ${active === 'profile' ? 'is-active' : ''}`}
            onClick={() => onJump('profile')}
          >
            <span className='e-outline-name'>个人信息</span>
          </button>
        </li>
        {doc.sections.map((s, index) => (
          <li
            key={s.id}
            draggable
            data-over={
              drag && drag.over === index && drag.id !== s.id
                ? drag.over > doc.sections.findIndex((x) => x.id === drag.id)
                  ? 'after'
                  : 'before'
                : undefined
            }
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', s.id)
              setDrag({ id: s.id, over: index })
            }}
            onDragOver={(e) => {
              if (!drag) return
              e.preventDefault()
              if (drag.over !== index) setDrag({ ...drag, over: index })
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (drag) a.moveSection(drag.id, index)
              setDrag(null)
            }}
            onDragEnd={() => setDrag(null)}
          >
            <div
              className={`e-outline-row ${active === s.id ? 'is-active' : ''} ${s.hidden ? 'is-hidden' : ''}`}
            >
              <GripVertical size={13} className='e-grip' aria-hidden />
              <button
                type='button'
                className='e-outline-name'
                onClick={() => onJump(s.id)}
              >
                {sectionLabel(s)}
              </button>
              <button
                type='button'
                className='e-outline-eye'
                title={s.hidden ? '在简历中显示' : '在简历中隐藏'}
                aria-label={
                  s.hidden ? `显示${sectionLabel(s)}` : `隐藏${sectionLabel(s)}`
                }
                onClick={() => a.toggleSection(s.id)}
              >
                {s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <AddSection doc={doc} a={a} />
    </nav>
  )
}

export function AddSection({
  doc,
  a,
  compact,
}: {
  doc: ResumeDoc
  a: Actions
  compact?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const used = new Set(doc.sections.map((s) => s.kind))
  return (
    <>
      <button
        ref={ref}
        type='button'
        className='e-add-section'
        onClick={() => setOpen((v) => !v)}
      >
        <Plus size={14} /> {compact ? '区块' : '添加区块'}
      </button>
      <Popover
        anchor={ref.current}
        open={open}
        onClose={() => setOpen(false)}
        title='添加区块'
      >
        <div className='u-menu is-wide' role='menu'>
          {ADDABLE_KINDS.map((kind) => (
            <MenuItem
              key={kind}
              onClick={() => {
                a.addSection(kind, doc.locale)
                setOpen(false)
              }}
            >
              <b>{KIND_META[kind].zh}</b>
              {used.has(kind) && kind !== 'custom' ? <em> · 已有</em> : null}
              {KIND_META[kind].hint && <small>{KIND_META[kind].hint}</small>}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  )
}
