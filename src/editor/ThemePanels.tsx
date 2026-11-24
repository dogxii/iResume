import {
  Check,
  Download,
  Link2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { type CSSProperties, useRef } from 'react'
import { defineMessages, useLang, useT } from '../i18n'
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
import {
  ACCENTS,
  PRESETS,
  presetBlurb,
  presetById,
  themeName,
} from '../theme/presets'
import { themeLink } from '../theme/share'
import type { Theme } from '../theme/types'
import { Button, Segmented, Slider, Toggle } from '../ui/controls'
import { toast } from '../ui/toast'
import type { Actions } from './actions'
import { download, safeFilename } from './print'

const M = defineMessages(
  {
    ats: '单栏、标准标题，适合 ATS 自动解析',
    deleteTheme: '删除这个主题',
    current: (name: string) => `当前：${name}`,
    customized: ' · 已自定义',
    reset: '恢复',
    namePrompt: '给这个主题起个名字',
    copyName: (name: string) => `${name} 改`,
    myTheme: '我的主题',
    saved: (name: string) => `已保存主题「${name}」`,
    saveAs: '另存为',
    copyLink: '复制主题分享链接',
    linkCopied: '已复制主题链接：对方打开即可保存这个主题（不含简历内容）',
    noClipboard: '无法访问剪贴板',
    exportTip: '导出主题文件，可分享给他人',
    exportLabel: '导出主题文件',
    importLabel: '导入主题文件',
    imported: (name: string) => `已导入主题「${name}」`,
    importFailed: '无法读取这个主题文件',

    layout: '版式',
    layoutSingle: '单栏',
    layoutSideHeadings: '侧标题',
    layoutAsideLeft: '左侧栏',
    layoutAsideRight: '右侧栏',
    aside: '侧栏',
    header: '页眉',
    alignLeft: '左对齐',
    alignCenter: '居中',
    alignSplit: '两端',
    contacts: '联系方式',
    contactsInline: '一行',
    contactsStacked: '竖排',
    photo: '照片',
    photoNone: '不显示',
    photoRounded: '圆角',
    photoCircle: '圆形',
    heading: '区块标题',
    headingRule: '细线',
    headingUnderline: '短线',
    headingBar: '色条',
    headingBand: '底色',
    none: '无',
    caps: '标题大写 + 字距（英文简历常用）',
    datePos: '日期位置',
    dateRight: '右侧',
    dateBelow: '标题下',
    dateGutter: '左列',
    timeline: '时间轴',
    sub: '职位 / 专业',
    subInline: '同一行',
    subBelow: '另起一行',
    bullet: '要点符号',
    skills: '技能',
    skillsRows: '对齐列',
    skillsInline: '行内',
    skillsTags: '标签',

    bodyFont: '正文字体',
    headingFont: '标题字体',
    bodySize: '正文字号',
    leading: '行高',
    nameSize: '姓名大小',
    titleSize: '标题大小',

    accent: '强调色',
    customColor: '自定义颜色',
    useOn: '用在',
    onName: '姓名',
    onHeadings: '区块标题',
    onRules: '线条',
    onLinks: '链接',
    ink: '正文',
    muted: '次要文字',
    rule: '线条',
    asideColor: '侧栏 / 底色',
    colorHint: '克制一点更专业：整份简历只用一种强调色，正文保持深灰或黑色。',

    margin: '页边距',
    sectionSpace: '区块间距',
    entrySpace: '条目间距',
    page: '纸张',
    letter: 'Letter（美国）',
    dateStyle: '日期写法',
  },
  {
    ats: 'Single column with standard headings. Parses cleanly in ATS.',
    deleteTheme: 'Delete this theme',
    current: (name: string) => `Current: ${name}`,
    customized: ' · Customized',
    reset: 'Reset',
    namePrompt: 'Name this theme',
    copyName: (name: string) => `${name} (edited)`,
    myTheme: 'My theme',
    saved: (name: string) => `Saved theme “${name}”`,
    saveAs: 'Save as…',
    copyLink: 'Copy theme share link',
    linkCopied:
      'Theme link copied. Anyone who opens it can save this theme — your resume content isn’t included.',
    noClipboard: 'Couldn’t access the clipboard',
    exportTip: 'Export a theme file to share with others',
    exportLabel: 'Export theme file',
    importLabel: 'Import theme file',
    imported: (name: string) => `Imported theme “${name}”`,
    importFailed: 'Couldn’t read this theme file',

    layout: 'Layout',
    layoutSingle: 'Single',
    layoutSideHeadings: 'Side headings',
    layoutAsideLeft: 'Left sidebar',
    layoutAsideRight: 'Right sidebar',
    aside: 'Sidebar',
    header: 'Header',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignSplit: 'Split',
    contacts: 'Contacts',
    contactsInline: 'Inline',
    contactsStacked: 'Stacked',
    photo: 'Photo',
    photoNone: 'Hidden',
    photoRounded: 'Rounded',
    photoCircle: 'Circle',
    heading: 'Headings',
    headingRule: 'Rule',
    headingUnderline: 'Underline',
    headingBar: 'Bar',
    headingBand: 'Band',
    none: 'None',
    caps: 'All-caps headings with letter spacing (common in English resumes)',
    datePos: 'Dates',
    dateRight: 'Right',
    dateBelow: 'Below title',
    dateGutter: 'Left column',
    timeline: 'Timeline',
    sub: 'Role / degree',
    subInline: 'Same line',
    subBelow: 'New line',
    bullet: 'Bullets',
    skills: 'Skills',
    skillsRows: 'Columns',
    skillsInline: 'Inline',
    skillsTags: 'Tags',

    bodyFont: 'Body font',
    headingFont: 'Heading font',
    bodySize: 'Body size',
    leading: 'Line height',
    nameSize: 'Name size',
    titleSize: 'Heading size',

    accent: 'Accent',
    customColor: 'Custom color',
    useOn: 'Apply to',
    onName: 'Name',
    onHeadings: 'Headings',
    onRules: 'Rules',
    onLinks: 'Links',
    ink: 'Body text',
    muted: 'Secondary text',
    rule: 'Rules',
    asideColor: 'Sidebar / fill',
    colorHint:
      'Restraint looks more professional: use a single accent color and keep body text dark gray or black.',

    margin: 'Margins',
    sectionSpace: 'Section spacing',
    entrySpace: 'Entry spacing',
    page: 'Paper',
    letter: 'Letter (US)',
    dateStyle: 'Date format',
  }
)

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
    <div className='e-thumb' aria-hidden inert>
      <div className='e-thumb-zoom'>
        <Resume doc={{ ...doc, theme }} />
      </div>
    </div>
  )
}

export function ThemeGallery({ doc, a }: P) {
  const t = useT(M)
  const lang = useLang()
  const saved = useApp((s) => s.themes)
  const file = useRef<HTMLInputElement>(null)
  const pristine = isPristine(doc.theme)
  const current = doc.theme.preset
  const currentPreset = presetById(current)
  return (
    <div className='e-panel is-gallery'>
      <div className='e-gallery'>
        {PRESETS.map((meta) => {
          const { theme, ats } = meta
          const on = current === theme.preset && pristine
          return (
            <button
              key={theme.preset}
              type='button'
              className={`e-gallery-item ${on ? 'is-on' : ''}`}
              onClick={() => a.setTheme(adopt(theme, doc.theme))}
              title={presetBlurb(meta, lang)}
            >
              <Thumb doc={doc} theme={adopt(theme, doc.theme)} />
              <span className='e-gallery-name'>
                {themeName(theme, lang)}
                {ats && <em title={t.ats}>ATS</em>}
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
              <span className='e-gallery-name'>{themeName(theme, lang)}</span>
            </button>
            <button
              type='button'
              className='e-gallery-del'
              title={t.deleteTheme}
              onClick={() => saveThemes(saved.filter((_, i) => i !== index))}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className='e-panel-foot'>
        <span className='e-muted'>
          {t.current(
            currentPreset ? themeName(currentPreset.theme, lang) : current
          )}
          {pristine ? '' : t.customized}
        </span>
        <span className='e-spacer' />
        {!pristine && (
          <Button
            size='sm'
            onClick={() => {
              if (currentPreset)
                a.setTheme(adopt(currentPreset.theme, doc.theme))
            }}
          >
            <RotateCcw size={14} /> {t.reset}
          </Button>
        )}
        <Button
          size='sm'
          onClick={() => {
            const name = window.prompt(
              t.namePrompt,
              pristine ? t.copyName(themeName(doc.theme, lang)) : t.myTheme
            )
            if (!name) return
            saveThemes([...saved, { ...structuredClone(doc.theme), name }])
            toast(t.saved(name))
          }}
        >
          <Save size={14} /> {t.saveAs}
        </Button>
        <Button
          size='sm'
          title={t.copyLink}
          aria-label={t.copyLink}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(themeLink(doc.theme))
              toast(t.linkCopied)
            } catch {
              toast(t.noClipboard)
            }
          }}
        >
          <Link2 size={14} />
        </Button>
        <Button
          size='sm'
          title={t.exportTip}
          aria-label={t.exportLabel}
          onClick={() =>
            download(
              `${safeFilename(themeName(doc.theme, lang))}.iresume-theme.json`,
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
          title={t.importLabel}
          aria-label={t.importLabel}
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
              toast(t.imported(theme.name))
            } catch {
              toast(t.importFailed)
            }
          }}
        />
      </div>
    </div>
  )
}

export function LayoutPanel({ doc, a }: P) {
  const m = useT(M)
  const t = doc.theme
  const set = (fn: (t: Theme) => void) => a.theme(fn)
  return (
    <div className='e-panel'>
      <Row label={m.layout}>
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
            { value: 'single', label: m.layoutSingle },
            { value: 'side-headings', label: m.layoutSideHeadings },
            { value: 'aside-left', label: m.layoutAsideLeft },
            { value: 'aside-right', label: m.layoutAsideRight },
          ]}
        />
      </Row>
      {t.layout.startsWith('aside') && (
        <Row label={m.aside}>
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
      <Row label={m.header}>
        <Segmented
          value={t.header.align}
          onChange={(v) =>
            set((x) => {
              x.header.align = v
            })
          }
          options={[
            { value: 'left', label: m.alignLeft },
            { value: 'center', label: m.alignCenter },
            { value: 'split', label: m.alignSplit },
          ]}
        />
      </Row>
      <Row label={m.contacts}>
        <Segmented
          value={t.header.contacts}
          onChange={(v) =>
            set((x) => {
              x.header.contacts = v
            })
          }
          options={[
            { value: 'inline', label: m.contactsInline },
            { value: 'stacked', label: m.contactsStacked },
          ]}
        />
      </Row>
      <Row label={m.photo}>
        <Segmented
          value={t.header.photo}
          onChange={(v) =>
            set((x) => {
              x.header.photo = v
            })
          }
          options={[
            { value: 'none', label: m.photoNone },
            { value: 'rounded', label: m.photoRounded },
            { value: 'circle', label: m.photoCircle },
          ]}
        />
      </Row>
      <Row label={m.heading}>
        <Segmented
          value={t.heading.style}
          onChange={(v) =>
            set((x) => {
              x.heading.style = v
            })
          }
          options={[
            { value: 'rule', label: m.headingRule },
            { value: 'underline', label: m.headingUnderline },
            { value: 'bar', label: m.headingBar },
            { value: 'band', label: m.headingBand },
            { value: 'plain', label: m.none },
          ]}
        />
      </Row>
      <Row label=''>
        <Toggle
          label={m.caps}
          checked={t.heading.caps}
          onChange={(v) =>
            set((x) => {
              x.heading.caps = v
            })
          }
        />
      </Row>
      <Row label={m.datePos}>
        <Segmented
          value={t.entry.date}
          onChange={(v) =>
            set((x) => {
              x.entry.date = v
            })
          }
          options={[
            { value: 'right', label: m.dateRight },
            { value: 'below', label: m.dateBelow },
            { value: 'gutter', label: m.dateGutter },
          ]}
        />
      </Row>
      {t.entry.date === 'gutter' && (
        <Row label=''>
          <Toggle
            label={m.timeline}
            checked={t.entry.timeline}
            onChange={(v) =>
              set((x) => {
                x.entry.timeline = v
              })
            }
          />
        </Row>
      )}
      <Row label={m.sub}>
        <Segmented
          value={t.entry.sub}
          onChange={(v) =>
            set((x) => {
              x.entry.sub = v
            })
          }
          options={[
            { value: 'inline', label: m.subInline },
            { value: 'below', label: m.subBelow },
          ]}
        />
      </Row>
      <Row label={m.bullet}>
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
            { value: 'none', label: m.none },
          ]}
        />
      </Row>
      <Row label={m.skills}>
        <Segmented
          value={t.skills}
          onChange={(v) =>
            set((x) => {
              x.skills = v
            })
          }
          options={[
            { value: 'rows', label: m.skillsRows },
            { value: 'inline', label: m.skillsInline },
            { value: 'tags', label: m.skillsTags },
          ]}
        />
      </Row>
    </div>
  )
}

export function TypePanel({ doc, a }: P) {
  const m = useT(M)
  const lang = useLang()
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
          <span>{doc.locale === 'en' ? 'Aa' : 'Aa 简'}</span>
          <small>{FONT_LABELS[f][lang]}</small>
        </button>
      ))}
    </div>
  )
  return (
    <div className='e-panel'>
      <Row label={m.bodyFont}>{fontPicker('body')}</Row>
      <Row label={m.headingFont}>{fontPicker('heading')}</Row>
      <Slider
        label={m.bodySize}
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
        label={m.leading}
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
        label={m.nameSize}
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
        label={m.titleSize}
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
  const m = useT(M)
  const t = doc.theme
  const set = (fn: (t: Theme) => void, key?: string) => a.theme(fn, key)
  return (
    <div className='e-panel'>
      <Row label={m.accent}>
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
          <label className='e-swatch-custom' title={m.customColor}>
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
      <Row label={m.useOn}>
        <div className='e-chips'>
          {(
            [
              ['onName', m.onName],
              ['onHeadings', m.onHeadings],
              ['onRules', m.onRules],
              ['onLinks', m.onLinks],
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
            ['ink', m.ink],
            ['muted', m.muted],
            ['rule', m.rule],
            ['aside', m.asideColor],
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
      <p className='e-hint'>{m.colorHint}</p>
    </div>
  )
}

export function SpacePanel({ doc, a }: P) {
  const m = useT(M)
  const t = doc.theme
  const set = (fn: (t: Theme) => void, key?: string) => a.theme(fn, key)
  return (
    <div className='e-panel'>
      <Slider
        label={m.margin}
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
        label={m.sectionSpace}
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
        label={m.entrySpace}
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
      <Row label={m.page}>
        <Segmented
          value={t.page}
          onChange={(v) =>
            set((x) => {
              x.page = v
            })
          }
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'Letter', label: m.letter },
          ]}
        />
      </Row>
      <Row label={m.dateStyle}>
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
