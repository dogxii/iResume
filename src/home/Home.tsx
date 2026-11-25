import {
  Copy,
  Download,
  FilePlus2,
  GitBranchPlus,
  Github,
  Languages,
  MoreHorizontal,
  Palette,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { download, safeFilename } from '../editor/print'
import { defineMessages, type Lang, setLang, useLang, useT } from '../i18n'
import { importAny, toBundle } from '../migrate'
import { createDoc } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { Resume } from '../render/Resume'
import {
  addDocs,
  derive,
  duplicate,
  importResult,
  remove,
  saveThemes,
  selectDocList,
  useApp,
} from '../store/store'
import { isPristine } from '../theme/normalize'
import { PRESETS, presetBlurb, presetById, themeName } from '../theme/presets'
import type { Theme } from '../theme/types'
import { Button, Logo, MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import { ago } from '../ui/time'
import { toast } from '../ui/toast'
import { ImportDialog } from './ImportDialog'
import { SyncButton } from './SyncPanel'
import './home.css'

const M = defineMessages(
  {
    importFailed: (file: string, reason?: string) =>
      `「${file}」${reason ?? '无法导入'}`,
    imported: (n: number) => `已导入 ${n} 份简历`,
    importedOne: '已导入，请核对一遍识别结果',
    importedUnsorted: (n: number) => `已导入；有 ${n} 行放在「待整理」里`,
    import: '导入',
    backupAll: '备份全部',
    backupFile: (date: string) => `iresume-备份-${date}.json`,
    switchLang: '切换到英文界面',
    otherLang: 'English',
    heroTitle: '直接在纸上写简历。',
    heroSub: '所见即所得 · 一页适配 · 写作建议 · 数据只存在你的浏览器里',
    incomingLabel: '收到的主题',
    incomingKicker: '有人和你分享了一个主题',
    incomingBody: (preset: string, tweaked: boolean) =>
      `基于「${preset}」${tweaked ? '，调整过字体、颜色或间距' : ''}。保存后可以在任意简历的「主题」面板里使用。`,
    savedTheme: (name: string) => `已保存主题「${name}」`,
    saveTheme: '保存到我的主题',
    useTheme: '用它新建简历',
    dismiss: '忽略',
    sampleName: (theme: string) => `示例 · ${theme}`,
    myResumes: '我的简历',
    docCount: (n: number) => `${n} 份 · 自动保存在本地`,
    blank: '空白简历',
    fromTheme: '从主题开始',
    fromThemeHint: '示例内容本身就是一份「好简历」的写法参考',
    footNote:
      '简历数据保存在本机 IndexedDB，清理浏览器数据前请先「备份全部」。',
    more: '更多',
    duplicated: '已复制',
    duplicate: '复制一份',
    derive: '派生定制版…',
    exportFile: '导出文件',
    deleted: (name: string) => `已删除「${name}」`,
    undo: '撤销',
    delete: '删除',
  },
  {
    importFailed: (file: string, reason?: string) =>
      `“${file}”: ${reason ?? 'Couldn’t import'}`,
    imported: (n: number) => `Imported ${n} ${n === 1 ? 'resume' : 'resumes'}`,
    importedOne: 'Imported — please review the result',
    importedUnsorted: (n: number) =>
      `Imported; ${n} ${n === 1 ? 'line is' : 'lines are'} waiting in “To sort”`,
    import: 'Import',
    backupAll: 'Back up all',
    backupFile: (date: string) => `iresume-backup-${date}.json`,
    switchLang: 'Switch to Chinese',
    otherLang: '中文',
    heroTitle: 'Write your resume right on the page.',
    heroSub:
      'What you see is what you get · Fits on one page · Writing tips · Your data never leaves your browser',
    incomingLabel: 'Shared theme',
    incomingKicker: 'Someone shared a theme with you',
    incomingBody: (preset: string, tweaked: boolean) =>
      `Based on “${preset}”${tweaked ? ', with custom fonts, colors or spacing' : ''}. Once saved, it’s available in the Theme panel of any resume.`,
    savedTheme: (name: string) => `Saved theme “${name}”`,
    saveTheme: 'Save to my themes',
    useTheme: 'New resume with this theme',
    dismiss: 'Dismiss',
    sampleName: (theme: string) => `Sample · ${theme}`,
    myResumes: 'My resumes',
    docCount: (n: number) =>
      `${n} ${n === 1 ? 'resume' : 'resumes'} · Saved automatically on this device`,
    blank: 'Blank resume',
    fromTheme: 'Start from a theme',
    fromThemeHint: 'Each sample doubles as a guide to writing a strong resume',
    footNote:
      'Resumes are stored in this browser’s IndexedDB. Use “Back up all” before clearing browser data.',
    more: 'More',
    duplicated: 'Duplicated',
    duplicate: 'Duplicate',
    derive: 'Create tailored version…',
    exportFile: 'Export file',
    deleted: (name: string) => `Deleted “${name}”`,
    undo: 'Undo',
    delete: 'Delete',
  }
)

export function Home({
  onOpen,
  incoming,
  onDismissIncoming,
}: {
  onOpen(id: string): void
  /** 通过分享链接收到的主题 */
  incoming?: Theme | null
  onDismissIncoming?(): void
}) {
  const docs = useApp(selectDocList)
  const returning =
    docs.length > 1 || docs.some((d) => d.updatedAt !== d.createdAt)
  const [importing, setImporting] = useState(false)
  const lang = useLang()
  const t = useT(M)
  // 缩略图用与「新建」完全一致的示例文档（含英文的日期格式）
  const presets = useMemo(
    () =>
      PRESETS.map((meta) => ({
        meta,
        preview: createDoc({ sample: true, locale: lang, theme: meta.theme }),
      })),
    [lang]
  )
  const incomingPreview = useMemo(
    () =>
      incoming
        ? createDoc({ sample: true, locale: lang, theme: incoming })
        : null,
    [incoming, lang]
  )
  const savedThemes = useApp((s) => s.themes)

  const create = (doc: ResumeDoc) => {
    const [added] = addDocs([doc])
    onOpen(added.id)
  }

  const importFiles = async (files: File[]) => {
    if (!files.length) return
    let count = 0
    for (const f of files) {
      try {
        const result = importAny(JSON.parse(await f.text()))
        const imported = await importResult(result)
        count += imported.length
      } catch (error) {
        toast(
          t.importFailed(
            f.name,
            error instanceof Error ? error.message : undefined
          )
        )
      }
    }
    if (count) toast(t.imported(count))
  }

  return (
    <div className='h-app'>
      <header className='h-top'>
        <div className='h-brand'>
          <Logo size={26} />
          <span>iResume</span>
        </div>
        <nav className='h-top-actions'>
          <SyncButton />
          <Button onClick={() => setImporting(true)}>
            <Upload size={15} /> <span className='h-label'>{t.import}</span>
          </Button>
          {docs.length > 0 && (
            <Button
              onClick={() =>
                download(
                  t.backupFile(new Date().toISOString().slice(0, 10)),
                  JSON.stringify(toBundle(docs), null, 2)
                )
              }
            >
              <Download size={15} />{' '}
              <span className='h-label'>{t.backupAll}</span>
            </Button>
          )}
          <Button
            className='h-lang'
            title={t.switchLang}
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Languages size={15} />
            <span lang={lang === 'zh' ? 'en' : 'zh-CN'}>{t.otherLang}</span>
          </Button>
          <a
            className='u-icon-btn'
            href='https://github.com/dogxii/iresume'
            target='_blank'
            rel='noreferrer'
            aria-label='GitHub'
            title='GitHub'
          >
            <Github size={17} />
          </a>
        </nav>
        <ImportDialog
          open={importing}
          onClose={() => setImporting(false)}
          onJson={(files) => void importFiles(files)}
          onCreate={({ doc, stats }) => {
            setImporting(false)
            create(doc)
            toast(
              stats.unsorted
                ? t.importedUnsorted(stats.unsorted)
                : t.importedOne
            )
          }}
        />
      </header>

      <main className='h-main'>
        {/* 老用户直接看到自己的简历，介绍只给第一次来的人 */}
        {returning ? (
          <div className='h-hero-gap' />
        ) : (
          <section className='h-hero'>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroSub}</p>
          </section>
        )}

        {incoming && incomingPreview && (
          <section className='h-incoming' aria-label={t.incomingLabel}>
            <span className='h-thumb'>
              <span className='h-thumb-zoom' inert>
                <Resume doc={incomingPreview} />
              </span>
            </span>
            <div>
              <span className='h-incoming-kicker'>
                <Palette size={14} /> {t.incomingKicker}
              </span>
              <h2>{themeName(incoming, lang)}</h2>
              <p>
                {t.incomingBody(
                  presetName(incoming.preset, lang),
                  !isPristine(incoming)
                )}
              </p>
              <div className='h-incoming-actions'>
                <Button
                  variant='primary'
                  onClick={() => {
                    saveThemes([...savedThemes, incoming])
                    toast(t.savedTheme(themeName(incoming, lang)))
                    onDismissIncoming?.()
                  }}
                >
                  {t.saveTheme}
                </Button>
                <Button
                  onClick={() => {
                    saveThemes([...savedThemes, incoming])
                    create(
                      createDoc({
                        sample: true,
                        locale: lang,
                        theme: incoming,
                        name: t.sampleName(themeName(incoming, lang)),
                      })
                    )
                  }}
                >
                  {t.useTheme}
                </Button>
                <Button onClick={() => onDismissIncoming?.()}>
                  {t.dismiss}
                </Button>
              </div>
            </div>
          </section>
        )}

        <section className='h-section'>
          <div className='h-section-head'>
            <h2>{t.myResumes}</h2>
            <span>{t.docCount(docs.length)}</span>
          </div>
          <div className='h-grid'>
            <button
              type='button'
              className='h-card is-new'
              onClick={() => create(createDoc({ locale: lang }))}
            >
              <span className='h-thumb is-blank'>
                <FilePlus2 size={26} strokeWidth={1.5} />
                <b>{t.blank}</b>
              </span>
            </button>
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={() => onOpen(doc.id)} />
            ))}
          </div>
        </section>

        <section className='h-section'>
          <div className='h-section-head'>
            <h2>{t.fromTheme}</h2>
            <span>{t.fromThemeHint}</span>
          </div>
          <div className='h-grid is-themes'>
            {presets.map(({ meta, preview }) => {
              const { theme } = meta
              return (
                <button
                  key={theme.preset}
                  type='button'
                  className='h-card'
                  onClick={() =>
                    create(
                      createDoc({
                        sample: true,
                        locale: lang,
                        theme,
                        name: t.sampleName(themeName(theme, lang)),
                      })
                    )
                  }
                >
                  <span className='h-thumb'>
                    <span className='h-thumb-zoom' inert>
                      <Resume doc={preview} />
                    </span>
                  </span>
                  <span className='h-card-meta'>
                    <strong>{themeName(theme, lang)}</strong>
                    <span>{presetBlurb(meta, lang)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </main>
      <footer className='h-foot'>
        <span>iResume 3 · MIT</span>
        <span>{t.footNote}</span>
      </footer>
    </div>
  )
}

/** 分享主题所基于的预设名（界面语言） */
function presetName(id: string, lang: Lang): string {
  const meta = presetById(id)
  return meta ? themeName(meta.theme, lang) : id
}

function DocCard({ doc, onOpen }: { doc: ResumeDoc; onOpen(): void }) {
  const lang = useLang()
  const t = useT(M)
  const more = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div className='h-card'>
      <button
        type='button'
        className='h-thumb'
        onClick={onOpen}
        // 与下方名称按钮重复：鼠标可点，读屏与键盘只用名称按钮
        tabIndex={-1}
        aria-hidden
      >
        <span className='h-thumb-zoom' inert>
          <Resume doc={doc} />
        </span>
      </button>
      <div className='h-card-info'>
        <button type='button' className='h-card-name' onClick={onOpen}>
          <strong>{doc.name}</strong>
          <span>
            {ago(doc.updatedAt)} · {themeName(doc.theme, lang)}
            {doc.tags.length > 0 && ` · ${doc.tags.join(' / ')}`}
            {doc.target && (doc.target.company || doc.target.role) && (
              <em className='h-target'>
                <Target size={11} /> {doc.target.company || doc.target.role}
              </em>
            )}
          </span>
        </button>
        <button
          ref={more}
          type='button'
          className='u-icon-btn is-sm'
          aria-label={t.more}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={16} />
        </button>
        <Popover
          anchor={more.current}
          open={open}
          onClose={() => setOpen(false)}
          align='end'
          title={doc.name}
        >
          <div className='u-menu' role='menu'>
            <MenuItem
              icon={<Copy size={15} />}
              onClick={() => {
                setOpen(false)
                duplicate(doc.id)
                toast(t.duplicated)
              }}
            >
              {t.duplicate}
            </MenuItem>
            <MenuItem
              icon={<GitBranchPlus size={15} />}
              onClick={() => {
                setOpen(false)
                const copy = derive(doc.id)
                if (copy) window.location.hash = `/edit/${copy.id}#match`
              }}
            >
              {t.derive}
            </MenuItem>
            <MenuItem
              icon={<Download size={15} />}
              onClick={() => {
                setOpen(false)
                download(
                  `${safeFilename(doc.name)}.iresume.json`,
                  JSON.stringify(toBundle([doc]), null, 2)
                )
              }}
            >
              {t.exportFile}
            </MenuItem>
            <div className='u-menu-sep' />
            <MenuItem
              icon={<Trash2 size={15} />}
              danger
              onClick={() => {
                setOpen(false)
                const backup = structuredClone(doc)
                void remove(doc.id)
                toast(
                  t.deleted(doc.name),
                  { label: t.undo, run: () => addDocs([backup]) },
                  6000
                )
              }}
            >
              {t.delete}
            </MenuItem>
          </div>
        </Popover>
      </div>
    </div>
  )
}
