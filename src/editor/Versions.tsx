import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { defineMessages, intlLocale, useLang, useT } from '../i18n'
import { type Change, diffDocs } from '../model/diff'
import type { ResumeDoc, Snapshot } from '../model/types'
import {
  deleteSnapshot,
  listSnapshots,
  restoreSnapshot,
  saveSnapshot,
  useApp,
} from '../store/store'
import { Button } from '../ui/controls'
import { ago, stamp } from '../ui/time'
import { toast } from '../ui/toast'

const M = defineMessages(
  {
    added: '新增',
    removed: '删除',
    changed: '修改',
    moved: '调整',
    defaultLabel: (when: string) => `版本 ${when}`,
    saved: '已保存当前版本',
    namePlaceholder: '给当前版本起个名字，如「投递字节」',
    nameLabel: '版本名称',
    save: '保存版本',
    empty:
      '还没有历史版本。每天第一次编辑前会自动保存一份，你也可以随时手动保存。',
    auto: '自动',
    deleteVersion: (label: string) => `删除版本 ${label}`,
    delete: '删除',
    backToList: '返回版本列表',
    now: '现在',
    restored: (label: string) => `已恢复到「${label}」，当前版本已另存`,
    restore: '恢复',
    identical: '与当前内容完全一致。',
  },
  {
    added: 'Added',
    removed: 'Removed',
    changed: 'Changed',
    moved: 'Moved',
    defaultLabel: (when: string) => `Version ${when}`,
    saved: 'Current version saved',
    namePlaceholder: 'Name this version, e.g. “Applied to Stripe”',
    nameLabel: 'Version name',
    save: 'Save version',
    empty:
      'No versions yet. A copy is saved automatically before your first edit each day, and you can save one manually anytime.',
    auto: 'Auto',
    deleteVersion: (label: string) => `Delete version ${label}`,
    delete: 'Delete',
    backToList: 'Back to versions',
    now: 'now',
    restored: (label: string) =>
      `Restored “${label}” — the current version was saved first`,
    restore: 'Restore',
    identical: 'Identical to the current content.',
  }
)

/** 版本面板：命名保存、列表、与当前对比、恢复 */
export function Versions({ doc, onDone }: { doc: ResumeDoc; onDone(): void }) {
  const t = useT(M)
  const lang = useLang()
  const version = useApp((s) => s.snapshots[doc.id] ?? 0)
  const [list, setList] = useState<Snapshot[] | null>(null)
  const [label, setLabel] = useState('')
  const [viewing, setViewing] = useState<Snapshot | null>(null)

  useEffect(() => {
    let alive = true
    void listSnapshots(doc.id).then((l) => alive && setList(l))
    return () => {
      alive = false
    }
    // version 变化即重新读取
  }, [doc.id, version])

  if (viewing)
    return (
      <Compare
        doc={doc}
        snapshot={viewing}
        onBack={() => setViewing(null)}
        onDone={onDone}
      />
    )

  const save = async () => {
    await saveSnapshot(
      doc.id,
      label || t.defaultLabel(stamp(new Date().toISOString()))
    )
    setLabel('')
    toast(t.saved)
  }

  return (
    <div className='e-panel e-versions'>
      <form
        className='e-version-save'
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          placeholder={t.namePlaceholder}
          aria-label={t.nameLabel}
          maxLength={40}
        />
        <Button variant='primary' size='sm' type='submit'>
          {t.save}
        </Button>
      </form>
      {list === null ? null : list.length === 0 ? (
        <p className='e-hint'>{t.empty}</p>
      ) : (
        <ul className='e-version-list'>
          {list.map((s) => (
            <li key={s.id}>
              <button
                type='button'
                className='e-version'
                onClick={() => setViewing(s)}
              >
                <strong>
                  {s.label}
                  {s.auto && <em>{t.auto}</em>}
                </strong>
                <span
                  title={new Date(s.createdAt).toLocaleString(intlLocale(lang))}
                >
                  {ago(s.createdAt)}
                </span>
              </button>
              <button
                type='button'
                className='u-icon-btn is-sm'
                aria-label={t.deleteVersion(s.label)}
                title={t.delete}
                onClick={() => void deleteSnapshot(doc.id, s.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Compare({
  doc,
  snapshot,
  onBack,
  onDone,
}: {
  doc: ResumeDoc
  snapshot: Snapshot
  onBack(): void
  onDone(): void
}) {
  const t = useT(M)
  const lang = useLang()
  const changes = useMemo(
    () => diffDocs(snapshot.doc, doc, lang),
    [snapshot, doc, lang]
  )
  const groups = useMemo(() => {
    const map = new Map<string, Change[]>()
    for (const c of changes) map.set(c.where, [...(map.get(c.where) ?? []), c])
    return [...map]
  }, [changes])
  return (
    <div className='e-panel e-versions'>
      <div className='e-version-head'>
        <button
          type='button'
          className='u-icon-btn is-sm'
          aria-label={t.backToList}
          onClick={onBack}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <strong>{snapshot.label}</strong>
          <span>
            {stamp(snapshot.createdAt)} → {t.now}
          </span>
        </div>
        <Button
          size='sm'
          variant='primary'
          onClick={async () => {
            await restoreSnapshot(doc.id, snapshot)
            toast(t.restored(snapshot.label))
            onDone()
          }}
        >
          <RotateCcw size={14} /> {t.restore}
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className='e-hint'>{t.identical}</p>
      ) : (
        <div className='e-diff'>
          {groups.map(([where, list]) => (
            <section key={where}>
              <h4>{where}</h4>
              {list.map((c, i) => (
                <div key={i} className={`e-diff-row is-${c.kind}`}>
                  <span className='e-diff-tag'>{t[c.kind]}</span>
                  <div>
                    <b>{c.what}</b>
                    {c.before !== undefined && c.before !== '' && (
                      <del>{c.before}</del>
                    )}
                    {c.after !== undefined && c.after !== '' && (
                      <ins>{c.after}</ins>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
