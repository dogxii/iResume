import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  Award,
  BriefcaseBusiness,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  FolderGit2,
  GraduationCap,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Maximize2,
  Minus,
  MoveHorizontal,
  Plus,
  RotateCcw,
  School,
  Tags,
  Trash2,
  Upload,
  UserRound,
  Wrench,
} from 'lucide-react'
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  createResumeItemId,
  isCustomSectionKey,
  OPTIONAL_STANDARD_SECTION_KEYS,
  STANDARD_SECTION_KEYS,
} from '../data/resumeData'
import { formatSkillsAsMarkdown } from '../data/resumeSkills'
import type {
  EntryRolePosition,
  ProjectLinksDisplay,
  ProjectLinksPosition,
  ProjectTagPosition,
  ProjectTagStyle,
  ResumeFontFamily,
  ResumeFontSizePt,
  ResumeItemTitleFontSizePx,
  ResumeLineHeight,
  ResumeLinkStyle,
  ResumePageMarginMm,
  ResumeParagraphSpacingPx,
  ResumePhotoPosition,
  ResumePhotoSizeRatio,
  ResumeSectionPreferences,
  ResumeSectionSpacing,
  ResumeSectionTitleFontSizePx,
  SectionDatePosition,
} from '../data/resumeStyle'
import {
  DEFAULT_RESUME_ACCENT_COLOR,
  DEFAULT_RESUME_FONT_SIZE_PT,
  DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX,
  DEFAULT_RESUME_LINE_HEIGHT,
  DEFAULT_RESUME_PAGE_MARGIN_MM,
  DEFAULT_RESUME_PARAGRAPH_SPACING_PX,
  DEFAULT_RESUME_SECTION_SPACING,
  DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX,
  MAX_RESUME_LINE_HEIGHT,
  MIN_RESUME_LINE_HEIGHT,
  normalizeResumeAccentColor,
  normalizeResumeLineHeight,
  RESUME_ACCENT_COLOR_PRESETS,
  RESUME_FONT_SIZE_OPTIONS,
  RESUME_ITEM_TITLE_FONT_SIZE_OPTIONS,
  RESUME_LINE_HEIGHT_STEP,
  RESUME_PAGE_MARGIN_OPTIONS,
  RESUME_PARAGRAPH_SPACING_OPTIONS,
  RESUME_SECTION_SPACING_OPTIONS,
  RESUME_SECTION_TITLE_FONT_SIZE_OPTIONS,
} from '../data/resumeStyle'
import type {
  CustomSectionKey,
  Education,
  Experience,
  Project,
  ResumeData,
  ResumeEditableSectionKey,
  SectionEntry,
  SectionIconVisibility,
  SectionKey,
  SectionVisibility,
  StandardSectionKey,
} from '../types/resume'
import type { TemplateId } from '../types/template'
import {
  isEmbeddedResumePhotoUrl,
  normalizeResumePhotoSrc,
  RESUME_PHOTO_MAX_EDGE_PX,
  RESUME_PHOTO_MAX_FILE_SIZE_BYTES,
  resumePhotoFileTypePattern,
} from '../utils/resumePhoto'
import FontFamilyControl from './FontFamilyControl'
import TemplatePicker from './TemplatePicker'
import ToggleSwitch from './ToggleSwitch'
import { useAdaptiveMenuPlacement } from './useAdaptiveMenuPlacement'

export type ResumeEditorPanel = 'structure' | 'details'

interface InputGroupProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea'
  placeholder?: string
  rows?: number
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white p-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500'

const resizeTextareaToContent = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight + 2}px`
}

const AutoResizeTextarea = ({
  id,
  className,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  id?: string
  className?: string
  value: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    resizeTextareaToContent(textareaRef.current)
  }, [rows, value])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || typeof ResizeObserver === 'undefined') return

    let width = textarea.offsetWidth
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width)
      if (nextWidth === width) return
      width = nextWidth
      resizeTextareaToContent(textarea)
    })

    observer.observe(textarea)
    return () => observer.disconnect()
  }, [])

  return (
    <textarea
      id={id}
      ref={textareaRef}
      className={`${className ?? ''} resize-none overflow-hidden`}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}

const readFileAsCompressedPhoto = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!resumePhotoFileTypePattern.test(file.type)) {
      reject(new Error('仅支持 JPG、PNG、WebP 图片'))
      return
    }

    if (file.size > RESUME_PHOTO_MAX_FILE_SIZE_BYTES) {
      reject(new Error('图片不能超过 5MB'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('无法读取图片'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('无法解析图片'))
      image.onload = () => {
        const sourceWidth = image.naturalWidth
        const sourceHeight = image.naturalHeight
        if (!sourceWidth || !sourceHeight) {
          reject(new Error('无法解析图片尺寸'))
          return
        }

        const scale = Math.min(
          1,
          RESUME_PHOTO_MAX_EDGE_PX / sourceWidth,
          RESUME_PHOTO_MAX_EDGE_PX / sourceHeight,
        )
        const width = Math.max(1, Math.round(sourceWidth * scale))
        const height = Math.max(1, Math.round(sourceHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')

        if (!context) {
          reject(new Error('无法处理图片'))
          return
        }

        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      }
      image.src = String(reader.result ?? '')
    }
    reader.readAsDataURL(file)
  })

const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  rows = 4,
}: InputGroupProps) => {
  const id = useId()
  return (
    <div className='mb-3'>
      <label
        htmlFor={id}
        className='mb-1 block text-xs font-medium text-slate-500'
      >
        {label}
      </label>
      {type === 'textarea' ? (
        <AutoResizeTextarea
          id={id}
          className={inputClass}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          type='text'
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

interface ResumeEditorProps {
  data: ResumeData
  sectionIcons: SectionIconVisibility
  sectionPreferences: ResumeSectionPreferences
  templateId: TemplateId
  favoriteTemplateIds: TemplateId[]
  accentColor: string
  fontSizePt: ResumeFontSizePt
  sectionTitleFontSizePx: ResumeSectionTitleFontSizePx
  itemTitleFontSizePx: ResumeItemTitleFontSizePx
  fontFamily: ResumeFontFamily
  pageMarginMm: ResumePageMarginMm
  lineHeight: ResumeLineHeight
  sectionSpacing: ResumeSectionSpacing
  paragraphSpacingPx: ResumeParagraphSpacingPx
  panel: ResumeEditorPanel
  activeSection: ResumeEditableSectionKey
  onActiveSectionChange: (section: ResumeEditableSectionKey) => void
  onChange: (data: ResumeData) => void
  onSectionIconsChange: (sectionIcons: SectionIconVisibility) => void
  onSectionPreferencesChange: (preferences: ResumeSectionPreferences) => void
  onTemplateChange: (id: TemplateId) => void
  onToggleFavoriteTemplate: (id: TemplateId) => void
  onAccentColorChange: (value: string) => void
  onFontSizeChange: (value: ResumeFontSizePt) => void
  onSectionTitleFontSizeChange: (value: ResumeSectionTitleFontSizePx) => void
  onItemTitleFontSizeChange: (value: ResumeItemTitleFontSizePx) => void
  onFontFamilyChange: (value: ResumeFontFamily) => void
  onPageMarginChange: (value: ResumePageMarginMm) => void
  onLineHeightChange: (value: ResumeLineHeight) => void
  onSectionSpacingChange: (value: ResumeSectionSpacing) => void
  onParagraphSpacingChange: (value: ResumeParagraphSpacingPx) => void
}

interface ItemActionsProps {
  index: number
  total: number
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
  removeConfirmMessage?: string
}

const sectionFallbackNames: Record<StandardSectionKey, string> = {
  skills: '专业技能',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育背景',
  awards: '获奖经历',
  campus: '校园经历',
  other: '自我评价',
}

const sectionIconNodes: Record<StandardSectionKey, ReactNode> = {
  skills: <Wrench size={15} />,
  experience: <BriefcaseBusiness size={15} />,
  projects: <FolderGit2 size={15} />,
  education: <GraduationCap size={15} />,
  awards: <Award size={15} />,
  campus: <School size={15} />,
  other: <FileText size={15} />,
}

const personalIconNode = <UserRound size={15} />
const customSectionIconNode = <FileText size={15} />

interface SegmentedOption<T extends string | number> {
  value: T
  label: string
}

const datePositionOptions: SegmentedOption<SectionDatePosition>[] = [
  { value: 'right', label: '右侧' },
  { value: 'below', label: '下方' },
]

const projectLinksOptions: SegmentedOption<ProjectLinksPosition>[] = [
  { value: 'title', label: '标题右侧' },
  { value: 'below', label: '标题下方' },
]

const projectLinksDisplayOptions: SegmentedOption<ProjectLinksDisplay>[] = [
  { value: 'label', label: '文本' },
  { value: 'url', label: '链接' },
]

const projectTagOptions: SegmentedOption<ProjectTagPosition>[] = [
  { value: 'title', label: '标题右侧' },
  { value: 'below', label: '标题下方' },
]

const projectTagStyleOptions: SegmentedOption<ProjectTagStyle>[] = [
  { value: 'badge', label: '标签' },
  { value: 'text', label: '纯文本' },
]

const photoPositionOptions: SegmentedOption<ResumePhotoPosition>[] = [
  { value: 'right', label: '右侧' },
  { value: 'left', label: '左侧' },
]

const photoSizeRatioOptions: SegmentedOption<ResumePhotoSizeRatio>[] = [
  { value: 0.85, label: '85%' },
  { value: 1, label: '100%' },
  { value: 1.15, label: '115%' },
]

const linkStyleOptions: SegmentedOption<ResumeLinkStyle>[] = [
  { value: 'text', label: '文本' },
  { value: 'highlighted', label: '标识' },
  { value: 'blue', label: '蓝色' },
]

const rolePositionOptions: SegmentedOption<EntryRolePosition>[] = [
  { value: 'middle', label: '中间' },
  { value: 'title', label: '标题右侧' },
  { value: 'bottom', label: '底部' },
]

const SegmentedControl = <T extends string | number>({
  label,
  value,
  options,
  onChange,
  icon,
  disabled = false,
}: {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  icon?: ReactNode
  disabled?: boolean
}) => (
  <div
    className={`flex w-full items-center justify-between gap-3 ${
      disabled ? 'opacity-45' : ''
    }`}
  >
    <span className='flex min-w-0 items-center gap-1.5 text-xs text-slate-500'>
      {icon && <span className='shrink-0 text-slate-300'>{icon}</span>}
      {label}
    </span>
    <div className='inline-flex shrink-0 rounded-full bg-slate-100/70 p-0.5 ring-1 ring-slate-200/60'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
            option.value === value
              ? 'bg-white text-slate-700 shadow-sm shadow-slate-900/5'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-pressed={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
)

const getAdjacentNumberOption = <T extends number>(
  options: readonly T[],
  value: T,
  direction: 'smaller' | 'larger',
) => {
  const sortedOptions = [...options].sort((a, b) => a - b)
  const currentIndex = sortedOptions.findIndex((option) => option === value)
  const index =
    currentIndex >= 0
      ? currentIndex
      : sortedOptions.findIndex((option) => option >= value)
  const safeIndex =
    index < 0
      ? sortedOptions.length - 1
      : Math.min(Math.max(index, 0), sortedOptions.length - 1)
  const nextIndex = direction === 'smaller' ? safeIndex - 1 : safeIndex + 1
  return sortedOptions[
    Math.min(Math.max(nextIndex, 0), sortedOptions.length - 1)
  ]
}

const NumberStepperControl = <T extends number>({
  label,
  value,
  options,
  defaultValue,
  onChange,
  unit = 'px',
  icon,
}: {
  label: string
  value: T
  options: readonly T[]
  defaultValue: T
  onChange: (value: T) => void
  unit?: string
  icon?: ReactNode
}) => {
  const sortedOptions = [...options].sort((a, b) => a - b)
  const min = sortedOptions[0]
  const max = sortedOptions[sortedOptions.length - 1]
  const isDefault = value === defaultValue

  return (
    <div className='flex w-full items-center justify-between gap-3'>
      <span className='flex min-w-0 items-center gap-1.5 text-xs text-slate-500'>
        {icon && <span className='shrink-0 text-slate-300'>{icon}</span>}
        {label}
      </span>
      <div className='flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-white/60 px-1 text-xs ring-1 ring-slate-200/60'>
        <button
          type='button'
          onClick={() =>
            onChange(getAdjacentNumberOption(options, value, 'smaller'))
          }
          disabled={value <= min}
          className='flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
          title={`减少${label}`}
          aria-label={`减少${label}`}
        >
          <Minus size={14} />
        </button>
        <span className='min-w-12 text-center font-medium tabular-nums text-slate-600'>
          {value}
          {unit}
        </span>
        <button
          type='button'
          onClick={() =>
            onChange(getAdjacentNumberOption(options, value, 'larger'))
          }
          disabled={value >= max}
          className='flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
          title={`增加${label}`}
          aria-label={`增加${label}`}
        >
          <Plus size={14} />
        </button>
        <button
          type='button'
          onClick={() => onChange(defaultValue)}
          disabled={isDefault}
          className='flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
          title={`恢复默认${label}`}
          aria-label={`恢复默认${label}`}
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  )
}

const LineHeightSliderControl = ({
  value,
  onChange,
}: {
  value: ResumeLineHeight
  onChange: (value: ResumeLineHeight) => void
}) => {
  const normalizedValue = normalizeResumeLineHeight(value)
  const progress =
    ((normalizedValue - MIN_RESUME_LINE_HEIGHT) /
      (MAX_RESUME_LINE_HEIGHT - MIN_RESUME_LINE_HEIGHT)) *
    100
  const isDefault = normalizedValue === DEFAULT_RESUME_LINE_HEIGHT

  return (
    <div className='rounded-md border border-slate-100 bg-white/60 px-3 py-2.5'>
      <div className='mb-2 flex items-center justify-between gap-3'>
        <span className='text-xs text-slate-500'>行高</span>
        <div className='flex items-center gap-1.5'>
          <span className='min-w-10 text-right font-mono text-xs font-medium tabular-nums text-slate-600'>
            {normalizedValue.toFixed(2)}
          </span>
          <button
            type='button'
            onClick={() => onChange(DEFAULT_RESUME_LINE_HEIGHT)}
            disabled={isDefault}
            className='flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-25'
            title='恢复默认行高'
            aria-label='恢复默认行高'
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <span className='w-4 text-[10px] tabular-nums text-slate-400'>
          {MIN_RESUME_LINE_HEIGHT}
        </span>
        <input
          type='range'
          min={MIN_RESUME_LINE_HEIGHT}
          max={MAX_RESUME_LINE_HEIGHT}
          step={RESUME_LINE_HEIGHT_STEP}
          value={normalizedValue}
          onChange={(event) =>
            onChange(normalizeResumeLineHeight(event.target.value))
          }
          className='h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-700 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-slate-700 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-700'
          style={{
            background: `linear-gradient(to right, #334155 ${progress}%, #e2e8f0 ${progress}%)`,
          }}
          aria-label='行高'
          aria-valuetext={normalizedValue.toFixed(2)}
        />
        <span className='w-4 text-right text-[10px] tabular-nums text-slate-400'>
          {MAX_RESUME_LINE_HEIGHT}
        </span>
      </div>
    </div>
  )
}

const ToggleControl = ({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: ReactNode
}) => (
  <label className='flex w-full items-center justify-between gap-2'>
    <span className='flex items-center gap-1.5 text-xs text-slate-500'>
      {icon && <span className='text-slate-300'>{icon}</span>}
      {label}
    </span>
    <ToggleSwitch checked={checked} label={label} onChange={onChange} />
  </label>
)

const panelBlockClass = 'border-b border-slate-200 p-4 last:border-b-0'
type SectionEntryTextKey = keyof Omit<SectionEntry, 'id'>

const SortableItemWithHandle = ({
  id,
  children,
}: {
  id: string | number
  children: (dragHandleProps: {
    activatorRef: (node: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners | undefined
  }) => ReactNode
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({
        activatorRef: setActivatorNodeRef,
        attributes,
        listeners,
      })}
    </div>
  )
}

const DragHandle = ({
  activatorRef,
  attributes,
  listeners,
}: {
  activatorRef: (node: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners | undefined
}) => (
  <button
    type='button'
    ref={activatorRef}
    {...attributes}
    {...listeners}
    className='hidden h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing sm:flex'
    title='拖拽排序'
    aria-label='拖拽排序'
  >
    <GripVertical size={14} />
  </button>
)

const ItemActions = ({
  index,
  total,
  onMove,
  onRemove,
  removeConfirmMessage = '确定要删除这条内容吗？',
}: ItemActionsProps) => (
  <div className='flex gap-0.5'>
    <button
      type='button'
      onClick={() => onMove('up')}
      disabled={index === 0}
      className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25'
      title='上移'
      aria-label='上移'
    >
      <ArrowUp size={14} />
    </button>
    <button
      type='button'
      onClick={() => onMove('down')}
      disabled={index === total - 1}
      className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25'
      title='下移'
      aria-label='下移'
    >
      <ArrowDown size={14} />
    </button>
    <button
      type='button'
      onClick={() => {
        if (window.confirm(removeConfirmMessage)) onRemove()
      }}
      className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500'
      title='删除'
      aria-label='删除'
    >
      <Trash2 size={14} />
    </button>
  </div>
)

const PanelBlock = ({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) => (
  <section className={panelBlockClass}>
    <div className='mb-3 flex items-center justify-between gap-2'>
      <h2 className='text-sm font-bold text-slate-800'>{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

const EmptyState = ({ text, action }: { text: string; action?: ReactNode }) => (
  <div className='rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-3 py-6 text-center'>
    <p className='text-xs text-slate-400'>{text}</p>
    {action && <div className='mt-3 flex justify-center'>{action}</div>}
  </div>
)

const AddButton = ({
  title,
  onClick,
}: {
  title: string
  onClick: () => void
}) => (
  <button
    type='button'
    onClick={onClick}
    className='flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50'
    title={title}
    aria-label={title}
  >
    <Plus size={16} />
  </button>
)

const PhotoField = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => {
  const id = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const trimmedValue = value.trim()
  const photoSrc = normalizeResumePhotoSrc(trimmedValue)
  const usesEmbeddedPhoto = isEmbeddedResumePhotoUrl(trimmedValue)

  const handlePhotoFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setError('')
    try {
      onChange(await readFileAsCompressedPhoto(file))
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : '照片导入失败',
      )
    }
  }

  return (
    <div className='mb-3 rounded-md border border-slate-200 bg-slate-50/70 p-3'>
      <div className='flex items-start gap-3'>
        <div className='flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-slate-300'>
          {photoSrc ? (
            <img
              src={photoSrc}
              alt='简历照片预览'
              className='h-full w-full object-cover'
            />
          ) : (
            <ImagePlus size={22} />
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <label htmlFor={id} className='text-xs font-medium text-slate-500'>
              照片
            </label>
            <div className='flex shrink-0 gap-1'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500'
                title='上传照片'
                aria-label='上传照片'
              >
                <Upload size={14} />
              </button>
              {trimmedValue && (
                <button
                  type='button'
                  onClick={() => {
                    setError('')
                    onChange('')
                  }}
                  className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500'
                  title='移除照片'
                  aria-label='移除照片'
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='hidden'
            onChange={handlePhotoFileChange}
          />
          <input
            id={id}
            type='url'
            className={inputClass}
            value={usesEmbeddedPhoto ? '' : value}
            onChange={(event) => {
              setError('')
              onChange(event.target.value)
            }}
            placeholder={
              usesEmbeddedPhoto
                ? '已上传本地照片'
                : 'https://example.com/photo.jpg'
            }
          />
          {error && <p className='mt-2 text-xs text-red-500'>{error}</p>}
        </div>
      </div>
    </div>
  )
}

const ResumeEditor = ({
  data,
  sectionIcons,
  sectionPreferences,
  templateId,
  favoriteTemplateIds,
  accentColor,
  fontSizePt,
  sectionTitleFontSizePx,
  itemTitleFontSizePx,
  fontFamily,
  pageMarginMm,
  lineHeight,
  sectionSpacing,
  paragraphSpacingPx,
  panel,
  activeSection,
  onActiveSectionChange,
  onChange,
  onSectionIconsChange,
  onSectionPreferencesChange,
  onTemplateChange,
  onToggleFavoriteTemplate,
  onAccentColorChange,
  onFontSizeChange,
  onSectionTitleFontSizeChange,
  onItemTitleFontSizeChange,
  onFontFamilyChange,
  onPageMarginChange,
  onLineHeightChange,
  onSectionSpacingChange,
  onParagraphSpacingChange,
}: ResumeEditorProps) => {
  const detailsScrollRef = useRef<HTMLDivElement>(null)
  const addSectionMenuRef = useRef<HTMLDivElement>(null)
  const [addSectionMenuOpen, setAddSectionMenuOpen] = useState(false)
  const addSectionMenuPlacement = useAdaptiveMenuPlacement(addSectionMenuRef, {
    open: addSectionMenuOpen,
    preferred: 'top',
    estimatedHeight: 260,
  })

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
    const next = [...arr]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = data.sectionOrder.indexOf(active.id as SectionKey)
    const newIndex = data.sectionOrder.indexOf(over.id as SectionKey)
    if (oldIndex === -1 || newIndex === -1) return
    onChange({
      ...data,
      sectionOrder: reorderArray(data.sectionOrder, oldIndex, newIndex),
    })
  }

  const handleItemsDragEnd =
    <T extends { id: number }>(
      items: T[],
      field: keyof Pick<
        ResumeData,
        'skills' | 'experience' | 'projects' | 'education' | 'awards' | 'campus'
      >,
    ) =>
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      onChange({ ...data, [field]: reorderArray(items, oldIndex, newIndex) })
    }

  const updatePersonal = (key: keyof ResumeData['personal'], value: string) => {
    onChange({ ...data, personal: { ...data.personal, [key]: value } })
  }

  const getSkillsText = () => formatSkillsAsMarkdown(data.skills)

  const updateSkillsText = (content: string) => {
    const existingSkill = data.skills[0]
    onChange({
      ...data,
      skills: content.trim()
        ? [
            {
              id: existingSkill?.id ?? createResumeItemId(),
              label: '',
              content,
            },
          ]
        : [],
    })
  }

  const getCustomSection = (key: SectionKey) =>
    isCustomSectionKey(key)
      ? data.customSections.find((section) => section.id === key)
      : undefined

  const createCustomSectionId = (): CustomSectionKey => {
    const usedIds = new Set(data.customSections.map((section) => section.id))
    let nextId = Date.now()
    while (usedIds.has(`custom-${nextId}` as CustomSectionKey)) nextId += 1
    return `custom-${nextId}` as CustomSectionKey
  }

  const updateSectionTitle = (key: SectionKey, value: string) => {
    const nextData: ResumeData = {
      ...data,
      sectionTitles: { ...data.sectionTitles, [key]: value },
    }

    if (isCustomSectionKey(key)) {
      nextData.customSections = data.customSections.map((section) =>
        section.id === key ? { ...section, title: value } : section,
      )
    }

    onChange(nextData)
  }

  const updateCustomSectionContent = (key: CustomSectionKey, value: string) => {
    onChange({
      ...data,
      customSections: data.customSections.map((section) =>
        section.id === key ? { ...section, content: value } : section,
      ),
    })
  }

  const updateSectionVisibility = (key: SectionKey, visible: boolean) => {
    onChange({
      ...data,
      sectionVisibility: { ...data.sectionVisibility, [key]: visible },
    })
  }

  const updateAllSectionIcons = (visible: boolean) => {
    onSectionIconsChange(
      data.sectionOrder.reduce(
        (result, key) => ({ ...result, [key]: visible }),
        { ...sectionIcons },
      ),
    )
  }

  const addStandardSection = (key: StandardSectionKey) => {
    const nextOrder = data.sectionOrder.includes(key)
      ? data.sectionOrder
      : [...data.sectionOrder, key]
    onChange({
      ...data,
      sectionOrder: nextOrder,
      sectionVisibility: { ...data.sectionVisibility, [key]: true },
    })
    onSectionIconsChange({ ...sectionIcons, [key]: sectionIcons[key] ?? false })
    onActiveSectionChange(key)
    setAddSectionMenuOpen(false)
  }

  const addCustomSection = () => {
    const id = createCustomSectionId()
    const title = '自定义区块'
    onChange({
      ...data,
      customSections: [...data.customSections, { id, title, content: '' }],
      sectionTitles: { ...data.sectionTitles, [id]: title },
      sectionVisibility: { ...data.sectionVisibility, [id]: true },
      sectionOrder: [...data.sectionOrder, id],
    })
    onSectionIconsChange({ ...sectionIcons, [id]: false })
    onActiveSectionChange(id)
    setAddSectionMenuOpen(false)
  }

  const removeSection = (key: SectionKey) => {
    const customSection = getCustomSection(key)
    const message = customSection
      ? `确定要删除「${getSectionTitle(key)}」吗？内容会一起删除。`
      : `确定要从简历中移除「${getSectionTitle(key)}」吗？内容会保留，可从添加区块恢复。`
    if (!window.confirm(message)) return

    const nextOrder = data.sectionOrder.filter((item) => item !== key)
    const nextVisibility: SectionVisibility = {
      ...data.sectionVisibility,
      [key]: false,
    }
    let nextData: ResumeData = {
      ...data,
      sectionOrder: nextOrder,
      sectionVisibility: nextVisibility,
    }
    const nextIcons: SectionIconVisibility = { ...sectionIcons, [key]: false }

    if (isCustomSectionKey(key)) {
      const nextTitles = { ...data.sectionTitles }
      delete nextTitles[key]
      delete nextVisibility[key]
      delete nextIcons[key]
      nextData = {
        ...nextData,
        customSections: data.customSections.filter(
          (section) => section.id !== key,
        ),
        sectionTitles: nextTitles,
        sectionVisibility: nextVisibility,
      }
    }

    onChange(nextData)
    onSectionIconsChange(nextIcons)
    if (activeSection === key) {
      onActiveSectionChange(nextOrder[0] ?? 'personal')
    }
  }

  const updatePersonalPreferences = (
    patch: Partial<ResumeSectionPreferences['personal']>,
  ) => {
    onSectionPreferencesChange({
      ...sectionPreferences,
      personal: {
        ...sectionPreferences.personal,
        ...patch,
      },
    })
  }

  const updateSectionPreferences = <K extends keyof ResumeSectionPreferences>(
    key: K,
    patch: Partial<ResumeSectionPreferences[K]>,
  ) => {
    onSectionPreferencesChange({
      ...sectionPreferences,
      [key]: {
        ...sectionPreferences[key],
        ...patch,
      },
    })
  }

  const allSectionIconsVisible = data.sectionOrder.every(
    (key) => sectionIcons[key] !== false,
  )

  useEffect(() => {
    if (panel !== 'details') return
    detailsScrollRef.current?.scrollTo({ top: 0 })
  }, [activeSection, panel])

  useEffect(() => {
    if (!addSectionMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addSectionMenuRef.current &&
        !addSectionMenuRef.current.contains(event.target as Node)
      ) {
        setAddSectionMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [addSectionMenuOpen])

  const updateEducation = (id: number, key: keyof Education, value: string) => {
    onChange({
      ...data,
      education: data.education.map((education) =>
        education.id === id ? { ...education, [key]: value } : education,
      ),
    })
  }

  const addEducation = () => {
    onChange({
      ...data,
      education: [
        ...data.education,
        {
          id: createResumeItemId(),
          school: '学校名称',
          degree: '学位',
          date: '时间',
        },
      ],
    })
  }

  const removeEducation = (id: number) => {
    onChange({
      ...data,
      education: data.education.filter((education) => education.id !== id),
    })
  }

  const updateSectionEntry = (
    section: 'awards' | 'campus',
    id: number,
    key: SectionEntryTextKey,
    value: string,
  ) => {
    onChange({
      ...data,
      [section]: data[section].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    })
  }

  const addSectionEntry = (
    section: 'awards' | 'campus',
    template: Omit<SectionEntry, 'id'>,
  ) => {
    onChange({
      ...data,
      [section]: [...data[section], { ...template, id: createResumeItemId() }],
    })
  }

  const removeSectionEntry = (section: 'awards' | 'campus', id: number) => {
    onChange({
      ...data,
      [section]: data[section].filter((item) => item.id !== id),
    })
  }

  const updateArrayItem = <T extends Experience | Project>(
    section: 'experience' | 'projects',
    id: number,
    key: keyof T,
    value: string,
  ) => {
    onChange({
      ...data,
      [section]: data[section].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    })
  }

  const addItem = <T extends Experience | Project>(
    section: 'experience' | 'projects',
    template: Omit<T, 'id'>,
  ) => {
    onChange({
      ...data,
      [section]: [...data[section], { ...template, id: createResumeItemId() }],
    })
  }

  const removeItem = (section: 'experience' | 'projects', id: number) => {
    onChange({
      ...data,
      [section]: data[section].filter((item) => item.id !== id),
    })
  }

  const moveItem = <T extends { id: number }>(
    arr: T[],
    index: number,
    direction: 'up' | 'down',
  ): T[] => {
    const next = [...arr]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= next.length) return next
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    return next
  }

  const moveExperienceItem = (index: number, direction: 'up' | 'down') => {
    onChange({
      ...data,
      experience: moveItem(data.experience, index, direction),
    })
  }

  const moveProjectItem = (index: number, direction: 'up' | 'down') => {
    onChange({ ...data, projects: moveItem(data.projects, index, direction) })
  }

  const moveEducationItem = (index: number, direction: 'up' | 'down') => {
    onChange({
      ...data,
      education: moveItem(data.education, index, direction),
    })
  }

  const moveSectionEntry = (
    section: 'awards' | 'campus',
    index: number,
    direction: 'up' | 'down',
  ) => {
    onChange({
      ...data,
      [section]: moveItem(data[section], index, direction),
    })
  }

  const moveSectionOrder = (index: number, direction: 'up' | 'down') => {
    const nextOrder = [...data.sectionOrder]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= nextOrder.length) return
    ;[nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ]
    onChange({ ...data, sectionOrder: nextOrder })
  }

  const getSectionTitle = (key: SectionKey) => {
    const customSection = getCustomSection(key)
    if (customSection) {
      return (
        data.sectionTitles[key]?.trim() ||
        customSection.title.trim() ||
        '自定义区块'
      )
    }
    if (isCustomSectionKey(key)) {
      return data.sectionTitles[key]?.trim() || '自定义区块'
    }

    return data.sectionTitles[key]?.trim() || sectionFallbackNames[key]
  }

  const getSectionSummary = (key: SectionKey) => {
    const customSection = getCustomSection(key)
    if (customSection) {
      const lineCount = customSection.content
        .split('\n')
        .filter((line) => line.trim()).length
      return lineCount > 0 ? `${lineCount} 行内容` : '空'
    }
    if (isCustomSectionKey(key)) return '空'

    switch (key) {
      case 'skills':
        return data.skills.some(
          (skill) => skill.content.trim() || skill.label.trim(),
        )
          ? '已填写'
          : '空'
      case 'experience':
        return `${data.experience.length} 段经历`
      case 'projects':
        return `${data.projects.length} 个项目`
      case 'education':
        return `${data.education.length} 段教育`
      case 'awards':
        return `${data.awards.length} 项奖励`
      case 'campus':
        return `${data.campus.length} 段经历`
      case 'other':
        return data.other.trim() ? '已填写' : '空'
    }
  }

  const getSectionIconNode = (key: SectionKey) =>
    isCustomSectionKey(key) ? customSectionIconNode : sectionIconNodes[key]

  const getActiveSectionTitle = () =>
    activeSection === 'personal' ? '个人信息' : getSectionTitle(activeSection)

  const getActiveSectionSummary = () =>
    activeSection === 'personal' ? '' : getSectionSummary(activeSection)

  const getActiveSectionIcon = () =>
    activeSection === 'personal'
      ? personalIconNode
      : getSectionIconNode(activeSection)

  const renderSectionVisibilityButton = (key: SectionKey) => {
    const visible = data.sectionVisibility[key] !== false
    return (
      <button
        type='button'
        onClick={() => updateSectionVisibility(key, !visible)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded transition ${
          visible
            ? 'text-slate-400 hover:bg-white/80 hover:text-blue-500'
            : 'text-slate-300 hover:bg-white/80 hover:text-slate-500'
        }`}
        title={visible ? '隐藏区块' : '显示区块'}
        aria-label={visible ? '隐藏区块' : '显示区块'}
        aria-pressed={visible}
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    )
  }

  const renderSectionOrderButton = (key: SectionKey, active: boolean) => (
    <button
      type='button'
      onClick={() => onActiveSectionChange(key)}
      className='flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left transition hover:text-slate-900'
      aria-pressed={active}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/70 ${
          active ? 'text-blue-600' : 'text-slate-400'
        }`}
      >
        {getSectionIconNode(key)}
      </span>
      <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
        {getSectionTitle(key)}
      </span>
    </button>
  )

  const renderSectionOrderRow = ({
    key,
    active,
    dragHandle,
    trailing,
  }: {
    key: SectionKey
    active: boolean
    dragHandle?: ReactNode
    trailing?: ReactNode
  }) => {
    const visible = data.sectionVisibility[key] !== false

    return (
      <div
        className={`group flex w-full min-w-0 items-center gap-1 rounded-md border px-1.5 py-1.5 transition ${
          active
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : visible
              ? 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
              : 'border-transparent bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-white'
        }`}
      >
        {dragHandle}
        {renderSectionOrderButton(key, active)}
        <div className='flex shrink-0 items-center gap-0.5'>
          {renderSectionVisibilityButton(key)}
          {renderSectionRemoveButton(key)}
          {trailing}
        </div>
      </div>
    )
  }

  const renderPersonalOrderButton = () => {
    const active = activeSection === 'personal'
    return (
      <button
        type='button'
        onClick={() => onActiveSectionChange('personal')}
        className={`mb-2 flex w-full min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${
          active
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
        }`}
        aria-pressed={active}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
            active ? 'bg-white text-blue-600' : 'bg-white text-slate-400'
          }`}
        >
          {personalIconNode}
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block truncate text-sm font-semibold'>个人信息</span>
        </span>
      </button>
    )
  }

  const renderPersonalPanel = () => (
    <PanelBlock title='个人信息'>
      <div className='grid grid-cols-1 gap-2'>
        <InputGroup
          label='姓名'
          value={data.personal.name}
          onChange={(value) => updatePersonal('name', value)}
        />
        <InputGroup
          label='职位头衔'
          value={data.personal.title}
          onChange={(value) => updatePersonal('title', value)}
        />
        <PhotoField
          value={data.personal.photoUrl}
          onChange={(value) => updatePersonal('photoUrl', value)}
        />
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          <InputGroup
            label='电话'
            value={data.personal.phone}
            onChange={(value) => updatePersonal('phone', value)}
          />
          <InputGroup
            label='邮箱'
            value={data.personal.email}
            onChange={(value) => updatePersonal('email', value)}
          />
        </div>
        <InputGroup
          label='所在地'
          value={data.personal.location}
          onChange={(value) => updatePersonal('location', value)}
          placeholder='例：北京, 中国'
        />
        <InputGroup
          label='到岗情况'
          value={data.personal.availability}
          onChange={(value) => updatePersonal('availability', value)}
          placeholder='例：4天/周 3个月+'
        />
        <InputGroup
          label='GitHub'
          value={data.personal.github}
          onChange={(value) => updatePersonal('github', value)}
          placeholder='github.com/yourname'
        />
        <InputGroup
          label='个人网站'
          value={data.personal.website}
          onChange={(value) => updatePersonal('website', value)}
          placeholder='your-portfolio.com'
        />
      </div>
    </PanelBlock>
  )

  const renderAccentColorControl = () => {
    const normalizedAccentColor = normalizeResumeAccentColor(accentColor)

    return (
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs font-medium text-slate-500'>主题色</span>
          <button
            type='button'
            onClick={() => onAccentColorChange(DEFAULT_RESUME_ACCENT_COLOR)}
            disabled={normalizedAccentColor === DEFAULT_RESUME_ACCENT_COLOR}
            className='flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-25'
            title='恢复默认主题色'
            aria-label='恢复默认主题色'
          >
            <RotateCcw size={13} />
          </button>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {RESUME_ACCENT_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type='button'
              onClick={() => onAccentColorChange(color)}
              className={`h-6 w-6 rounded-full border border-black/10 shadow-sm outline-offset-2 transition-transform hover:scale-110 ${
                normalizedAccentColor === color
                  ? 'outline-2 outline-slate-500'
                  : ''
              }`}
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`选择主题色 ${color}`}
              aria-pressed={normalizedAccentColor === color}
            />
          ))}
          <label
            className='relative h-6 w-6 overflow-hidden rounded-full border border-slate-200 bg-white'
            title='自定义主题色'
          >
            <input
              type='color'
              value={normalizedAccentColor}
              onChange={(event) => onAccentColorChange(event.target.value)}
              className='absolute -inset-2 h-10 w-10 cursor-pointer border-0 bg-transparent p-0'
              aria-label='打开自定义主题色取色器'
            />
          </label>
        </div>
      </div>
    )
  }

  const renderLayoutSettingsPanel = () => (
    <PanelBlock title='布局与样式'>
      <div className='space-y-3'>
        <div className='space-y-1.5'>
          <span className='text-xs font-medium text-slate-500'>布局</span>
          <TemplatePicker
            current={templateId}
            favoriteTemplateIds={favoriteTemplateIds}
            onChange={onTemplateChange}
            onToggleFavorite={onToggleFavoriteTemplate}
          />
        </div>
        {renderAccentColorControl()}
        <div className='flex w-full items-center justify-between gap-3'>
          <span className='text-xs font-medium text-slate-500'>字体</span>
          <FontFamilyControl
            value={fontFamily}
            onChange={onFontFamilyChange}
            menuPlacement='top'
          />
        </div>
        <div className='space-y-2 border-t border-slate-100 pt-3'>
          <span className='text-xs font-medium text-slate-500'>字号</span>
          <NumberStepperControl
            label='基础字号'
            value={fontSizePt}
            options={RESUME_FONT_SIZE_OPTIONS}
            defaultValue={DEFAULT_RESUME_FONT_SIZE_PT}
            onChange={onFontSizeChange}
          />
          <NumberStepperControl
            label='模块标题字号'
            value={sectionTitleFontSizePx}
            options={RESUME_SECTION_TITLE_FONT_SIZE_OPTIONS}
            defaultValue={DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX}
            onChange={onSectionTitleFontSizeChange}
          />
          <NumberStepperControl
            label='一级标题字号'
            value={itemTitleFontSizePx}
            options={RESUME_ITEM_TITLE_FONT_SIZE_OPTIONS}
            defaultValue={DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX}
            onChange={onItemTitleFontSizeChange}
          />
        </div>
        <div className='space-y-2 border-t border-slate-100 pt-3'>
          <span className='text-xs font-medium text-slate-500'>间距</span>
          <NumberStepperControl
            label='页边距'
            value={pageMarginMm}
            options={RESUME_PAGE_MARGIN_OPTIONS}
            defaultValue={DEFAULT_RESUME_PAGE_MARGIN_MM}
            onChange={onPageMarginChange}
          />
          <NumberStepperControl
            label='模块间距'
            value={sectionSpacing}
            options={RESUME_SECTION_SPACING_OPTIONS}
            defaultValue={DEFAULT_RESUME_SECTION_SPACING}
            onChange={onSectionSpacingChange}
          />
          <NumberStepperControl
            label='段落间距'
            value={paragraphSpacingPx}
            options={RESUME_PARAGRAPH_SPACING_OPTIONS}
            defaultValue={DEFAULT_RESUME_PARAGRAPH_SPACING_PX}
            onChange={onParagraphSpacingChange}
          />
        </div>
        <LineHeightSliderControl
          value={lineHeight}
          onChange={onLineHeightChange}
        />
        <ToggleControl
          label='标题图标'
          checked={allSectionIconsVisible}
          onChange={updateAllSectionIcons}
          icon={<FileText size={12} />}
        />
      </div>
    </PanelBlock>
  )

  const renderSectionRemoveButton = (key: SectionKey) => (
    <button
      type='button'
      onClick={() => removeSection(key)}
      className='flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-300 transition hover:bg-white/80 hover:text-red-500'
      title='删除区块'
      aria-label='删除区块'
    >
      <Trash2 size={14} />
    </button>
  )

  const renderAddSectionMenu = () => {
    const addableStandardSections = STANDARD_SECTION_KEYS.filter(
      (key) => !data.sectionOrder.includes(key),
    )

    return (
      <div ref={addSectionMenuRef} className='relative mt-3'>
        <button
          type='button'
          onClick={() => setAddSectionMenuOpen((open) => !open)}
          className='flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
          aria-expanded={addSectionMenuOpen}
        >
          <Plus size={15} />
          添加区块
        </button>
        {addSectionMenuOpen && (
          <div
            className={`absolute left-0 right-0 z-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 ${
              addSectionMenuPlacement === 'top'
                ? 'bottom-full mb-1'
                : 'top-full mt-1'
            }`}
          >
            {addableStandardSections.length === 0 ? (
              <div className='px-3 py-2 text-xs text-slate-400'>
                标准区块已全部添加
              </div>
            ) : (
              addableStandardSections.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => addStandardSection(key)}
                  className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className='text-slate-300'>
                      {sectionIconNodes[key]}
                    </span>
                    <span className='truncate'>{getSectionTitle(key)}</span>
                  </span>
                  {OPTIONAL_STANDARD_SECTION_KEYS.includes(key) && (
                    <span className='shrink-0 text-[10px] text-slate-300'>
                      默认隐藏
                    </span>
                  )}
                </button>
              ))
            )}
            <button
              type='button'
              onClick={addCustomSection}
              className='flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
              aria-label='添加自定义区块'
            >
              <span className='text-slate-300'>{customSectionIconNode}</span>
              自定义区块
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderStructurePanel = () => (
    <div>
      <PanelBlock title='区块顺序'>
        {renderPersonalOrderButton()}
        <div className='mt-3 hidden sm:block'>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={data.sectionOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className='space-y-1.5'>
                {data.sectionOrder.map((key) => {
                  const active = key === activeSection
                  return (
                    <SortableItemWithHandle key={key} id={key}>
                      {(dragHandle) =>
                        renderSectionOrderRow({
                          key,
                          active,
                          dragHandle: <DragHandle {...dragHandle} />,
                        })
                      }
                    </SortableItemWithHandle>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className='mt-3 space-y-1.5 sm:hidden'>
          {data.sectionOrder.map((key, index) => {
            const active = key === activeSection
            return (
              <div key={key}>
                {renderSectionOrderRow({
                  key,
                  active,
                  trailing: (
                    <div className='flex shrink-0 gap-0.5'>
                      <button
                        type='button'
                        onClick={() => moveSectionOrder(index, 'up')}
                        disabled={index === 0}
                        className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-white/80 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25'
                        title='上移'
                        aria-label='上移'
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type='button'
                        onClick={() => moveSectionOrder(index, 'down')}
                        disabled={index === data.sectionOrder.length - 1}
                        className='flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-white/80 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25'
                        title='下移'
                        aria-label='下移'
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  ),
                })}
              </div>
            )
          })}
        </div>
        {renderAddSectionMenu()}
      </PanelBlock>
      {renderLayoutSettingsPanel()}
    </div>
  )

  const renderSectionSettings = () => {
    if (activeSection === 'personal') return null

    return (
      <PanelBlock title='区块设置'>
        <InputGroup
          label='标题'
          value={getSectionTitle(activeSection)}
          onChange={(value) => updateSectionTitle(activeSection, value)}
        />
      </PanelBlock>
    )
  }

  const renderPersonalDisplaySettings = () => (
    <PanelBlock title='显示设置'>
      <div className='space-y-2'>
        <ToggleControl
          label='头像'
          checked={sectionPreferences.personal.showPhoto}
          onChange={(showPhoto) => updatePersonalPreferences({ showPhoto })}
          icon={<ImageIcon size={12} />}
        />
        <SegmentedControl
          label='位置'
          value={sectionPreferences.personal.photoPosition}
          options={photoPositionOptions}
          onChange={(photoPosition) =>
            updatePersonalPreferences({ photoPosition })
          }
          icon={<MoveHorizontal size={12} />}
          disabled={!sectionPreferences.personal.showPhoto}
        />
        <SegmentedControl
          label='大小'
          value={sectionPreferences.personal.photoSizeRatio}
          options={photoSizeRatioOptions}
          onChange={(photoSizeRatio) =>
            updatePersonalPreferences({ photoSizeRatio })
          }
          icon={<Maximize2 size={12} />}
          disabled={!sectionPreferences.personal.showPhoto}
        />
        <SegmentedControl
          label='链接样式'
          value={sectionPreferences.personal.linkStyle}
          options={linkStyleOptions}
          onChange={(linkStyle) => updatePersonalPreferences({ linkStyle })}
          icon={<Link2 size={12} />}
        />
        <ToggleControl
          label='显示名称'
          checked={sectionPreferences.personal.showLinkLabels}
          onChange={(showLinkLabels) =>
            updatePersonalPreferences({ showLinkLabels })
          }
          icon={<Tags size={12} />}
        />
      </div>
    </PanelBlock>
  )

  const renderSectionPreferenceControls = (key: StandardSectionKey) => {
    switch (key) {
      case 'skills':
        return null
      case 'experience':
        return (
          <>
            <ToggleControl
              label='时间'
              checked={sectionPreferences.experience.showDates}
              onChange={(showDates) =>
                updateSectionPreferences('experience', { showDates })
              }
              icon={<Calendar size={12} />}
            />
            <SegmentedControl
              label='时间位置'
              value={sectionPreferences.experience.datePosition}
              options={datePositionOptions}
              onChange={(datePosition) =>
                updateSectionPreferences('experience', { datePosition })
              }
              disabled={!sectionPreferences.experience.showDates}
            />
            <ToggleControl
              label='职位'
              checked={sectionPreferences.experience.showRole}
              onChange={(showRole) =>
                updateSectionPreferences('experience', { showRole })
              }
            />
            <SegmentedControl
              label='职位位置'
              value={sectionPreferences.experience.rolePosition}
              options={rolePositionOptions}
              onChange={(rolePosition) =>
                updateSectionPreferences('experience', { rolePosition })
              }
              disabled={!sectionPreferences.experience.showRole}
            />
          </>
        )
      case 'projects':
        return (
          <>
            <ToggleControl
              label='时间'
              checked={sectionPreferences.projects.showDates}
              onChange={(showDates) =>
                updateSectionPreferences('projects', { showDates })
              }
              icon={<Calendar size={12} />}
            />
            <SegmentedControl
              label='时间位置'
              value={sectionPreferences.projects.datePosition}
              options={datePositionOptions}
              onChange={(datePosition) =>
                updateSectionPreferences('projects', { datePosition })
              }
              disabled={!sectionPreferences.projects.showDates}
            />
            <ToggleControl
              label='职责'
              checked={sectionPreferences.projects.showRole}
              onChange={(showRole) =>
                updateSectionPreferences('projects', { showRole })
              }
              icon={<BriefcaseBusiness size={12} />}
            />
            <SegmentedControl
              label='职责位置'
              value={sectionPreferences.projects.rolePosition}
              options={rolePositionOptions}
              onChange={(rolePosition) =>
                updateSectionPreferences('projects', { rolePosition })
              }
              disabled={!sectionPreferences.projects.showRole}
            />
            <ToggleControl
              label='标签'
              checked={sectionPreferences.projects.showTags}
              onChange={(showTags) =>
                updateSectionPreferences('projects', { showTags })
              }
              icon={<Tags size={12} />}
            />
            <SegmentedControl
              label='标签位置'
              value={sectionPreferences.projects.tagPosition}
              options={projectTagOptions}
              onChange={(tagPosition) =>
                updateSectionPreferences('projects', { tagPosition })
              }
              icon={<Tags size={12} />}
              disabled={!sectionPreferences.projects.showTags}
            />
            <SegmentedControl
              label='标签样式'
              value={sectionPreferences.projects.tagStyle}
              options={projectTagStyleOptions}
              onChange={(tagStyle) =>
                updateSectionPreferences('projects', { tagStyle })
              }
              icon={<Tags size={12} />}
              disabled={!sectionPreferences.projects.showTags}
            />
            <SegmentedControl
              label='链接位置'
              value={sectionPreferences.projects.linksPosition}
              options={projectLinksOptions}
              onChange={(linksPosition) =>
                updateSectionPreferences('projects', { linksPosition })
              }
              icon={<Link2 size={12} />}
            />
            <SegmentedControl
              label='显示为'
              value={sectionPreferences.projects.linksDisplay}
              options={projectLinksDisplayOptions}
              onChange={(linksDisplay) =>
                updateSectionPreferences('projects', { linksDisplay })
              }
              icon={<Link2 size={12} />}
            />
            <ToggleControl
              label='下划线'
              checked={sectionPreferences.projects.showLinkUnderline}
              onChange={(showLinkUnderline) =>
                updateSectionPreferences('projects', { showLinkUnderline })
              }
              icon={<Link2 size={12} />}
            />
            <ToggleControl
              label='图标'
              checked={sectionPreferences.projects.showLinkIcons}
              onChange={(showLinkIcons) =>
                updateSectionPreferences('projects', { showLinkIcons })
              }
              icon={<Link2 size={12} />}
            />
          </>
        )
      case 'education':
        return (
          <ToggleControl
            label='时间'
            checked={sectionPreferences.education.showDates}
            onChange={(showDates) =>
              updateSectionPreferences('education', { showDates })
            }
            icon={<Calendar size={12} />}
          />
        )
      case 'awards':
      case 'campus':
      case 'other':
        return null
    }
  }

  const renderDisplaySettings = () => {
    if (activeSection === 'personal') return renderPersonalDisplaySettings()
    if (isCustomSectionKey(activeSection)) return null

    const controls = renderSectionPreferenceControls(activeSection)
    if (!controls) return null

    return (
      <PanelBlock title='显示设置'>
        <div className='space-y-2'>{controls}</div>
      </PanelBlock>
    )
  }

  const renderSkillsEditor = () => (
    <PanelBlock title={getSectionTitle('skills')}>
      <AutoResizeTextarea
        className={`${inputClass} min-h-56 font-mono`}
        value={getSkillsText()}
        onChange={(event) => updateSkillsText(event.target.value)}
        placeholder={
          '- 熟悉 HTML、CSS、JavaScript / TypeScript\n- 熟练使用 React、Vue、Vite 等前端技术栈\n- 了解性能优化、工程化和自动化部署'
        }
      />
      {data.skills.length === 0 && (
        <p className='mt-2 text-xs text-slate-400'>
          清空内容后「专业技能」区块将不在简历中显示
        </p>
      )}
    </PanelBlock>
  )

  const renderExperienceEditor = () => (
    <PanelBlock
      title={getSectionTitle('experience')}
      action={
        <AddButton
          title='添加工作经历'
          onClick={() =>
            addItem<Experience>('experience', {
              company: '新公司',
              role: '职位',
              date: '时间',
              details: '',
            })
          }
        />
      }
    >
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleItemsDragEnd(data.experience, 'experience')}
      >
        <SortableContext
          items={data.experience.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-3'>
            {data.experience.map((experience, index) => (
              <SortableItemWithHandle key={experience.id} id={experience.id}>
                {(dragHandle) => (
                  <div className='group border-t border-slate-100 px-1 py-3 first:border-t-0'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <div className='flex min-w-0 items-center gap-1'>
                        <DragHandle {...dragHandle} />
                        <span className='min-w-0 truncate text-xs font-medium text-slate-400'>
                          {experience.company || `经历 ${index + 1}`}
                        </span>
                      </div>
                      <ItemActions
                        index={index}
                        total={data.experience.length}
                        onMove={(direction) =>
                          moveExperienceItem(index, direction)
                        }
                        onRemove={() => removeItem('experience', experience.id)}
                      />
                    </div>
                    <div className='sm:pl-8'>
                      <InputGroup
                        label='公司'
                        value={experience.company}
                        onChange={(value) =>
                          updateArrayItem<Experience>(
                            'experience',
                            experience.id,
                            'company',
                            value,
                          )
                        }
                      />
                      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        <InputGroup
                          label='职位'
                          value={experience.role}
                          onChange={(value) =>
                            updateArrayItem<Experience>(
                              'experience',
                              experience.id,
                              'role',
                              value,
                            )
                          }
                        />
                        <InputGroup
                          label='时间'
                          value={experience.date}
                          onChange={(value) =>
                            updateArrayItem<Experience>(
                              'experience',
                              experience.id,
                              'date',
                              value,
                            )
                          }
                        />
                      </div>
                      <InputGroup
                        type='textarea'
                        label='详情'
                        value={experience.details}
                        onChange={(value) =>
                          updateArrayItem<Experience>(
                            'experience',
                            experience.id,
                            'details',
                            value,
                          )
                        }
                        placeholder={'- 主导核心模块重构\n普通补充说明'}
                      />
                    </div>
                  </div>
                )}
              </SortableItemWithHandle>
            ))}
            {data.experience.length === 0 && (
              <EmptyState
                text='暂无工作经历'
                action={
                  <AddButton
                    title='添加工作经历'
                    onClick={() =>
                      addItem<Experience>('experience', {
                        company: '新公司',
                        role: '职位',
                        date: '时间',
                        details: '',
                      })
                    }
                  />
                }
              />
            )}
          </div>
        </SortableContext>
      </DndContext>
    </PanelBlock>
  )

  const renderProjectsEditor = () => (
    <PanelBlock
      title={getSectionTitle('projects')}
      action={
        <AddButton
          title='添加项目'
          onClick={() =>
            addItem<Project>('projects', {
              name: '新项目',
              role: '',
              date: '',
              tags: '',
              link: '',
              source: '',
              description: '',
            })
          }
        />
      }
    >
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleItemsDragEnd(data.projects, 'projects')}
      >
        <SortableContext
          items={data.projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-3'>
            {data.projects.map((project, index) => (
              <SortableItemWithHandle key={project.id} id={project.id}>
                {(dragHandle) => (
                  <div className='group border-t border-slate-100 px-1 py-3 first:border-t-0'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <div className='flex min-w-0 items-center gap-1'>
                        <DragHandle {...dragHandle} />
                        <span className='min-w-0 truncate text-xs font-medium text-slate-400'>
                          {project.name || `项目 ${index + 1}`}
                        </span>
                      </div>
                      <ItemActions
                        index={index}
                        total={data.projects.length}
                        onMove={(direction) =>
                          moveProjectItem(index, direction)
                        }
                        onRemove={() => removeItem('projects', project.id)}
                      />
                    </div>
                    <div className='sm:pl-8'>
                      <InputGroup
                        label='项目名'
                        value={project.name}
                        onChange={(value) =>
                          updateArrayItem<Project>(
                            'projects',
                            project.id,
                            'name',
                            value,
                          )
                        }
                      />
                      <InputGroup
                        label='职责'
                        value={project.role}
                        onChange={(value) =>
                          updateArrayItem<Project>(
                            'projects',
                            project.id,
                            'role',
                            value,
                          )
                        }
                        placeholder='例：前端负责人'
                      />
                      <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]'>
                        <InputGroup
                          label='技术标签'
                          value={project.tags}
                          onChange={(value) =>
                            updateArrayItem<Project>(
                              'projects',
                              project.id,
                              'tags',
                              value,
                            )
                          }
                        />
                        <InputGroup
                          label='时间'
                          value={project.date}
                          onChange={(value) =>
                            updateArrayItem<Project>(
                              'projects',
                              project.id,
                              'date',
                              value,
                            )
                          }
                          placeholder='例：2024.03'
                        />
                      </div>
                      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        <InputGroup
                          label='Demo'
                          value={project.link}
                          onChange={(value) =>
                            updateArrayItem<Project>(
                              'projects',
                              project.id,
                              'link',
                              value,
                            )
                          }
                          placeholder='不带 https://'
                        />
                        <InputGroup
                          label='源码'
                          value={project.source}
                          onChange={(value) =>
                            updateArrayItem<Project>(
                              'projects',
                              project.id,
                              'source',
                              value,
                            )
                          }
                          placeholder='不带 https://'
                        />
                      </div>
                      <InputGroup
                        type='textarea'
                        label='描述'
                        value={project.description}
                        onChange={(value) =>
                          updateArrayItem<Project>(
                            'projects',
                            project.id,
                            'description',
                            value,
                          )
                        }
                        placeholder={'- 完成核心功能设计与落地\n普通补充说明'}
                      />
                    </div>
                  </div>
                )}
              </SortableItemWithHandle>
            ))}
            {data.projects.length === 0 && (
              <EmptyState
                text='暂无项目经历'
                action={
                  <AddButton
                    title='添加项目'
                    onClick={() =>
                      addItem<Project>('projects', {
                        name: '新项目',
                        role: '',
                        date: '',
                        tags: '',
                        link: '',
                        source: '',
                        description: '',
                      })
                    }
                  />
                }
              />
            )}
          </div>
        </SortableContext>
      </DndContext>
    </PanelBlock>
  )

  const renderEducationEditor = () => (
    <PanelBlock
      title={getSectionTitle('education')}
      action={<AddButton title='添加教育经历' onClick={addEducation} />}
    >
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleItemsDragEnd(data.education, 'education')}
      >
        <SortableContext
          items={data.education.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-3'>
            {data.education.map((education, index) => (
              <SortableItemWithHandle key={education.id} id={education.id}>
                {(dragHandle) => (
                  <div className='group border-t border-slate-100 px-1 py-3 first:border-t-0'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <div className='flex min-w-0 items-center gap-1'>
                        <DragHandle {...dragHandle} />
                        <span className='min-w-0 truncate text-xs font-medium text-slate-400'>
                          {education.school || `教育 ${index + 1}`}
                        </span>
                      </div>
                      <ItemActions
                        index={index}
                        total={data.education.length}
                        onMove={(direction) =>
                          moveEducationItem(index, direction)
                        }
                        onRemove={() => removeEducation(education.id)}
                      />
                    </div>
                    <div className='sm:pl-8'>
                      <InputGroup
                        label='学校'
                        value={education.school}
                        onChange={(value) =>
                          updateEducation(education.id, 'school', value)
                        }
                      />
                      <InputGroup
                        label='学位'
                        value={education.degree}
                        onChange={(value) =>
                          updateEducation(education.id, 'degree', value)
                        }
                      />
                      <InputGroup
                        label='时间'
                        value={education.date}
                        onChange={(value) =>
                          updateEducation(education.id, 'date', value)
                        }
                      />
                    </div>
                  </div>
                )}
              </SortableItemWithHandle>
            ))}
            {data.education.length === 0 && (
              <EmptyState
                text='暂无教育经历'
                action={
                  <AddButton title='添加教育经历' onClick={addEducation} />
                }
              />
            )}
          </div>
        </SortableContext>
      </DndContext>
    </PanelBlock>
  )

  const renderSectionEntryEditor = ({
    section,
    addTitle,
    emptyText,
    titleLabel,
    subtitleLabel,
    titlePlaceholder,
    subtitlePlaceholder,
    addTemplate,
  }: {
    section: 'awards' | 'campus'
    addTitle: string
    emptyText: string
    titleLabel: string
    subtitleLabel: string
    titlePlaceholder: string
    subtitlePlaceholder: string
    addTemplate: Omit<SectionEntry, 'id'>
  }) => {
    const items = data[section]

    return (
      <PanelBlock
        title={getSectionTitle(section)}
        action={
          <AddButton
            title={addTitle}
            onClick={() => addSectionEntry(section, addTemplate)}
          />
        }
      >
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemsDragEnd(items, section)}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-3'>
              {items.map((item, index) => (
                <SortableItemWithHandle key={item.id} id={item.id}>
                  {(dragHandle) => (
                    <div className='group border-t border-slate-100 px-1 py-3 first:border-t-0'>
                      <div className='mb-2 flex items-center justify-between gap-2'>
                        <div className='flex min-w-0 items-center gap-1'>
                          <DragHandle {...dragHandle} />
                          <span className='min-w-0 truncate text-xs font-medium text-slate-400'>
                            {item.title ||
                              `${getSectionTitle(section)} ${index + 1}`}
                          </span>
                        </div>
                        <ItemActions
                          index={index}
                          total={items.length}
                          onMove={(direction) =>
                            moveSectionEntry(section, index, direction)
                          }
                          onRemove={() => removeSectionEntry(section, item.id)}
                        />
                      </div>
                      <div className='sm:pl-8'>
                        <InputGroup
                          label={titleLabel}
                          value={item.title}
                          onChange={(value) =>
                            updateSectionEntry(section, item.id, 'title', value)
                          }
                          placeholder={titlePlaceholder}
                        />
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]'>
                          <InputGroup
                            label={subtitleLabel}
                            value={item.subtitle}
                            onChange={(value) =>
                              updateSectionEntry(
                                section,
                                item.id,
                                'subtitle',
                                value,
                              )
                            }
                            placeholder={subtitlePlaceholder}
                          />
                          <InputGroup
                            label='时间'
                            value={item.date}
                            onChange={(value) =>
                              updateSectionEntry(
                                section,
                                item.id,
                                'date',
                                value,
                              )
                            }
                            placeholder='例：2024.06'
                          />
                        </div>
                        <InputGroup
                          type='textarea'
                          label='详情'
                          value={item.details}
                          onChange={(value) =>
                            updateSectionEntry(
                              section,
                              item.id,
                              'details',
                              value,
                            )
                          }
                          placeholder={'- 负责组织协调与项目交付\n普通补充说明'}
                        />
                      </div>
                    </div>
                  )}
                </SortableItemWithHandle>
              ))}
              {items.length === 0 && (
                <EmptyState
                  text={emptyText}
                  action={
                    <AddButton
                      title={addTitle}
                      onClick={() => addSectionEntry(section, addTemplate)}
                    />
                  }
                />
              )}
            </div>
          </SortableContext>
        </DndContext>
      </PanelBlock>
    )
  }

  const renderAwardsEditor = () =>
    renderSectionEntryEditor({
      section: 'awards',
      addTitle: '添加奖项',
      emptyText: '暂无获奖经历',
      titleLabel: '奖项',
      subtitleLabel: '颁发方',
      titlePlaceholder: '例：优秀毕业设计',
      subtitlePlaceholder: '例：学校 / 赛事组委会',
      addTemplate: {
        title: '新奖项',
        subtitle: '颁发方',
        date: '时间',
        details: '',
      },
    })

  const renderCampusEditor = () =>
    renderSectionEntryEditor({
      section: 'campus',
      addTitle: '添加校园经历',
      emptyText: '暂无校园经历',
      titleLabel: '组织 / 活动',
      subtitleLabel: '角色',
      titlePlaceholder: '例：校学生会 / 创新实验室',
      subtitlePlaceholder: '例：负责人',
      addTemplate: {
        title: '新校园经历',
        subtitle: '角色',
        date: '时间',
        details: '',
      },
    })

  const renderOtherEditor = () => (
    <PanelBlock title={getSectionTitle('other')}>
      <AutoResizeTextarea
        className={`${inputClass} min-h-40 font-mono`}
        value={data.other}
        onChange={(event) => onChange({ ...data, other: event.target.value })}
        placeholder={
          '- **开源项目**：维护 [my-project](https://github.com/yourname/project)\n- **工具链**：Vercel、Cloudflare Pages'
        }
      />
      {data.other.trim() === '' && (
        <p className='mt-2 text-xs text-slate-400'>
          清空内容后「自我评价」区块将不在简历中显示
        </p>
      )}
    </PanelBlock>
  )

  const renderCustomSectionEditor = (key: CustomSectionKey) => {
    const section = getCustomSection(key)

    return (
      <PanelBlock title={getSectionTitle(key)}>
        <AutoResizeTextarea
          className={`${inputClass} min-h-40 font-mono`}
          value={section?.content ?? ''}
          onChange={(event) =>
            updateCustomSectionContent(key, event.target.value)
          }
          placeholder={
            '- 开源贡献：维护 [my-project](https://github.com/yourname/project)\n个人博客：yourname.dev'
          }
        />
        {!section?.content.trim() && (
          <p className='mt-2 text-xs text-slate-400'>
            清空内容后该区块不会在简历中显示
          </p>
        )}
      </PanelBlock>
    )
  }

  const renderActiveSectionEditor = () => {
    if (isCustomSectionKey(activeSection)) {
      return renderCustomSectionEditor(activeSection)
    }

    switch (activeSection) {
      case 'personal':
        return renderPersonalPanel()
      case 'skills':
        return renderSkillsEditor()
      case 'experience':
        return renderExperienceEditor()
      case 'projects':
        return renderProjectsEditor()
      case 'education':
        return renderEducationEditor()
      case 'awards':
        return renderAwardsEditor()
      case 'campus':
        return renderCampusEditor()
      case 'other':
        return renderOtherEditor()
    }
  }

  if (panel === 'structure') return renderStructurePanel()
  const activeSectionSummary = getActiveSectionSummary()

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='shrink-0 border-b border-slate-200 px-4 py-3'>
        <div className='flex items-center gap-2'>
          <span className='flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600'>
            {getActiveSectionIcon()}
          </span>
          <div className='min-w-0 flex-1'>
            <h2 className='truncate text-sm font-bold text-slate-800'>
              {getActiveSectionTitle()}
            </h2>
            {activeSectionSummary && (
              <p className='text-xs text-slate-400'>{activeSectionSummary}</p>
            )}
          </div>
        </div>
      </div>
      <div
        ref={detailsScrollRef}
        className='min-h-0 flex-1 overflow-y-auto custom-scrollbar'
      >
        {renderSectionSettings()}
        {renderDisplaySettings()}
        {renderActiveSectionEditor()}
      </div>
    </div>
  )
}

export default ResumeEditor
