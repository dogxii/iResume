import { Copy, GitBranchPlus } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import {
  extractKeywords,
  type MatchedKeyword,
  matchKeywords,
} from '../match/keywords'
import type { ResumeDoc } from '../model/types'
import { derive, useApp } from '../store/store'
import { toast } from '../ui/toast'
import type { actions } from './actions'

type Actions = ReturnType<typeof actions>

const GROUPS: {
  key: MatchedKeyword['coverage']
  title: string
  hint: string
}[] = [
  { key: 'missing', title: '缺失', hint: '点击复制，写进真实做过的经历里' },
  { key: 'partial', title: '部分匹配', hint: '意思接近，建议改用 JD 的原词' },
  { key: 'covered', title: '已覆盖', hint: '' },
]

/** 岗位匹配：粘贴 JD，本地提取关键词，对照简历的覆盖情况 */
export function MatchPanel({
  doc,
  a,
  onDerived,
}: {
  doc: ResumeDoc
  a: Actions
  onDerived(id: string): void
}) {
  const target = doc.target
  const jd = target?.jd ?? ''
  const deferred = useDeferredValue(doc)
  const keywords = useMemo(() => extractKeywords(jd), [jd])
  const result = useMemo(
    () => matchKeywords(deferred, keywords),
    [deferred, keywords]
  )
  const base = useApp((s) =>
    target?.baseId ? s.docs[target.baseId] : undefined
  )

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`已复制「${text}」`)
    } catch {
      toast('无法访问剪贴板')
    }
  }

  return (
    <div className='e-panel e-match'>
      {target?.baseId ? (
        <p className='e-hint'>
          定制版本 · 派生自「{base?.name ?? '已删除的简历'}」
        </p>
      ) : (
        <div className='e-match-derive'>
          <p className='e-hint'>投递前建议先派生一份定制版，原简历保持不动。</p>
          <button
            type='button'
            className='u-btn is-soft is-sm'
            onClick={() => {
              const copy = derive(doc.id, {
                role: target?.role,
                company: target?.company,
                jd,
              })
              if (copy) onDerived(copy.id)
            }}
          >
            <GitBranchPlus size={14} /> 派生定制版
          </button>
        </div>
      )}
      <div className='e-match-fields'>
        <label>
          <span>公司</span>
          <input
            value={target?.company ?? ''}
            placeholder='如：星图科技'
            onChange={(e) => a.setTarget({ company: e.currentTarget.value })}
          />
        </label>
        <label>
          <span>岗位</span>
          <input
            value={target?.role ?? ''}
            placeholder='如：高级前端工程师'
            onChange={(e) => a.setTarget({ role: e.currentTarget.value })}
          />
        </label>
      </div>
      <label className='e-match-jd'>
        <span>岗位描述（JD）</span>
        <textarea
          value={jd}
          rows={jd ? 5 : 7}
          placeholder='把招聘页上的「岗位职责」和「任职要求」整段粘贴进来。只在本机分析，不会上传。'
          onChange={(e) => a.setTarget({ jd: e.currentTarget.value })}
        />
      </label>
      {keywords.length > 0 && (
        <>
          <div className='e-match-score'>
            <div>
              <strong>{result.score}%</strong>
              <span>
                关键词覆盖 ·{' '}
                {result.keywords.filter((k) => k.coverage === 'covered').length}
                /{keywords.length}
              </span>
            </div>
            <span className='e-match-bar'>
              <span style={{ width: `${result.score}%` }} />
            </span>
          </div>
          {GROUPS.map((g) => {
            const list = result.keywords.filter((k) => k.coverage === g.key)
            if (!list.length) return null
            return (
              <div key={g.key} className='e-match-group'>
                <div className='e-row-label'>
                  {g.title} · {list.length}
                  {g.hint && <em>{g.hint}</em>}
                </div>
                <div className={`e-kw is-${g.key}`}>
                  {list.map((k) =>
                    g.key === 'covered' ? (
                      <span key={k.key}>{k.label}</span>
                    ) : (
                      <button
                        type='button'
                        key={k.key}
                        onClick={() => void copy(k.label)}
                        title='复制'
                      >
                        {k.label}
                        <Copy size={11} />
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
          <p className='e-hint'>
            关键词只是线索，不是清单：只写你真正做过、面试时讲得清的内容。
          </p>
        </>
      )}
    </div>
  )
}
