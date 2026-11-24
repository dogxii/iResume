import {
  ArrowLeft,
  Braces,
  ClipboardCopy,
  Columns3,
  Download,
  Eye,
  FileJson,
  FileText,
  History,
  Lightbulb,
  Palette,
  Printer,
  Redo2,
  Ruler,
  Sparkles,
  Target,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { toJsonResume } from '../export/jsonresume'
import { toMarkdown, toPlainText } from '../export/markdown'
import { defineMessages, useLang, useT } from '../i18n'
import { lint } from '../lint'
import { toBundle } from '../migrate'
import type { ResumeDoc } from '../model/types'
import { type EditApi, EditContext } from '../render/Field'
import { Resume } from '../render/Resume'
import { flushNow, getState, redo, undo, useApp } from '../store/store'
import { pagePx } from '../theme/css'
import { IconButton, Logo, MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import { toast } from '../ui/toast'
import { useMedia } from '../ui/useMedia'
import { actions } from './actions'
import { MatchPanel } from './Match'
import { FIT_STEPS, FIT_TARGET, type Measure, measurePaper } from './measure'
import { focusTarget, MarginNotes, NotesList } from './Notes'
import { AddSection, Outline } from './Outline'
import { Pages } from './Pages'
import { paperTools } from './PaperTools'
import { download, printResume, safeFilename } from './print'
import {
  ColorPanel,
  LayoutPanel,
  SpacePanel,
  ThemeGallery,
  TypePanel,
} from './ThemePanels'
import { Versions } from './Versions'
import './editor.css'

const M = defineMessages(
  {
    cantFit: '已经无法再压缩了，试试删减内容',
    fitted: (steps: string[]) => `已压缩到一页：调整了${steps.join('、')}`,
    fitPartial: (steps: string[]) =>
      `已尽量压缩（${steps.join('、')}），仍超出一页`,
    undoAction: '撤销',
    copied: '纯文本已复制，可直接粘贴到网申表单',
    savedLocal: '已保存到本地',
    theme: '主题',
    layout: '版式',
    type: '字体',
    color: '颜色',
    space: '间距与纸张',
    spaceShort: '间距',
    notesTitle: (n: number) => `写作建议 · ${n}`,
    export: '导出',
    versions: '历史版本',
    match: '岗位匹配',
    back: '返回简历库',
    docName: '简历名称',
    untitled: '未命名简历',
    saving: '保存中…',
    saveFailed: '保存失败',
    saved: '已保存',
    undo: '撤销 (⌘Z)',
    redo: '重做 (⇧⌘Z)',
    preview: '预览',
    pdfHint: '在打印对话框中选择「存储为 PDF」，文字可选中、可被 ATS 解析',
    jsonTitle: 'iResume 文件（JSON）',
    jsonHint: '完整备份内容与主题，可在任何设备导入',
    copyTitle: '复制纯文本',
    copyHint: '粘贴到网申系统的「简历正文」文本框',
    mdHint: '保留粗体与链接，适合邮件正文或个人主页',
    jsonResumeHint: '通用开放格式，可在其他简历工具中使用',
    pageN: (n: number) => `第 ${n} 页`,
    previewBar: '预览 · 与导出的 PDF 完全一致',
    exportPdf: '导出 PDF',
    backToEdit: '返回编辑',
    design: '设计',
    pageFill: (page: number, pct: number) => `第 ${page} 页已用 ${pct}%`,
    overflow: (pages: number, lines: number) => `${pages} 页 · 多 ${lines} 行`,
    onePage: (pct: number) => `1 页 · ${pct}%`,
    fit: '压缩到一页',
    notes: '建议',
    notesN: (n: number) => `建议 ${n}`,
  },
  {
    cantFit: 'Can’t compress any further — try trimming some content',
    fitted: (steps: string[]) =>
      `Fits on one page — adjusted ${new Intl.ListFormat('en').format(steps)}`,
    fitPartial: (steps: string[]) =>
      `Compressed as far as possible (${steps.join(', ')}), still over one page`,
    undoAction: 'Undo',
    copied: 'Plain text copied — ready to paste into application forms',
    savedLocal: 'Saved locally',
    theme: 'Theme',
    layout: 'Layout',
    type: 'Type',
    color: 'Color',
    space: 'Spacing & paper',
    spaceShort: 'Spacing',
    notesTitle: (n: number) => `Writing tips · ${n}`,
    export: 'Export',
    versions: 'Version history',
    match: 'Job match',
    back: 'Back to resumes',
    docName: 'Resume name',
    untitled: 'Untitled resume',
    saving: 'Saving…',
    saveFailed: 'Save failed',
    saved: 'Saved',
    undo: 'Undo (⌘Z)',
    redo: 'Redo (⇧⌘Z)',
    preview: 'Preview',
    pdfHint:
      'Choose “Save as PDF” in the print dialog — text stays selectable and ATS-readable',
    jsonTitle: 'iResume file (JSON)',
    jsonHint: 'Full backup of content and theme, importable on any device',
    copyTitle: 'Copy plain text',
    copyHint: 'Paste into the resume text box of online applications',
    mdHint: 'Keeps bold and links — good for emails or a personal site',
    jsonResumeHint: 'Open standard format, usable in other resume tools',
    pageN: (n: number) => `Page ${n}`,
    previewBar: 'Preview · identical to the exported PDF',
    exportPdf: 'Export PDF',
    backToEdit: 'Back to editing',
    design: 'Design',
    pageFill: (page: number, pct: number) => `Page ${page} is ${pct}% full`,
    overflow: (pages: number, lines: number) =>
      `${pages} pages · ${lines} ${lines === 1 ? 'line' : 'lines'} over`,
    onePage: (pct: number) => `1 page · ${pct}%`,
    fit: 'Fit to one page',
    notes: 'Tips',
    notesN: (n: number) => `Tips ${n}`,
  }
)

type PanelId =
  | 'theme'
  | 'layout'
  | 'type'
  | 'color'
  | 'space'
  | 'notes'
  | 'export'
  | 'versions'
  | 'match'

export function Editor({ doc, onExit }: { doc: ResumeDoc; onExit(): void }) {
  const t = useT(M)
  const lang = useLang()
  const a = useMemo(() => actions(doc.id), [doc.id])
  const save = useApp((s) => s.save)
  const hist = useApp((s) => s.history[doc.id])
  const wide = useMedia('(min-width: 1180px)')
  const mobile = useMedia('(max-width: 700px)')
  const [preview, setPreview] = useState(false)
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [active, setActive] = useState<{
    sectionId?: string
    itemId?: string
  } | null>(null)
  const [measure, setMeasure] = useState<Measure | null>(null)
  const [deskW, setDeskW] = useState(1000)
  const [printing, setPrinting] = useState(false)
  const paperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const deskRef = useRef<HTMLDivElement>(null)
  const anchors = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({})

  const notes = useMemo(() => lint(doc), [doc])
  // 离开编辑器时立即写入，不等防抖
  useEffect(() => () => void flushNow(), [])
  useEffect(() => {
    if (!window.location.hash.endsWith('#match')) return
    window.history.replaceState(
      null,
      '',
      window.location.hash.replace(/#match$/, '')
    )
    setPanel('match')
  }, [])
  const showMarginNotes = wide && !mobile && !preview && notes.length > 0

  const editApi = useMemo<EditApi>(
    () => ({ update: a.update, focus: (t) => setActive(t) }),
    [a]
  )
  const tools = useMemo(() => paperTools(doc, a), [doc, a])

  // —— 缩放：纸面适应可用宽度 ——
  useLayoutEffect(() => {
    const el = deskRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setDeskW(el.clientWidth))
    ro.observe(el)
    setDeskW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const [pageW] = pagePx(doc.theme.page)
  const notesW = showMarginNotes ? 260 : 0
  const zoom = mobile
    ? 1
    : Math.max(0.5, Math.min(1.1, (deskW - notesW - (wide ? 96 : 48)) / pageW))

  // —— 测量页数 ——
  useLayoutEffect(() => {
    const paper = paperRef.current?.querySelector<HTMLElement>('.r-paper')
    if (!paper || mobile) return
    const run = () => setMeasure(measurePaper(paper, doc.theme))
    run()
    const ro = new ResizeObserver(run)
    ro.observe(paper)
    void document.fonts?.ready.then(run)
    return () => ro.disconnect()
  }, [doc, mobile, preview])

  const fitOnePage = () => {
    const paper = paperRef.current?.querySelector<HTMLElement>('.r-paper')
    if (!paper) return
    const before = getState().docs[doc.id].theme
    let changed: (typeof FIT_STEPS)[number][] = []
    for (let guard = 0; guard < 80; guard++) {
      const theme = getState().docs[doc.id].theme
      const m = measurePaper(paper, theme)
      if (m.fill <= FIT_TARGET) break
      const draft = structuredClone(theme)
      const step = FIT_STEPS.find((s) => s.apply(draft))
      if (!step) break
      if (!changed.includes(step)) changed = [...changed, step]
      flushSync(() => a.theme((t) => Object.assign(t, draft), 'fit'))
    }
    const after = getState().docs[doc.id].theme
    const ok = measurePaper(paper, after).fill <= FIT_TARGET
    const labels = changed.map((s) => s.label[lang])
    if (changed.length === 0) toast(t.cantFit)
    else
      toast(ok ? t.fitted(labels) : t.fitPartial(labels), {
        label: t.undoAction,
        run: () =>
          a.update((d) => {
            d.theme = before
          }),
      })
  }

  const exportPdf = () => {
    setPanel(null)
    void flushNow()
    flushSync(() => setPrinting(true))
    printResume(
      doc.theme,
      safeFilename(doc.name),
      () => setPrinting(false),
      measure?.pages
    )
  }
  const exportJson = () => {
    setPanel(null)
    download(
      `${safeFilename(doc.name)}.iresume.json`,
      JSON.stringify(toBundle([doc]), null, 2)
    )
  }
  const exportMarkdown = () => {
    setPanel(null)
    download(`${safeFilename(doc.name)}.md`, toMarkdown(doc), 'text/markdown')
  }
  const exportJsonResume = () => {
    setPanel(null)
    download(
      `${safeFilename(doc.name)}.resume.json`,
      JSON.stringify(toJsonResume(doc), null, 2)
    )
  }
  const copyText = async () => {
    setPanel(null)
    try {
      await navigator.clipboard.writeText(toPlainText(doc))
      toast(t.copied)
    } catch {
      download(`${safeFilename(doc.name)}.txt`, toPlainText(doc), 'text/plain')
    }
  }

  // —— 快捷键 ——
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        ;(e.shiftKey ? redo : undo)(doc.id)
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo(doc.id)
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        exportPdf()
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void flushNow().then(() => toast(t.savedLocal))
      } else if (e.key === 'Escape' && preview) {
        setPreview(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const jump = (target: string) => {
    const paper = paperRef.current
    if (target === 'profile') return focusTarget(paper, 'profile')
    const el = paper?.querySelector<HTMLElement>(
      `[data-section="${CSS.escape(target)}"]`
    )
    if (!el) return
    el.scrollIntoView({ block: 'start', behavior: 'smooth' })
    el.querySelector<HTMLElement>('.r-heading .f')?.focus({
      preventScroll: true,
    })
  }

  const toggle = (id: PanelId) => setPanel((p) => (p === id ? null : id))
  const dockBtn = (id: PanelId, icon: ReactNode, label: string) => (
    <button
      ref={(el) => {
        anchors.current[id] = el
      }}
      type='button'
      className={`e-dock-btn ${panel === id ? 'is-on' : ''}`}
      onClick={() => toggle(id)}
      aria-expanded={panel === id}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
  const panelBody: Record<
    Exclude<PanelId, 'export' | 'versions' | 'match'>,
    ReactNode
  > = {
    theme: <ThemeGallery doc={doc} a={a} />,
    layout: <LayoutPanel doc={doc} a={a} />,
    type: <TypePanel doc={doc} a={a} />,
    color: <ColorPanel doc={doc} a={a} />,
    space: <SpacePanel doc={doc} a={a} />,
    notes: (
      <NotesList
        notes={notes}
        onDismiss={a.dismiss}
        onOpen={(t) => {
          setPanel(null)
          focusTarget(paperRef.current, t)
        }}
      />
    ),
  }
  const panelTitle: Record<PanelId, string> = {
    theme: t.theme,
    layout: t.layout,
    type: t.type,
    color: t.color,
    space: t.space,
    notes: t.notesTitle(notes.length),
    export: t.export,
    versions: t.versions,
    match: t.match,
  }

  const activeSection =
    active?.itemId === 'profile' ? 'profile' : active?.sectionId

  return (
    <div
      className={`e-app ${preview ? 'is-preview' : ''} ${mobile ? 'is-mobile' : ''}`}
    >
      {!preview && (
        <header className='e-top'>
          <div className='e-top-left'>
            <IconButton label={t.back} onClick={onExit}>
              <ArrowLeft size={18} />
            </IconButton>
            {!mobile && <Logo size={22} />}
            <input
              className='e-docname'
              value={doc.name}
              aria-label={t.docName}
              onChange={(e) => a.rename(e.currentTarget.value)}
              onBlur={(e) => {
                if (!e.currentTarget.value.trim()) a.rename(t.untitled)
              }}
            />
            <span className={`e-save is-${save}`}>
              {save === 'pending'
                ? t.saving
                : save === 'error'
                  ? t.saveFailed
                  : t.saved}
            </span>
          </div>
          <div className='e-top-right'>
            <IconButton
              label={t.undo}
              disabled={!hist?.undo}
              onClick={() => undo(doc.id)}
            >
              <Undo2 size={17} />
            </IconButton>
            <IconButton
              label={t.redo}
              disabled={!hist?.redo}
              onClick={() => redo(doc.id)}
            >
              <Redo2 size={17} />
            </IconButton>
            <button
              ref={(el) => {
                anchors.current.match = el
              }}
              type='button'
              className={`u-btn is-ghost is-md e-match-btn ${panel === 'match' ? 'is-on' : ''}`}
              aria-label={t.match}
              aria-expanded={panel === 'match'}
              onClick={() => toggle('match')}
            >
              <Target size={16} />
              {!mobile && (doc.target?.company || doc.target?.role || t.match)}
            </button>
            <Popover
              anchor={anchors.current.match ?? null}
              open={panel === 'match'}
              onClose={() => setPanel(null)}
              align='end'
              title={t.match}
            >
              {!mobile && <div className='u-pop-title'>{t.match}</div>}
              <MatchPanel
                doc={doc}
                a={a}
                onDerived={(id) => {
                  setPanel(null)
                  window.location.hash = `/edit/${id}#match`
                }}
              />
            </Popover>
            <button
              ref={(el) => {
                anchors.current.versions = el
              }}
              type='button'
              className={`u-icon-btn ${panel === 'versions' ? 'is-on' : ''}`}
              aria-label={t.versions}
              title={t.versions}
              aria-expanded={panel === 'versions'}
              onClick={() => toggle('versions')}
            >
              <History size={17} />
            </button>
            <Popover
              anchor={anchors.current.versions ?? null}
              open={panel === 'versions'}
              onClose={() => setPanel(null)}
              align='end'
              title={t.versions}
              className='is-versions'
            >
              {!mobile && <div className='u-pop-title'>{t.versions}</div>}
              <Versions doc={doc} onDone={() => setPanel(null)} />
            </Popover>
            <IconButton
              label={t.preview}
              onClick={() => {
                setPanel(null)
                setPreview(true)
              }}
            >
              <Eye size={17} />
            </IconButton>
            <button
              ref={(el) => {
                anchors.current.export = el
              }}
              type='button'
              className='u-btn is-primary is-md'
              onClick={() => toggle('export')}
            >
              <Download size={15} /> {mobile ? '' : t.export}
            </button>
            <Popover
              anchor={anchors.current.export ?? null}
              open={panel === 'export'}
              onClose={() => setPanel(null)}
              align='end'
              title={t.export}
            >
              <div className='u-menu is-wide' role='menu'>
                <MenuItem
                  icon={<Printer size={16} />}
                  hint='⌘P'
                  onClick={exportPdf}
                >
                  <b>PDF</b>
                  <small>{t.pdfHint}</small>
                </MenuItem>
                <MenuItem icon={<FileJson size={16} />} onClick={exportJson}>
                  <b>{t.jsonTitle}</b>
                  <small>{t.jsonHint}</small>
                </MenuItem>
                <div className='u-menu-sep' />
                <MenuItem icon={<ClipboardCopy size={16} />} onClick={copyText}>
                  <b>{t.copyTitle}</b>
                  <small>{t.copyHint}</small>
                </MenuItem>
                <MenuItem
                  icon={<FileText size={16} />}
                  onClick={exportMarkdown}
                >
                  <b>Markdown</b>
                  <small>{t.mdHint}</small>
                </MenuItem>
                <MenuItem
                  icon={<Braces size={16} />}
                  onClick={exportJsonResume}
                >
                  <b>JSON Resume</b>
                  <small>{t.jsonResumeHint}</small>
                </MenuItem>
              </div>
            </Popover>
          </div>
        </header>
      )}

      <div className='e-body'>
        {wide && !preview && (
          <Outline doc={doc} a={a} active={activeSection} onJump={jump} />
        )}
        <div
          className='e-desk'
          ref={deskRef}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget)
              (document.activeElement as HTMLElement | null)?.blur()
          }}
        >
          <div
            className='e-stage'
            ref={stageRef}
            style={{ paddingRight: notesW }}
          >
            <div
              className={`e-paper ${preview && measure && !mobile ? 'is-paged' : ''}`}
              ref={paperRef}
              style={{ zoom }}
            >
              {preview ? (
                <>
                  <div className={measure && !mobile ? 'e-measure' : ''}>
                    <Resume doc={doc} />
                  </div>
                  {measure && !mobile && <Pages doc={doc} measure={measure} />}
                </>
              ) : (
                <EditContext.Provider value={editApi}>
                  <Resume
                    doc={doc}
                    tools={tools}
                    className={mobile ? 'r-fluid' : ''}
                  />
                </EditContext.Provider>
              )}
              {!mobile &&
                !preview &&
                measure &&
                measure.pages > 1 &&
                measure.frames.slice(1).flatMap((frames, i) =>
                  frames.map((f, j) => (
                    <div
                      key={`${i}-${f.left}`}
                      className='e-pagebreak'
                      style={{ top: f.from, left: f.left, width: f.width }}
                    >
                      {j === frames.length - 1 && <span>{t.pageN(i + 2)}</span>}
                    </div>
                  ))
                )}
            </div>
            {showMarginNotes && (
              <MarginNotes
                notes={notes}
                paper={paperRef.current}
                stage={stageRef.current}
                layoutKey={`${zoom}|${doc.updatedAt}`}
                active={active?.itemId}
                onDismiss={a.dismiss}
                onOpen={(t) => focusTarget(paperRef.current, t)}
              />
            )}
          </div>
          {!preview && !wide && (
            <div className='e-inline-add'>
              <AddSection doc={doc} a={a} />
            </div>
          )}
        </div>
      </div>

      {preview ? (
        <div className='e-preview-bar'>
          <span>{t.previewBar}</span>
          <button
            type='button'
            className='u-btn is-ghost is-sm'
            onClick={exportPdf}
          >
            <Printer size={14} /> {t.exportPdf}
          </button>
          <button
            type='button'
            className='u-btn is-primary is-sm'
            onClick={() => setPreview(false)}
          >
            <X size={14} /> {t.backToEdit} <kbd>Esc</kbd>
          </button>
        </div>
      ) : (
        <div className='e-dock' role='toolbar' aria-label={t.design}>
          {dockBtn('theme', <Sparkles size={16} />, t.theme)}
          {dockBtn('layout', <Columns3 size={16} />, t.layout)}
          {dockBtn('type', <Type size={16} />, t.type)}
          {dockBtn('color', <Palette size={16} />, t.color)}
          {dockBtn('space', <Ruler size={16} />, t.spaceShort)}
          {!mobile && measure && (
            <>
              <span className='e-dock-sep' />
              <span
                className={`e-fit ${measure.pages > 1 ? 'is-over' : ''}`}
                title={t.pageFill(
                  measure.pages,
                  Math.round((measure.fill - measure.pages + 1) * 100)
                )}
              >
                {measure.pages > 1
                  ? t.overflow(measure.pages, measure.overflowLines)
                  : t.onePage(Math.min(100, Math.round(measure.fill * 100)))}
              </span>
              {measure.pages > 1 && (
                <button
                  type='button'
                  className='e-dock-fit'
                  onClick={fitOnePage}
                >
                  {t.fit}
                </button>
              )}
            </>
          )}
          {!showMarginNotes && (
            <>
              <span className='e-dock-sep' />
              {dockBtn(
                'notes',
                <Lightbulb size={16} />,
                notes.length ? t.notesN(notes.length) : t.notes
              )}
            </>
          )}
        </div>
      )}
      {(['theme', 'layout', 'type', 'color', 'space', 'notes'] as const).map(
        (id) => (
          <Popover
            key={id}
            anchor={anchors.current[id] ?? null}
            open={panel === id}
            onClose={() => setPanel(null)}
            placement='top'
            align='center'
            title={panelTitle[id]}
            className={id === 'theme' ? 'is-wide' : ''}
          >
            {!mobile && <div className='u-pop-title'>{panelTitle[id]}</div>}
            {panelBody[id]}
          </Popover>
        )
      )}
      {printing &&
        createPortal(
          <div className='print-root' aria-hidden>
            <Resume doc={doc} />
          </div>,
          document.body
        )}
    </div>
  )
}
