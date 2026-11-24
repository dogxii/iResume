import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

const KIND_LABEL: Record<Change['kind'], string> = {
  added: '新增',
  removed: '删除',
  changed: '修改',
  moved: '调整',
}

/** 版本面板：命名保存、列表、与当前对比、恢复 */
export function Versions({ doc, onDone }: { doc: ResumeDoc; onDone(): void }) {
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
      label || `版本 ${stamp(new Date().toISOString())}`
    )
    setLabel('')
    toast('已保存当前版本')
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
          placeholder='给当前版本起个名字，如「投递字节」'
          aria-label='版本名称'
          maxLength={40}
        />
        <Button variant='primary' size='sm' type='submit'>
          保存版本
        </Button>
      </form>
      {list === null ? null : list.length === 0 ? (
        <p className='e-hint'>
          还没有历史版本。每天第一次编辑前会自动保存一份，你也可以随时手动保存。
        </p>
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
                  {s.auto && <em>自动</em>}
                </strong>
                <span title={new Date(s.createdAt).toLocaleString('zh-CN')}>
                  {ago(s.createdAt)}
                </span>
              </button>
              <button
                type='button'
                className='u-icon-btn is-sm'
                aria-label={`删除版本 ${s.label}`}
                title='删除'
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
  const changes = useMemo(() => diffDocs(snapshot.doc, doc), [snapshot, doc])
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
          aria-label='返回版本列表'
          onClick={onBack}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <strong>{snapshot.label}</strong>
          <span>{stamp(snapshot.createdAt)} → 现在</span>
        </div>
        <Button
          size='sm'
          variant='primary'
          onClick={async () => {
            await restoreSnapshot(doc.id, snapshot)
            toast(`已恢复到「${snapshot.label}」，当前版本已另存`)
            onDone()
          }}
        >
          <RotateCcw size={14} /> 恢复
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className='e-hint'>与当前内容完全一致。</p>
      ) : (
        <div className='e-diff'>
          {groups.map(([where, list]) => (
            <section key={where}>
              <h4>{where}</h4>
              {list.map((c, i) => (
                <div key={i} className={`e-diff-row is-${c.kind}`}>
                  <span className='e-diff-tag'>{KIND_LABEL[c.kind]}</span>
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
