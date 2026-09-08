import { Maximize2, Minus, Plus, Search } from 'lucide-react'
import {
  DEFAULT_PREVIEW_ZOOM,
  getAdjacentPreviewZoom,
  PREVIEW_ZOOM_OPTIONS,
  type PreviewZoom,
} from '../data/previewZoom'

interface PreviewZoomControlProps {
  value: PreviewZoom
  onChange: (value: PreviewZoom) => void
}

const MIN_ZOOM = PREVIEW_ZOOM_OPTIONS[0]
const MAX_ZOOM = PREVIEW_ZOOM_OPTIONS[PREVIEW_ZOOM_OPTIONS.length - 1]

const PreviewZoomControl = ({ value, onChange }: PreviewZoomControlProps) => (
  <div
    className='flex h-8 items-center gap-0.5 rounded-lg bg-white/60 px-1 text-xs ring-1 ring-slate-200/60'
    title='调整预览缩放'
  >
    <Search size={14} className='ml-1 text-slate-400' aria-hidden='true' />
    <button
      type='button'
      onClick={() => onChange(getAdjacentPreviewZoom(value, 'smaller'))}
      disabled={value === MIN_ZOOM}
      className='flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
      title='缩小预览'
      aria-label='缩小预览'
    >
      <Minus size={14} />
    </button>
    <span className='min-w-11 text-center font-medium tabular-nums text-slate-600'>
      {Math.round(value * 100)}%
    </span>
    <button
      type='button'
      onClick={() => onChange(getAdjacentPreviewZoom(value, 'larger'))}
      disabled={value === MAX_ZOOM}
      className='flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
      title='放大预览'
      aria-label='放大预览'
    >
      <Plus size={14} />
    </button>
    <button
      type='button'
      onClick={() => onChange(DEFAULT_PREVIEW_ZOOM)}
      disabled={value === DEFAULT_PREVIEW_ZOOM}
      className='flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
      title='恢复 100%'
      aria-label='恢复预览 100%'
    >
      <Maximize2 size={13} />
    </button>
  </div>
)

export default PreviewZoomControl
