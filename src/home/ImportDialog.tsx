import { FileText, LoaderCircle, ShieldCheck, Upload } from 'lucide-react'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { defineMessages, useT } from '../i18n'
import type { Line } from '../import/lines'
import type { ParseResult } from '../import/parse'
import { KIND_META } from '../model/defaults'
import { Resume } from '../render/Resume'
import { Button } from '../ui/controls'
import { Dialog } from '../ui/Dialog'

const M = defineMessages(
  {
    title: '导入简历',
    drop: '把文件拖到这里，或者',
    choose: '选择文件',
    formats:
      '支持 PDF、Word（.docx）、纯文本 / Markdown，以及 iResume 备份（.json）',
    paste: '或者粘贴简历文字',
    pastePh: '把简历全文粘贴到这里……',
    parse: '识别',
    reading: (name: string) => `正在读取「${name}」……`,
    local: '文件只在你的浏览器里解析，不会上传到任何地方。',
    found: (s: number, i: number) => `识别出 ${s} 个区块、${i} 个条目`,
    unsorted: (n: number) =>
      `有 ${n} 行没有认出位置，放在最后的「待整理」区块里，打开后可以逐条移动或删除。`,
    check: '自动识别难免有误，创建后请核对一遍：尤其是日期、职位与公司的位置。',
    items: (n: number) => `${n} 条`,
    back: '重新选择',
    create: '创建简历',
    noText:
      '没有读到文字。如果是扫描件或图片导出的 PDF，请换成 Word 文件，或者直接粘贴文字。',
    oldWord: '暂不支持旧版 .doc 文件，请在 Word 里另存为 .docx 后再导入。',
    failed: (reason: string) => `无法读取这个文件：${reason}`,
    preview: '导入预览',
  },
  {
    title: 'Import a resume',
    drop: 'Drop a file here, or',
    choose: 'choose a file',
    formats:
      'PDF, Word (.docx), plain text / Markdown, and iResume backups (.json)',
    paste: 'Or paste the text of your resume',
    pastePh: 'Paste your resume here…',
    parse: 'Read it',
    reading: (name: string) => `Reading “${name}”…`,
    local: 'Files are parsed in your browser and never uploaded.',
    found: (s: number, i: number) =>
      `Found ${s} ${s === 1 ? 'section' : 'sections'} and ${i} ${i === 1 ? 'entry' : 'entries'}`,
    unsorted: (n: number) =>
      `${n} ${n === 1 ? 'line' : 'lines'} couldn’t be placed and went into a “To sort” section at the end — move or delete them after opening.`,
    check:
      'Automatic parsing isn’t perfect. Please review the result, especially dates, titles and companies.',
    items: (n: number) => `${n}`,
    back: 'Choose another',
    create: 'Create resume',
    noText:
      'No text found. If this PDF is a scan or an image, try a Word file or paste the text instead.',
    oldWord:
      'Legacy .doc files aren’t supported. Save it as .docx in Word and try again.',
    failed: (reason: string) => `Couldn’t read this file: ${reason}`,
    preview: 'Import preview',
  }
)

type State =
  | { step: 'pick'; error?: string }
  | { step: 'reading'; name: string }
  | { step: 'preview'; result: ParseResult }

const isJson = (f: File) =>
  /\.json$/i.test(f.name) || f.type === 'application/json'

/** 读取 PDF / Word / 文本，返回解析结果。解析库按需加载。 */
async function readFile(file: File, t: (typeof M)['zh']) {
  const name = file.name.replace(/\.[^.]+$/, '')
  let lines: Line[]
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const { readPdf } = await import('../import/pdf')
    lines = await readPdf(await file.arrayBuffer())
  } else if (/\.docx$/i.test(file.name)) {
    const { readDocx } = await import('../import/docx')
    lines = await readDocx(await file.arrayBuffer())
  } else if (/\.doc$/i.test(file.name)) {
    throw new Error(t.oldWord)
  } else {
    const { textToLines } = await import('../import/lines')
    lines = textToLines(await file.text())
  }
  return parse(lines, name, t)
}

async function parse(lines: Line[], name: string, t: (typeof M)['zh']) {
  if (
    lines
      .map((l) => l.text)
      .join('')
      .trim().length < 10
  )
    throw new Error(t.noText)
  const { parseResume } = await import('../import/parse')
  return parseResume(lines, { name })
}

export function ImportDialog({
  open,
  onClose,
  onJson,
  onCreate,
}: {
  open: boolean
  onClose(): void
  /** iResume 备份交给原来的导入流程 */
  onJson(files: File[]): void
  onCreate(result: ParseResult): void
}) {
  const t = useT(M)
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ step: 'pick' })
  const [text, setText] = useState('')
  const [over, setOver] = useState(false)

  // 每次打开都从头开始
  useEffect(() => {
    if (!open) return
    setState({ step: 'pick' })
    setText('')
  }, [open])

  const take = async (files: File[]) => {
    if (!files.length) return
    const json = files.filter(isJson)
    if (json.length) onJson(json)
    const file = files.find((f) => !isJson(f))
    if (!file) {
      onClose()
      return
    }
    setState({ step: 'reading', name: file.name })
    try {
      setState({ step: 'preview', result: await readFile(file, t) })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      setState({
        step: 'pick',
        error:
          reason === t.noText || reason === t.oldWord
            ? reason
            : t.failed(reason),
      })
    }
  }

  const readText = async () => {
    const { textToLines } = await import('../import/lines')
    try {
      setState({
        step: 'preview',
        result: await parse(textToLines(text), '', t),
      })
    } catch (error) {
      setState({
        step: 'pick',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void take([...e.dataTransfer.files])
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={t.title}
      title={state.step === 'preview' ? t.preview : t.title}
      className='h-import'
    >
      {state.step === 'pick' && (
        <div className='h-import-body'>
          <div
            className={`h-drop ${over ? 'is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
          >
            <Upload size={22} />
            <p>
              {t.drop}{' '}
              <button
                type='button'
                className='h-link'
                onClick={() => input.current?.click()}
              >
                {t.choose}
              </button>
            </p>
            <small>{t.formats}</small>
          </div>
          <input
            ref={input}
            type='file'
            hidden
            multiple
            accept='.pdf,.docx,.doc,.txt,.md,.markdown,.json,application/pdf,application/json,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            onChange={(e) => {
              void take([...(e.currentTarget.files ?? [])])
              e.currentTarget.value = ''
            }}
          />
          {state.error && (
            <p className='h-import-error' role='alert'>
              {state.error}
            </p>
          )}
          <label className='h-paste'>
            <span>{t.paste}</span>
            <textarea
              value={text}
              placeholder={t.pastePh}
              rows={6}
              onChange={(e) => setText(e.currentTarget.value)}
            />
          </label>
          <div className='h-import-foot'>
            <span className='h-import-note'>
              <ShieldCheck size={14} /> {t.local}
            </span>
            <Button
              variant='primary'
              disabled={text.trim().length < 10}
              onClick={() => void readText()}
            >
              {t.parse}
            </Button>
          </div>
        </div>
      )}

      {state.step === 'reading' && (
        <div className='h-import-body h-import-reading' aria-live='polite'>
          <LoaderCircle size={20} className='u-spin' />
          {t.reading(state.name)}
        </div>
      )}

      {state.step === 'preview' && (
        <Preview
          result={state.result}
          onBack={() => setState({ step: 'pick' })}
          onCreate={() => onCreate(state.result)}
        />
      )}
    </Dialog>
  )
}

function Preview({
  result,
  onBack,
  onCreate,
}: {
  result: ParseResult
  onBack(): void
  onCreate(): void
}) {
  const t = useT(M)
  const { doc, stats } = result
  return (
    <div className='h-import-body'>
      <div className='h-import-preview'>
        <div className='h-import-paper' inert>
          <div className='h-import-zoom'>
            <Resume doc={doc} />
          </div>
        </div>
        <div className='h-import-summary'>
          <p className='h-import-found'>
            <FileText size={16} /> {t.found(stats.sections, stats.items)}
          </p>
          <ul>
            {doc.sections.map((s) => (
              <li key={s.id}>
                <span>{s.title || KIND_META[s.kind][doc.locale]}</span>
                <span>{t.items(s.items.length)}</span>
              </li>
            ))}
          </ul>
          {stats.unsorted > 0 && (
            <p className='h-import-warn'>{t.unsorted(stats.unsorted)}</p>
          )}
          <p className='h-import-note'>{t.check}</p>
        </div>
      </div>
      <div className='h-import-foot'>
        <Button onClick={onBack}>{t.back}</Button>
        <Button variant='primary' onClick={onCreate} autoFocus>
          {t.create}
        </Button>
      </div>
    </div>
  )
}
