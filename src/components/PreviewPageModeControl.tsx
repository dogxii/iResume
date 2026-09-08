import { Files, Rows3 } from 'lucide-react'
import type { PreviewPageMode } from '../data/previewPageMode'

interface PreviewPageModeControlProps {
  value: PreviewPageMode
  onChange: (value: PreviewPageMode) => void
}

const options: {
  value: PreviewPageMode
  title: string
  icon: typeof Rows3
}[] = [
  { value: 'continuous', title: '连续预览', icon: Rows3 },
  { value: 'paged', title: '分页预览', icon: Files },
]

const PreviewPageModeControl = ({
  value,
  onChange,
}: PreviewPageModeControlProps) => (
  <div
    className='flex h-8 items-center gap-0.5 rounded-lg bg-white/60 px-1 text-xs ring-1 ring-slate-200/60'
    title='切换预览模式'
  >
    {options.map((option) => {
      const Icon = option.icon
      const active = option.value === value
      return (
        <button
          key={option.value}
          type='button'
          onClick={() => onChange(option.value)}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
            active
              ? 'bg-slate-100 text-slate-700'
              : 'text-slate-400 hover:bg-slate-100/80 hover:text-slate-700'
          }`}
          title={option.title}
          aria-label={option.title}
          aria-pressed={active}
        >
          <Icon size={13} />
        </button>
      )
    })}
  </div>
)

export default PreviewPageModeControl
