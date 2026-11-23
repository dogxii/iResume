import {
  Copy,
  Download,
  FilePlus2,
  Github,
  MoreHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { download, safeFilename } from '../editor/print'
import { importAny, toBundle } from '../migrate'
import { createDoc } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { Resume } from '../render/Resume'
import {
  addDocs,
  duplicate,
  remove,
  selectDocList,
  useApp,
} from '../store/store'
import { PRESETS } from '../theme/presets'
import { Button, Logo, MenuItem } from '../ui/controls'
import { Popover } from '../ui/Popover'
import { toast } from '../ui/toast'
import './home.css'

const fmt = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
function ago(iso: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, s] of units)
    if (Math.abs(diff) >= s) return fmt.format(Math.round(diff / s), unit)
  return '刚刚'
}

export function Home({ onOpen }: { onOpen(id: string): void }) {
  const docs = useApp(selectDocList)
  const file = useRef<HTMLInputElement>(null)
  const sample = useRef(createDoc({ sample: true }))

  const create = (doc: ResumeDoc) => {
    const [added] = addDocs([doc])
    onOpen(added.id)
  }

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    let count = 0
    for (const f of files) {
      try {
        const { docs: imported } = importAny(JSON.parse(await f.text()))
        addDocs(imported)
        count += imported.length
      } catch (error) {
        toast(
          `「${f.name}」${error instanceof Error ? error.message : '无法导入'}`
        )
      }
    }
    if (count) toast(`已导入 ${count} 份简历`)
  }

  return (
    <div className='h-app'>
      <header className='h-top'>
        <div className='h-brand'>
          <Logo size={26} />
          <span>iResume</span>
        </div>
        <nav className='h-top-actions'>
          <Button onClick={() => file.current?.click()}>
            <Upload size={15} /> 导入
          </Button>
          {docs.length > 0 && (
            <Button
              onClick={() =>
                download(
                  `iresume-备份-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(toBundle(docs), null, 2)
                )
              }
            >
              <Download size={15} /> 备份全部
            </Button>
          )}
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
        <input
          ref={file}
          type='file'
          accept='.json,application/json'
          multiple
          hidden
          onChange={(e) => {
            void importFiles(e.currentTarget.files)
            e.currentTarget.value = ''
          }}
        />
      </header>

      <main className='h-main'>
        <section className='h-hero'>
          <h1>直接在纸上写简历。</h1>
          <p>所见即所得 · 一页适配 · 写作建议 · 数据只存在你的浏览器里</p>
        </section>

        <section className='h-section'>
          <div className='h-section-head'>
            <h2>我的简历</h2>
            <span>{docs.length} 份 · 自动保存在本地</span>
          </div>
          <div className='h-grid'>
            <button
              type='button'
              className='h-card is-new'
              onClick={() => create(createDoc())}
            >
              <span className='h-thumb is-blank'>
                <FilePlus2 size={26} strokeWidth={1.5} />
                <b>空白简历</b>
              </span>
            </button>
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={() => onOpen(doc.id)} />
            ))}
          </div>
        </section>

        <section className='h-section'>
          <div className='h-section-head'>
            <h2>从主题开始</h2>
            <span>示例内容本身就是一份「好简历」的写法参考</span>
          </div>
          <div className='h-grid is-themes'>
            {PRESETS.map(({ theme, blurb }) => (
              <button
                key={theme.preset}
                type='button'
                className='h-card'
                onClick={() =>
                  create(
                    createDoc({
                      sample: true,
                      theme,
                      name: `示例 · ${theme.name}`,
                    })
                  )
                }
              >
                <span className='h-thumb'>
                  <span className='h-thumb-zoom'>
                    <Resume doc={{ ...sample.current, theme }} />
                  </span>
                </span>
                <span className='h-card-meta'>
                  <strong>{theme.name}</strong>
                  <span>{blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className='h-foot'>
        <span>iResume 3 · MIT</span>
        <span>
          简历数据保存在本机 IndexedDB，清理浏览器数据前请先「备份全部」。
        </span>
      </footer>
    </div>
  )
}

function DocCard({ doc, onOpen }: { doc: ResumeDoc; onOpen(): void }) {
  const more = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div className='h-card'>
      <button
        type='button'
        className='h-thumb'
        onClick={onOpen}
        aria-label={`打开 ${doc.name}`}
      >
        <span className='h-thumb-zoom'>
          <Resume doc={doc} />
        </span>
      </button>
      <div className='h-card-info'>
        <button type='button' className='h-card-name' onClick={onOpen}>
          <strong>{doc.name}</strong>
          <span>
            {ago(doc.updatedAt)} · {doc.theme.name}
            {doc.tags.length > 0 && ` · ${doc.tags.join(' / ')}`}
          </span>
        </button>
        <button
          ref={more}
          type='button'
          className='u-icon-btn is-sm'
          aria-label='更多'
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
                toast('已复制')
              }}
            >
              复制一份
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
              导出文件
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
                  `已删除「${doc.name}」`,
                  { label: '撤销', run: () => addDocs([backup]) },
                  6000
                )
              }}
            >
              删除
            </MenuItem>
          </div>
        </Popover>
      </div>
    </div>
  )
}
