import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Eye,
  EyeOff,
  ImagePlus,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { defineMessages, useLang, useT } from '../i18n'
import { CONTACT_META, KIND_META } from '../model/defaults'
import type {
  ContactKind,
  Item,
  Locale,
  ResumeDoc,
  Section,
} from '../model/types'
import type { Tools } from '../render/Resume'
import { undo } from '../store/store'
import { MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import { toast } from '../ui/toast'
import type { Actions } from './actions'

const M = defineMessages(
  {
    deleted: (title: string) => `已删除「${title}」`,
    undo: '撤销',
    add: (row: boolean) => `添加${row ? '一行' : '一条'}`,
    more: '更多',
    layout: '排版',
    entries: '经历条目',
    rows: '分类行（技能）',
    text: '段落 / 列表',
    hideSection: '在简历中隐藏',
    deleteSection: '删除区块',
    moveUp: '上移',
    moveDown: '下移',
    insertBelow: '在下方插入',
    showItem: (row: boolean) => `在简历中显示${row ? '这一行' : '这一条'}`,
    hideItem: (row: boolean) => `隐藏${row ? '这一行' : '这一条'}（保留内容）`,
    deleteItem: (row: boolean) => `删除${row ? '这一行' : '这一条'}`,
    contacts: '联系方式',
    photo: '照片',
    changePhoto: '更换照片',
    removePhoto: '移除照片',
    addLabel: '添加',
    removeLabel: '移除',
    emptyContact: (label: string) => `（空的${label}）`,
    emptyHint: '空的联系方式不会出现在导出的简历里。',
  },
  {
    deleted: (title: string) => `Deleted “${title}”`,
    undo: 'Undo',
    add: (row: boolean) => `Add ${row ? 'row' : 'entry'}`,
    more: 'More',
    layout: 'Layout',
    entries: 'Entries',
    rows: 'Grouped rows (skills)',
    text: 'Paragraph / list',
    hideSection: 'Hide from resume',
    deleteSection: 'Delete section',
    moveUp: 'Move up',
    moveDown: 'Move down',
    insertBelow: 'Insert below',
    showItem: (row: boolean) => `Show this ${row ? 'row' : 'entry'} on resume`,
    hideItem: (row: boolean) =>
      `Hide this ${row ? 'row' : 'entry'} (content is kept)`,
    deleteItem: (row: boolean) => `Delete this ${row ? 'row' : 'entry'}`,
    contacts: 'Contacts',
    photo: 'Photo',
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    addLabel: 'Add',
    removeLabel: 'Remove',
    emptyContact: (label: string) => `(${label}, empty)`,
    emptyHint: 'Empty contacts won’t appear in the exported resume.',
  }
)

const keep = (e: React.MouseEvent) => e.preventDefault()

/** 纸面上的悬停工具：区块页边工具条、条目工具条、页眉工具。 */
export function paperTools(doc: ResumeDoc, a: Actions): Tools {
  return {
    header: () => <HeaderTools doc={doc} a={a} />,
    section: (s) => <SectionTools doc={doc} section={s} a={a} />,
    item: (s, item, index) => (
      <ItemTools doc={doc} section={s} item={item} index={index} a={a} />
    ),
  }
}

function SectionTools({
  doc,
  section,
  a,
}: {
  doc: ResumeDoc
  section: Section
  a: Actions
}) {
  const t = useT(M)
  const lang = useLang()
  const more = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const removed = () => {
    a.removeSection(section.id)
    toast(t.deleted(sectionLabel(section, lang)), {
      label: t.undo,
      run: () => undo(doc.id),
    })
  }
  return (
    <div className='e-sec-tools' onMouseDown={keep} contentEditable={false}>
      <button
        type='button'
        title={t.add(section.layout === 'rows')}
        onClick={() => a.addItem(section.id)}
      >
        <Plus size={14} />
      </button>
      <button
        ref={more}
        type='button'
        title={t.more}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={14} />
      </button>
      <Popover
        anchor={more.current}
        open={open}
        onClose={() => setOpen(false)}
        title={section.title}
      >
        <div className='u-menu' role='menu'>
          <div className='u-menu-label'>{t.layout}</div>
          {(['entries', 'rows', 'text'] as const).map((layout) => (
            <MenuItem
              key={layout}
              aria-checked={section.layout === layout}
              onClick={() => {
                a.setLayout(section.id, layout)
                setOpen(false)
              }}
            >
              {t[layout]}
              {section.layout === layout ? ' ✓' : ''}
            </MenuItem>
          ))}
          <div className='u-menu-sep' />
          <MenuItem
            icon={<EyeOff size={15} />}
            onClick={() => {
              a.toggleSection(section.id)
              setOpen(false)
            }}
          >
            {t.hideSection}
          </MenuItem>
          <MenuItem
            icon={<Trash2 size={15} />}
            danger
            onClick={() => {
              setOpen(false)
              removed()
            }}
          >
            {t.deleteSection}
          </MenuItem>
        </div>
      </Popover>
    </div>
  )
}

function ItemTools({
  section,
  item,
  index,
  a,
}: {
  doc: ResumeDoc
  section: Section
  item: Item
  index: number
  a: Actions
}) {
  const t = useT(M)
  const last = index === section.items.length - 1
  const row = section.layout === 'rows'
  return (
    <div className='e-item-tools' onMouseDown={keep} contentEditable={false}>
      <button
        type='button'
        title={t.moveUp}
        disabled={index === 0}
        onClick={() => a.moveItem(section.id, item.id, -1)}
      >
        <ArrowUp size={13} />
      </button>
      <button
        type='button'
        title={t.moveDown}
        disabled={last}
        onClick={() => a.moveItem(section.id, item.id, 1)}
      >
        <ArrowDown size={13} />
      </button>
      <button
        type='button'
        title={t.insertBelow}
        onClick={() => a.addItem(section.id, section.items.indexOf(item) + 1)}
      >
        <Plus size={13} />
      </button>
      <button
        type='button'
        title={item.hidden ? t.showItem(row) : t.hideItem(row)}
        onClick={() => a.toggleItem(section.id, item.id)}
      >
        {item.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button
        type='button'
        className='is-danger'
        title={t.deleteItem(row)}
        onClick={() => a.removeItem(section.id, item.id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

const CONTACT_KINDS = Object.keys(CONTACT_META) as ContactKind[]

function HeaderTools({ doc, a }: { doc: ResumeDoc; a: Actions }) {
  const t = useT(M)
  const lang = useLang()
  const btn = useRef<HTMLButtonElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const empty = doc.profile.contacts.filter((c) => !c.value.trim())
  return (
    <div className='e-head-tools' onMouseDown={keep} contentEditable={false}>
      <button ref={btn} type='button' onClick={() => setOpen((v) => !v)}>
        <AtSign size={13} /> {t.contacts}
      </button>
      <button type='button' onClick={() => file.current?.click()}>
        <ImagePlus size={13} /> {doc.profile.photo ? t.changePhoto : t.photo}
      </button>
      {doc.profile.photo && (
        <button
          type='button'
          title={t.removePhoto}
          onClick={() => a.setPhoto('')}
        >
          <X size={13} />
        </button>
      )}
      <input
        ref={file}
        type='file'
        accept='image/*'
        hidden
        onChange={async (e) => {
          const f = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (f) a.setPhoto(await downscale(f))
        }}
      />
      <Popover
        anchor={btn.current}
        open={open}
        onClose={() => setOpen(false)}
        title={t.contacts}
      >
        <div className='u-menu' role='menu'>
          <div className='u-menu-label'>{t.addLabel}</div>
          {CONTACT_KINDS.map((k) => (
            <MenuItem
              key={k}
              onClick={() => {
                a.addContact(k)
                setOpen(false)
              }}
            >
              {CONTACT_META[k].label[lang]}
            </MenuItem>
          ))}
          {doc.profile.contacts.length > 0 && <div className='u-menu-sep' />}
          {doc.profile.contacts.length > 0 && (
            <div className='u-menu-label'>{t.removeLabel}</div>
          )}
          {doc.profile.contacts.map((c) => (
            <MenuItem
              key={c.id}
              icon={<X size={14} />}
              onClick={() => a.removeContact(c.id)}
            >
              {c.value || t.emptyContact(CONTACT_META[c.kind].label[lang])}
            </MenuItem>
          ))}
          {empty.length > 0 && <div className='u-menu-hint'>{t.emptyHint}</div>}
        </div>
      </Popover>
    </div>
  )
}

/** 照片压缩到 600px 以内的 JPEG data URL，避免撑大本地数据库 */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.86)
}

export const sectionLabel = (s: Section, lang: Locale) =>
  s.title.trim() || KIND_META[s.kind][lang]
