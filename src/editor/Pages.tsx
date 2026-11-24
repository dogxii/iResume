import type { CSSProperties } from 'react'
import { defineMessages, useT } from '../i18n'
import type { ResumeDoc } from '../model/types'
import { Resume } from '../render/Resume'
import { pagePx, themeAttrs, themeVars } from '../theme/css'
import type { Measure } from './measure'

const M = defineMessages(
  { page: (i: number, n: number) => `第 ${i} 页，共 ${n} 页` },
  { page: (i: number, n: number) => `Page ${i} of ${n}` }
)

/**
 * 逐页预览：每页由若干「窗口」拼成，每个窗口显示纸面的一段，
 * 切分位置来自 measurePaper 的分页模拟，与打印结果一致。
 */
export function Pages({ doc, measure }: { doc: ResumeDoc; measure: Measure }) {
  const t = useT(M)
  const [w, h] = pagePx(doc.theme.page)
  const n = measure.frames.length
  return (
    <div className='e-pages'>
      {measure.frames.map((frames, i) => (
        <section
          key={i}
          className='e-page'
          style={{ width: w, height: h }}
          aria-label={t.page(i + 1, n)}
        >
          {/* 纸张底色（双栏版式的侧栏色带） */}
          <div
            className='r-paper e-page-bg'
            style={themeVars(doc.theme) as CSSProperties}
            {...themeAttrs(doc.theme)}
          />
          {frames.map((f) => (
            <div
              key={f.left}
              className='e-page-window'
              style={{
                left: f.left,
                width: f.width,
                top: f.top,
                height: f.to - f.from,
              }}
            >
              <div
                style={{ transform: `translate(${-f.left}px, ${-f.from}px)` }}
              >
                <Resume doc={doc} />
              </div>
            </div>
          ))}
          {n > 1 && (
            <span className='e-page-no' aria-hidden>
              {i + 1} / {n}
            </span>
          )}
        </section>
      ))}
    </div>
  )
}
