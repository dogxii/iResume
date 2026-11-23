import { Check, Download, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { type CSSProperties, useRef } from 'react'
import type { DateStyle } from '../model/dates'
import type { ResumeDoc } from '../model/types'
import { Resume } from '../render/Resume'
import { saveThemes, useApp } from '../store/store'
import { FONT_LABELS, FONT_STACKS } from '../theme/css'
import {
  FONT_IDS,
  isPristine,
  LIMITS,
  normalizeTheme,
} from '../theme/normalize'
import { ACCENTS, PRESETS, presetById } from '../theme/presets'
import type { Theme } from '../theme/types'
import { Button, Segmented, Slider, Toggle } from '../ui/controls'
import { toast } from '../ui/toast'
import type { Actions } from './actions'
import { download, safeFilename } from './print'

interface P {
  doc: ResumeDoc
  a: Actions
}

/** 应用另一个主题时保留与内容相关的设置（纸张、日期写法） */
function adopt(next: Theme, current: Theme): Theme {
  return {
    ...structuredClone(next),
    page: current.page,
    date: { ...current.date },
  }
}

function Thumb({ doc, theme }: { doc: ResumeDoc; theme: Theme }) {
  return (
    <div className='e-thumb' aria-hidden>
      <div className='e-thumb-zoom'>
        <Resume doc={{ ...doc, theme }} />
      </div>
    </div>
  )
}

export function ThemeGallery({ doc, a }: P) {
  const saved = useApp((s) => s.themes)
  const file = useRef<HTMLInputElement>(null)
  const pristine = isPristine(doc.theme)
  const current = doc.theme.preset
  return (
    <div className='e-panel is-gallery'>
      <div className='e-gallery'>
        {PRESETS.map(({ theme, blurb, ats }) => {
          const on = current === theme.preset && pristine
          return (
            <button
              key={theme.preset}
              type='button'
              className={`e-gallery-item ${on ? 'is-on' : ''}`}
              onClick={() => a.setTheme(adopt(theme, doc.theme))}
              title={blurb}
            >
              <Thumb doc={doc} theme={adopt(theme, doc.theme)} />
              <span className='e-gallery-name'>
                {theme.name}
                {ats && <em title='单栏、标准标题，适合 ATS 自动解析'>ATS</em>}
              </span>
            </button>
          )
        })}
        {saved.map((theme, index) => (
          <div
            key={`${theme.name}-${index}`}
            className='e-gallery-item is-saved'
          >
            <button
              type='button'
              onClick={() => a.setTheme(adopt(theme, doc.theme))}
            >
              <Thumb doc={doc} theme={adopt(theme, doc.theme)} />
              <span className='e-gallery-name'>{theme.name}</span>
            </button>
            <button
              type='button'
              className='e-gallery-del'
              title='删除这个主题'
              onClick={() => saveThemes(saved.filter((_, i) => i !== index))}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className='e-panel-foot'>
        <span className='e-muted'>
          当前：{presetById(current)?.theme.name ?? current}
          {pristine ? '' : ' · 已自定义'}
        </span>
        <span className='e-spacer' />
        {!pristine && (
          <Button
            size='sm'
            onClick={() => {
              const p = presetById(current)
              if (p) a.setTheme(adopt(p.theme, doc.theme))
            }}
          >
            <RotateCcw size={14} /> 恢复
          </Button>
        )}
        <Button
          size='sm'
          onClick={() => {
            const name = window.prompt(
              '给这个主题起个名字',
              pristine ? `${doc.theme.name} 改` : '我的主题'
            )
            if (!name) return
            saveThemes([...saved, { ...structuredClone(doc.theme), name }])
            toast(`已保存主题「${name}」`)
          }}
        >
          <Save size={14} /> 另存为
        </Button>
        <Button
          size='sm'
          title='导出主题文件，可分享给他人'
          onClick={() =>
            download(
              `${safeFilename(doc.theme.name)}.iresume-theme.json`,
              JSON.stringify(
                { format: 'iresume-theme', theme: doc.theme },
                null,
                2
              )
            )
          }
        >
          <Download size={14} />
        </Button>
        <Button
          size='sm'
          title='导入主题文件'
          onClick={() => file.current?.click()}
        >
          <Upload size={14} />
        </Button>
        <input
          ref={file}
          type='file'
          accept='.json,application/json'
          hidden
          onChange={async (e) => {
            const f = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (!f) return
            try {
              const raw = JSON.parse(await f.text())
              const theme = normalizeTheme(raw?.theme ?? raw)
              saveThemes([...saved, theme])
              a.setTheme(adopt(theme, doc.theme))
              toast(`已导入主题「${theme.name}」`)
            } catch {
              toast('无法读取这个主题文件')
            }
          }}
        />
      </div>
    </div>
  )
}

export function LayoutPanel({ doc, a }: P) {
  const t = doc.theme
  const set = (fn: (t: Theme) => void) => a.theme(fn)
  return (
    <div className='e-panel'>
      <Row label='版式'>
        <Segmented
          value={t.layout}
          onChange={(v) =>
            set((x) => {
              x.layout = v
              if (v.startsWith('aside') && x.aside.length === 0)
                x.aside = ['skills', 'education', 'awards']
            })
          }
          options={[
            { value: 'single', label: '单栏' },
            { value: 'side-headings', label: '侧标题' },
            { value: 'aside-left', label: '左侧栏' },
            { value: 'aside-right', label: '右侧栏' },
          ]}
        />
      </Row>
      {t.layout.startsWith('aside') && (
        <Row label='侧栏'>
          <div className='e-chips'>
            {doc.sections.map((s) => (
              <button
                key={s.id}
                type='button'
                className={t.aside.includes(s.kind) ? 'is-on' : ''}
                onClick={() =>
                  set((x) => {
                    x.aside = x.aside.includes(s.kind)
                      ? x.aside.filter((k) => k !== s.kind)
                      : [...x.aside, s.kind]
                  })
                }
              >
                {s.title}
              </button>
            ))}
          </div>
        </Row>
      )}
      <Row label='页眉'>
        <Segmented
          value={t.header.align}
          onChange={(v) =>
            set((x) => {
              x.header.align = v
            })
          }
          options={[
            { value: 'left', label: '左对齐' },
            { value: 'center', label: '居中' },
            { value: 'split', label: '两端' },
          ]}
        />
      </Row>
      <Row label='联系方式'>
        <Segmented
          value={t.header.contacts}
          onChange={(v) =>
            set((x) => {
              x.header.contacts = v
            })
          }
          options={[
            { value: 'inline', label: '一行' },
            { value: 'stacked', label: '竖排' },
          ]}
        />
      </Row>
      <Row label='照片'>
        <Segmented
          value={t.header.photo}
          onChange={(v) =>
            set((x) => {
              x.header.photo = v
            })
          }
          options={[
            { value: 'none', label: '不显示' },
            { value: 'rounded', label: '圆角' },
            { value: 'circle', label: '圆形' },
          ]}
        />
      </Row>
      <Row label='区块标题'>
        <Segmented
          value={t.heading.style}
          onChange={(v) =>
            set((x) => {
              x.heading.style = v
            })
          }
          options={[
            { value: 'rule', label: '细线' },
            { value: 'underline', label: '短线' },
            { value: 'bar', label: '色条' },
            { value: 'band', label: '底色' },
            { value: 'plain', label: '无' },
          ]}
        />
      </Row>
      <Row label=''>
        <Toggle
          label='标题大写 + 字距（英文简历常用）'
          checked={t.heading.caps}
          onChange={(v) =>
            set((x) => {
              x.heading.caps = v
            })
          }
        />
      </Row>
      <Row label='日期位置'>
        <Segmented
          value={t.entry.date}
          onChange={(v) =>
            set((x) => {
              x.entry.date = v
            })
          }
          options={[
            { value: 'right', label: '右侧' },
            { value: 'below', label: '标题下' },
            { value: 'gutter', label: '左列' },
          ]}
        />
      </Row>
      {t.entry.date === 'gutter' && (
        <Row label=''>
          <Toggle
            label='时间轴'
            checked={t.entry.timeline}
            onChange={(v) =>
              set((x) => {
                x.entry.timeline = v
              })
            }
          />
        </Row>
      )}
      <Row label='职位 / 专业'>
        <Segmented
          value={t.entry.sub}
          onChange={(v) =>
            set((x) => {
              x.entry.sub = v
            })
          }
          options={[
            { value: 'inline', label: '同一行' },
            { value: 'below', label: '另起一行' },
          ]}
        />
      </Row>
      <Row label='要点符号'>
        <Segmented
          value={t.bullet}
          onChange={(v) =>
            set((x) => {
              x.bullet = v
            })
          }
          options={[
            { value: 'dot', label: '•' },
            { value: 'dash', label: '–' },
            { value: 'square', label: '▪' },
            { value: 'none', label: '无' },
          ]}
        />
      </Row>
      <Row label='技能'>
        <Segmented
          value={t.skills}
          onChange={(v) =>
            set((x) => {
              x.skills = v
            })
          }
          options={[
            { value: 'rows', label: '对齐列' },
            { value: 'inline', label: '行内' },
            { value: 'tags', label: '标签' },
          ]}
        />
      </Row>
    </div>
  )
}

export function TypePanel({ doc, a }: P) {
  const t = doc.theme
  const set = (fn: (t: Theme) => void, key?: string) => a.theme(fn, key)
  const fontPicker = (which: 'body' | 'heading') => (
    <div className='e-fonts'>
      {FONT_IDS.map((f) => (
        <button
          key={f}
          type='button'
          className={t.font[which] === f ? 'is-on' : ''}
          style={{ fontFamily: FONT_STACKS[f] } as CSSProperties}
          onClick={() =>
            set((x) => {
              x.font[which] = f
            })
          }
        >
          <span>Aa 简</span>
          <small>{FONT_LABELS[f]}</small>
        </button>
      ))}
    </div>
  )
  return (
    <div className='e-panel'>
      <Row label='正文字体'>{fontPicker('body')}</Row>
      <Row label='标题字体'>{fontPicker('heading')}</Row>
      <Slider
        label='正文字号'
        value={t.font.size}
        min={LIMITS.size[0]}
        max={LIMITS.size[1]}
        step={0.25}
        format={(v) => `${v} pt`}
        onChange={(v) =>
          set((x) => {
            x.font.size = v
          }, 'font.size')
        }
      />
      <Slider
        label='行高'
        value={t.font.leading}
        min={LIMITS.leading[0]}
        max={LIMITS.leading[1]}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) =>
          set((x) => {
            x.font.leading = v
          }, 'font.leading')
        }
      />
      <Slider
        label='姓名大小'
        value={t.font.name}
        min={LIMITS.name[0]}
        max={LIMITS.name[1]}
        step={0.1}
        format={(v) => `${v.toFixed(1)}×`}
        onChange={(v) =>
          set((x) => {
            x.font.name = v
          }, 'font.name')
        }
      />
      <Slider
        label='标题大小'
        value={t.font.title}
        min={LIMITS.title[0]}
        max={LIMITS.title[1]}
        step={0.05}
        format={(v) => `${v.toFixed(2)}×`}
        onChange={(v) =>
          set((x) => {
            x.font.title = v
          }, 'font.title')
        }
      />
    </div>
  )
}

export function ColorPanel({ doc, a }: P) {
  const t = doc.theme
  const set = (fn: (t: Theme) => void, key?: string) => a.theme(fn, key)
  return (
    <div className='e-panel'>
      <Row label='强调色'>
        <div className='e-swatches'>
          {ACCENTS.map((c) => (
            <button
              key={c}
              type='button'
              style={{ background: c }}
              aria-label={c}
              className={t.color.accent === c ? 'is-on' : ''}
              onClick={() =>
                set((x) => {
                  x.color.accent = c
                })
              }
            >
              {t.color.accent === c && <Check size={13} />}
            </button>
          ))}
          <label className='e-swatch-custom' title='自定义颜色'>
            <input
              type='color'
              value={t.color.accent}
              onChange={(e) => {
                const v = e.currentTarget.value
                set((x) => {
                  x.color.accent = v
                }, 'color.accent')
              }}
            />
          </label>
        </div>
      </Row>
      <Row label='用在'>
        <div className='e-chips'>
          {(
            [
              ['onName', '姓名'],
              ['onHeadings', '区块标题'],
              ['onRules', '线条'],
              ['onLinks', '链接'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type='button'
              className={t.color[key] ? 'is-on' : ''}
              onClick={() =>
                set((x) => {
                  x.color[key] = !x.color[key]
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </Row>
      <div className='e-color-grid'>
        {(
          [
            ['ink', '正文'],
            ['muted', '次要文字'],
            ['rule', '线条'],
            ['aside', '侧栏 / 底色'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className='e-color-input'>
            <input
              type='color'
              value={t.color[key]}
              onChange={(e) => {
                const v = e.currentTarget.value
                set((x) => {
                  x.color[key] = v
                }, `color.${key}`)
              }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className='e-hint'>
        克制一点更专业：整份简历只用一种强调色，正文保持深灰或黑色。
      </p>
    </div>
  )
}

export function SpacePanel({ doc, a }: P) {
  const t = doc.theme
  const set = (fn: (t: Theme) => void, key?: string) => a.theme(fn, key)
  return (
    <div className='e-panel'>
      <Slider
        label='页边距'
        value={t.space.margin}
        min={LIMITS.margin[0]}
        max={LIMITS.margin[1]}
        step={1}
        format={(v) => `${v} mm`}
        onChange={(v) =>
          set((x) => {
            x.space.margin = v
          }, 'space.margin')
        }
      />
      <Slider
        label='区块间距'
        value={t.space.section}
        min={LIMITS.section[0]}
        max={LIMITS.section[1]}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) =>
          set((x) => {
            x.space.section = v
          }, 'space.section')
        }
      />
      <Slider
        label='条目间距'
        value={t.space.entry}
        min={LIMITS.entry[0]}
        max={LIMITS.entry[1]}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) =>
          set((x) => {
            x.space.entry = v
          }, 'space.entry')
        }
      />
      <Row label='纸张'>
        <Segmented
          value={t.page}
          onChange={(v) =>
            set((x) => {
              x.page = v
            })
          }
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'Letter', label: 'Letter（美国）' },
          ]}
        />
      </Row>
      <Row label='日期写法'>
        <Segmented<DateStyle>
          value={t.date.style}
          onChange={(v) =>
            set((x) => {
              x.date.style = v
              if (v === 'month-en' && x.date.present === '至今')
                x.date.present = 'Present'
              if (v !== 'month-en' && x.date.present === 'Present')
                x.date.present = '至今'
            })
          }
          options={[
            { value: 'dot', label: '2023.07' },
            { value: 'slash', label: '2023/07' },
            { value: 'cn', label: '2023年7月' },
            { value: 'month-en', label: 'Jul 2023' },
          ]}
        />
      </Row>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='e-row'>
      {label && <div className='e-row-label'>{label}</div>}
      {children}
    </div>
  )
}
