import { Keyboard, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { defineMessages, type Lang, useLang, useT } from '../i18n'
import { Button, IconButton } from '../ui/controls'
import { Dialog } from '../ui/Dialog'

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
/** 修饰键：苹果设备是 ⌘，其他是 Ctrl */
export const MOD = isMac ? '⌘' : 'Ctrl'
const SHIFT = isMac ? '⇧' : 'Shift'

const M = defineMessages(
  {
    tipsLabel: '上手提示',
    next: '下一条',
    done: '开始写吧',
    skip: '不再显示提示',
    step: (i: number, n: number) => `第 ${i} 条，共 ${n} 条`,
    help: '帮助与快捷键（?）',
    shortcuts: '键盘快捷键',
    showTips: '重新显示上手提示',
  },
  {
    tipsLabel: 'Getting started',
    next: 'Next',
    done: 'Start writing',
    skip: 'Don’t show tips again',
    step: (i: number, n: number) => `Tip ${i} of ${n}`,
    help: 'Help and shortcuts (?)',
    shortcuts: 'Keyboard shortcuts',
    showTips: 'Show the getting-started tips again',
  }
)

/** 结构化的帮助内容（提示与快捷键表）按界面语言取 */
const CONTENT: Record<
  Lang,
  {
    tips: { title: string; body: string }[]
    groups: { title: string; keys: [string, string][] }[]
  }
> = {
  zh: {
    tips: [
      {
        title: '直接在纸上写',
        body: '点击纸面上的任意文字就能修改。回车跳到下一项；在要点里回车会新起一条，用 **两个星号** 包住文字可以加粗。',
      },
      {
        title: '悬停出现工具',
        body: '鼠标移到条目或区块上，旁边会出现工具：上移、下移、在下方插入、隐藏、删除。空着的城市、链接、技术栈点一下就能补上。',
      },
      {
        title: '底部调排版',
        body: '底部工具栏可以换主题、版式、字体、颜色和间距，右边的批注会提示可以改进的写法。写完按 {mod}P 导出 PDF。',
      },
    ],
    groups: [
      {
        title: '通用',
        keys: [
          ['{mod} Z', '撤销'],
          ['{mod} {shift} Z', '重做'],
          ['{mod} S', '立即保存（平时会自动保存）'],
          ['{mod} P', '导出 PDF'],
          ['{mod} \\', '展开 / 收起大纲'],
          ['Esc', '关闭面板、退出预览'],
          ['?', '打开这个面板'],
        ],
      },
      {
        title: '编辑文字',
        keys: [
          ['Enter', '跳到下一项'],
          ['Enter', '在要点里：新起一条'],
          ['Backspace', '在要点开头：与上一条合并'],
          ['↑ ↓', '在要点之间移动'],
          ['Esc', '结束编辑'],
          ['**文字**', '加粗'],
        ],
      },
    ],
  },
  en: {
    tips: [
      {
        title: 'Write right on the page',
        body: 'Click any text on the page to edit it. Enter moves to the next field; inside a bullet it starts a new one. Wrap text in **double asterisks** to make it bold.',
      },
      {
        title: 'Tools appear on hover',
        body: 'Hover an entry or section to reveal its tools: move up, move down, insert below, hide, delete. Empty fields like city, links and tech stack are one click away.',
      },
      {
        title: 'Style from the dock',
        body: 'Use the dock at the bottom to change theme, layout, fonts, colors and spacing; notes in the margin suggest improvements. Press {mod}P to export a PDF.',
      },
    ],
    groups: [
      {
        title: 'General',
        keys: [
          ['{mod} Z', 'Undo'],
          ['{mod} {shift} Z', 'Redo'],
          ['{mod} S', 'Save now (saving is automatic)'],
          ['{mod} P', 'Export PDF'],
          ['{mod} \\', 'Show / hide the outline'],
          ['Esc', 'Close panels, leave preview'],
          ['?', 'Open this panel'],
        ],
      },
      {
        title: 'Editing text',
        keys: [
          ['Enter', 'Next field'],
          ['Enter', 'In a bullet: start a new one'],
          [
            'Backspace',
            'At the start of a bullet: merge with the previous one',
          ],
          ['↑ ↓', 'Move between bullets'],
          ['Esc', 'Stop editing'],
          ['**text**', 'Bold'],
        ],
      },
    ],
  },
}

const keys = (s: string) => s.replace('{mod}', MOD).replace('{shift}', SHIFT)

const TIPS_KEY = 'iresume-tips'
export const tipsDone = () => {
  try {
    return localStorage.getItem(TIPS_KEY) === 'done'
  } catch {
    return true
  }
}
export const setTipsDone = (done: boolean) => {
  try {
    if (done) localStorage.setItem(TIPS_KEY, 'done')
    else localStorage.removeItem(TIPS_KEY)
  } catch {}
}

/** 第一次打开编辑器时的三条轻提示：不遮挡纸面，可以随时关掉，只出现一次 */
export function Tips({ onDone }: { onDone(): void }) {
  const t = useT(M)
  const { tips } = CONTENT[useLang()]
  const [i, setI] = useState(0)
  const tip = tips[i]
  const last = i === tips.length - 1
  const finish = () => {
    setTipsDone(true)
    onDone()
  }
  return (
    <section className='e-tips' aria-label={t.tipsLabel} aria-live='polite'>
      <div className='e-tips-head'>
        <Lightbulb size={15} />
        <b>{tip.title}</b>
        <IconButton label={t.skip} className='is-sm' onClick={finish}>
          <X size={14} />
        </IconButton>
      </div>
      <p>
        {keys(tip.body)
          .split(/(\*\*[^*]+\*\*)/)
          .map((part, k) =>
            part.startsWith('**') ? <code key={k}>{part}</code> : part
          )}
      </p>
      <div className='e-tips-foot'>
        <span
          className='e-tips-dots'
          role='img'
          aria-label={t.step(i + 1, tips.length)}
        >
          {tips.map((x, k) => (
            <i key={x.title} className={k === i ? 'is-on' : ''} />
          ))}
        </span>
        <Button
          size='sm'
          variant={last ? 'primary' : 'soft'}
          onClick={() => (last ? finish() : setI(i + 1))}
        >
          {last ? t.done : t.next}
        </Button>
      </div>
    </section>
  )
}

/** 右下角的「?」：打开快捷键面板 */
export function HelpButton({ onClick }: { onClick(): void }) {
  const t = useT(M)
  return (
    <button
      type='button'
      className='e-help-btn'
      aria-label={t.help}
      title={t.help}
      onClick={onClick}
    >
      ?
    </button>
  )
}

export function ShortcutsDialog({
  open,
  onClose,
  onShowTips,
}: {
  open: boolean
  onClose(): void
  onShowTips(): void
}) {
  const t = useT(M)
  const lang = useLang()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <>
          <Keyboard size={17} /> {t.shortcuts}
        </>
      }
      label={t.shortcuts}
      className='e-keys'
    >
      <div className='e-keys-body'>
        {CONTENT[lang].groups.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <dl>
              {g.keys.map(([k, what]) => (
                <div key={k + what}>
                  <dt>
                    {keys(k)
                      .split(' ')
                      .map((part) => (
                        <kbd key={part}>{part}</kbd>
                      ))}
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <button
          type='button'
          className='e-keys-tips'
          onClick={() => {
            setTipsDone(false)
            onShowTips()
          }}
        >
          <Lightbulb size={14} /> {t.showTips}
        </button>
      </div>
    </Dialog>
  )
}
