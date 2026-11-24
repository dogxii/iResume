import { Copy, GitBranchPlus } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { defineMessages, useT } from '../i18n'
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

const M = defineMessages(
  {
    missing: '缺失',
    missingHint: '点击复制，写进真实做过的经历里',
    partial: '部分匹配',
    partialHint: '意思接近，建议改用 JD 的原词',
    covered: '已覆盖',
    coveredHint: '',
    copied: (text: string) => `已复制「${text}」`,
    noClipboard: '无法访问剪贴板',
    derivedFrom: (name: string) => `定制版本 · 派生自「${name}」`,
    deletedResume: '已删除的简历',
    deriveHint: '投递前建议先派生一份定制版，原简历保持不动。',
    derive: '派生定制版',
    company: '公司',
    companyPlaceholder: '如：星图科技',
    role: '岗位',
    rolePlaceholder: '如：高级前端工程师',
    jd: '岗位描述（JD）',
    jdPlaceholder:
      '把招聘页上的「岗位职责」和「任职要求」整段粘贴进来。只在本机分析，不会上传。',
    coverage: (covered: number, total: number) =>
      `关键词覆盖 · ${covered}/${total}`,
    copy: '复制',
    footnote: '关键词只是线索，不是清单：只写你真正做过、面试时讲得清的内容。',
  },
  {
    missing: 'Missing',
    missingHint:
      'Click to copy, then work it into experience you actually have',
    partial: 'Partial match',
    partialHint: 'Close in meaning — consider using the JD’s exact wording',
    covered: 'Covered',
    coveredHint: '',
    copied: (text: string) => `Copied “${text}”`,
    noClipboard: 'Can’t access the clipboard',
    derivedFrom: (name: string) => `Tailored version · based on “${name}”`,
    deletedResume: 'a deleted resume',
    deriveHint:
      'Before applying, create a tailored copy so the original stays untouched.',
    derive: 'Create tailored copy',
    company: 'Company',
    companyPlaceholder: 'e.g. Acme Inc.',
    role: 'Role',
    rolePlaceholder: 'e.g. Senior Frontend Engineer',
    jd: 'Job description',
    jdPlaceholder:
      'Paste the full responsibilities and requirements from the job posting. Analyzed locally — nothing is uploaded.',
    coverage: (covered: number, total: number) =>
      `Keyword coverage · ${covered}/${total}`,
    copy: 'Copy',
    footnote:
      'Keywords are hints, not a checklist: only include what you’ve really done and can speak to in an interview.',
  }
)

const GROUPS: MatchedKeyword['coverage'][] = ['missing', 'partial', 'covered']

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
  const t = useT(M)
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
      toast(t.copied(text))
    } catch {
      toast(t.noClipboard)
    }
  }

  return (
    <div className='e-panel e-match'>
      {target?.baseId ? (
        <p className='e-hint'>{t.derivedFrom(base?.name ?? t.deletedResume)}</p>
      ) : (
        <div className='e-match-derive'>
          <p className='e-hint'>{t.deriveHint}</p>
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
            <GitBranchPlus size={14} /> {t.derive}
          </button>
        </div>
      )}
      <div className='e-match-fields'>
        <label>
          <span>{t.company}</span>
          <input
            value={target?.company ?? ''}
            placeholder={t.companyPlaceholder}
            onChange={(e) => a.setTarget({ company: e.currentTarget.value })}
          />
        </label>
        <label>
          <span>{t.role}</span>
          <input
            value={target?.role ?? ''}
            placeholder={t.rolePlaceholder}
            onChange={(e) => a.setTarget({ role: e.currentTarget.value })}
          />
        </label>
      </div>
      <label className='e-match-jd'>
        <span>{t.jd}</span>
        <textarea
          value={jd}
          rows={jd ? 5 : 7}
          placeholder={t.jdPlaceholder}
          onChange={(e) => a.setTarget({ jd: e.currentTarget.value })}
        />
      </label>
      {keywords.length > 0 && (
        <>
          <div className='e-match-score'>
            <div>
              <strong>{result.score}%</strong>
              <span>
                {t.coverage(
                  result.keywords.filter((k) => k.coverage === 'covered')
                    .length,
                  keywords.length
                )}
              </span>
            </div>
            <span className='e-match-bar'>
              <span style={{ width: `${result.score}%` }} />
            </span>
          </div>
          {GROUPS.map((g) => {
            const list = result.keywords.filter((k) => k.coverage === g)
            if (!list.length) return null
            const hint = t[`${g}Hint`]
            return (
              <div key={g} className='e-match-group'>
                <div className='e-row-label'>
                  {t[g]} · {list.length}
                  {hint && <em>{hint}</em>}
                </div>
                <div className={`e-kw is-${g}`}>
                  {list.map((k) =>
                    g === 'covered' ? (
                      <span key={k.key}>{k.label}</span>
                    ) : (
                      <button
                        type='button'
                        key={k.key}
                        onClick={() => void copy(k.label)}
                        title={t.copy}
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
          <p className='e-hint'>{t.footnote}</p>
        </>
      )}
    </div>
  )
}
