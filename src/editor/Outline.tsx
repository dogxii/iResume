import { Eye, EyeOff, GripVertical, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { defineMessages, useLang, useT } from '../i18n'
import { ADDABLE_KINDS, KIND_META } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import type { Actions } from './actions'
import { sectionLabel } from './PaperTools'

const M = defineMessages(
  {
    outline: '大纲',
    profile: '个人信息',
    show: '在简历中显示',
    hide: '在简历中隐藏',
    showNamed: (name: string) => `显示${name}`,
    hideNamed: (name: string) => `隐藏${name}`,
    sectionShort: '区块',
    addSection: '添加区块',
    added: '已有',
  },
  {
    outline: 'Outline',
    profile: 'Personal info',
    show: 'Show on resume',
    hide: 'Hide from resume',
    showNamed: (name: string) => `Show ${name}`,
    hideNamed: (name: string) => `Hide ${name}`,
    sectionShort: 'Section',
    addSection: 'Add section',
    added: 'Added',
  }
)

interface Props {
  collapsed?: boolean
  doc: ResumeDoc
  a: Actions
  active?: string
  onJump(sectionId: string): void
}

/** 纯文字大纲：跳转、拖动排序、显示 / 隐藏、添加区块 */
export function Outline({ doc, a, active, onJump, collapsed }: Props) {
  const t = useT(M)
  const lang = useLang()
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null)
  return (
    <nav
      className={`e-outline ${collapsed ? 'is-collapsed' : ''}`}
      aria-label={t.outline}
      inert={collapsed}
    >
      <div className='e-outline-label'>{t.outline}</div>
      <ol>
        <li>
          <button
            type='button'
            className={`e-outline-row ${active === 'profile' ? 'is-active' : ''}`}
            onClick={() => onJump('profile')}
          >
            <span className='e-outline-name'>{t.profile}</span>
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
                {sectionLabel(s, lang)}
              </button>
              <button
                type='button'
                className='e-outline-eye'
                title={s.hidden ? t.show : t.hide}
                aria-label={
                  s.hidden
                    ? t.showNamed(sectionLabel(s, lang))
                    : t.hideNamed(sectionLabel(s, lang))
                }
                onClick={() => a.toggleSection(s.id)}
              >
                {s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <AddSection doc={doc} a={a} placement='right' />
    </nav>
  )
}

export function AddSection({
  doc,
  a,
  compact,
  placement,
}: {
  doc: ResumeDoc
  a: Actions
  compact?: boolean
  /** 大纲里的按钮：菜单向右展开，不盖住大纲 */
  placement?: 'right'
}) {
  const t = useT(M)
  const lang = useLang()
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
        <Plus size={14} /> {compact ? t.sectionShort : t.addSection}
      </button>
      <Popover
        anchor={ref.current}
        open={open}
        onClose={() => setOpen(false)}
        title={t.addSection}
        placement={placement}
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
              <b>{KIND_META[kind][lang]}</b>
              {used.has(kind) && kind !== 'custom' ? (
                <em> · {t.added}</em>
              ) : null}
              {KIND_META[kind].hint[lang] && (
                <small>{KIND_META[kind].hint[lang]}</small>
              )}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  )
}
