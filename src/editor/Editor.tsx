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
import { FIT_STEPS, FIT_TARGET, type Measure, measurePaper } from './measure'
import { focusTarget, MarginNotes, NotesList } from './Notes'
import { AddSection, Outline } from './Outline'
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

type PanelId =
  | 'theme'
  | 'layout'
  | 'type'
  | 'color'
  | 'space'
  | 'notes'
  | 'export'
  | 'versions'

export function Editor({ doc, onExit }: { doc: ResumeDoc; onExit(): void }) {
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
  }, [doc, mobile])

  const fitOnePage = () => {
    const paper = paperRef.current?.querySelector<HTMLElement>('.r-paper')
    if (!paper) return
    const before = getState().docs[doc.id].theme
    let changed: string[] = []
    for (let guard = 0; guard < 80; guard++) {
      const theme = getState().docs[doc.id].theme
      const m = measurePaper(paper, theme)
      if (m.fill <= FIT_TARGET) break
      const draft = structuredClone(theme)
      const step = FIT_STEPS.find((s) => s.apply(draft))
      if (!step) break
      if (!changed.includes(step.label)) changed = [...changed, step.label]
      flushSync(() => a.theme((t) => Object.assign(t, draft), 'fit'))
    }
    const after = getState().docs[doc.id].theme
    const ok = measurePaper(paper, after).fill <= FIT_TARGET
    if (changed.length === 0) toast('已经无法再压缩了，试试删减内容')
    else
      toast(
        ok
          ? `已压缩到一页：调整了${changed.join('、')}`
          : `已尽量压缩（${changed.join('、')}），仍超出一页`,
        {
          label: '撤销',
          run: () =>
            a.update((d) => {
              d.theme = before
            }),
        }
      )
  }

  const exportPdf = () => {
    setPanel(null)
    void flushNow()
    flushSync(() => setPrinting(true))
    printResume(doc.theme, safeFilename(doc.name), () => setPrinting(false))
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
      toast('纯文本已复制，可直接粘贴到网申表单')
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
        void flushNow().then(() => toast('已保存到本地'))
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
    Exclude<PanelId, 'export' | 'versions'>,
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
    theme: '主题',
    layout: '版式',
    type: '字体',
    color: '颜色',
    space: '间距与纸张',
    notes: `写作建议 · ${notes.length}`,
    export: '导出',
    versions: '历史版本',
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
            <IconButton label='返回简历库' onClick={onExit}>
              <ArrowLeft size={18} />
            </IconButton>
            {!mobile && <Logo size={22} />}
            <input
              className='e-docname'
              value={doc.name}
              aria-label='简历名称'
              onChange={(e) => a.rename(e.currentTarget.value)}
              onBlur={(e) => {
                if (!e.currentTarget.value.trim()) a.rename('未命名简历')
              }}
            />
            <span className={`e-save is-${save}`}>
              {save === 'pending'
                ? '保存中…'
                : save === 'error'
                  ? '保存失败'
                  : '已保存'}
            </span>
          </div>
          <div className='e-top-right'>
            <IconButton
              label='撤销 (⌘Z)'
              disabled={!hist?.undo}
              onClick={() => undo(doc.id)}
            >
              <Undo2 size={17} />
            </IconButton>
            <IconButton
              label='重做 (⇧⌘Z)'
              disabled={!hist?.redo}
              onClick={() => redo(doc.id)}
            >
              <Redo2 size={17} />
            </IconButton>
            <button
              ref={(el) => {
                anchors.current.versions = el
              }}
              type='button'
              className={`u-icon-btn ${panel === 'versions' ? 'is-on' : ''}`}
              aria-label='历史版本'
              title='历史版本'
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
              title='历史版本'
              className='is-versions'
            >
              {!mobile && <div className='u-pop-title'>历史版本</div>}
              <Versions doc={doc} onDone={() => setPanel(null)} />
            </Popover>
            <IconButton
              label='预览'
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
              <Download size={15} /> {mobile ? '' : '导出'}
            </button>
            <Popover
              anchor={anchors.current.export ?? null}
              open={panel === 'export'}
              onClose={() => setPanel(null)}
              align='end'
              title='导出'
            >
              <div className='u-menu is-wide' role='menu'>
                <MenuItem
                  icon={<Printer size={16} />}
                  hint='⌘P'
                  onClick={exportPdf}
                >
                  <b>PDF</b>
                  <small>
                    在打印对话框中选择「存储为 PDF」，文字可选中、可被 ATS 解析
                  </small>
                </MenuItem>
                <MenuItem icon={<FileJson size={16} />} onClick={exportJson}>
                  <b>iResume 文件（JSON）</b>
                  <small>完整备份内容与主题，可在任何设备导入</small>
                </MenuItem>
                <div className='u-menu-sep' />
                <MenuItem icon={<ClipboardCopy size={16} />} onClick={copyText}>
                  <b>复制纯文本</b>
                  <small>粘贴到网申系统的「简历正文」文本框</small>
                </MenuItem>
                <MenuItem
                  icon={<FileText size={16} />}
                  onClick={exportMarkdown}
                >
                  <b>Markdown</b>
                  <small>保留粗体与链接，适合邮件正文或个人主页</small>
                </MenuItem>
                <MenuItem
                  icon={<Braces size={16} />}
                  onClick={exportJsonResume}
                >
                  <b>JSON Resume</b>
                  <small>通用开放格式，可在其他简历工具中使用</small>
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
            <div className='e-paper' ref={paperRef} style={{ zoom }}>
              {preview ? (
                <Resume doc={doc} />
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
                Array.from({ length: measure.pages - 1 }, (_, i) => (
                  <div
                    key={i}
                    className='e-pagebreak'
                    style={{
                      top: measure.marginPx + measure.pageContent * (i + 1),
                    }}
                  >
                    <span>第 {i + 2} 页</span>
                  </div>
                ))}
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
          <span>预览 · 与导出的 PDF 完全一致</span>
          <button
            type='button'
            className='u-btn is-ghost is-sm'
            onClick={exportPdf}
          >
            <Printer size={14} /> 导出 PDF
          </button>
          <button
            type='button'
            className='u-btn is-primary is-sm'
            onClick={() => setPreview(false)}
          >
            <X size={14} /> 返回编辑 <kbd>Esc</kbd>
          </button>
        </div>
      ) : (
        <div className='e-dock' role='toolbar' aria-label='设计'>
          {dockBtn('theme', <Sparkles size={16} />, '主题')}
          {dockBtn('layout', <Columns3 size={16} />, '版式')}
          {dockBtn('type', <Type size={16} />, '字体')}
          {dockBtn('color', <Palette size={16} />, '颜色')}
          {dockBtn('space', <Ruler size={16} />, '间距')}
          {!mobile && measure && (
            <>
              <span className='e-dock-sep' />
              <span
                className={`e-fit ${measure.pages > 1 ? 'is-over' : ''}`}
                title={`第 ${measure.pages} 页已用 ${Math.round((measure.fill - measure.pages + 1) * 100)}%`}
              >
                {measure.pages > 1
                  ? `${measure.pages} 页 · 多 ${measure.overflowLines} 行`
                  : `1 页 · ${Math.min(100, Math.round(measure.fill * 100))}%`}
              </span>
              {measure.pages > 1 && (
                <button
                  type='button'
                  className='e-dock-fit'
                  onClick={fitOnePage}
                >
                  压缩到一页
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
                notes.length ? `建议 ${notes.length}` : '建议'
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
