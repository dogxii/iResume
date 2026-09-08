import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SectionIconName } from '../types/resume'
import { fullLucideIconNames } from './fullLucideIconLibrary'
import {
  getSectionIconLabel,
  SectionIconGlyph,
  sectionIconOptions,
  toSectionIconName,
} from './resumeSectionIcons'

const PAGE_SIZE = 72

const searchableIconNames = [...new Set(fullLucideIconNames)].sort()

const chineseSearchAliases: Record<string, string[]> = {
  人: ['User', 'Users', 'Contact', 'IdCard', 'CircleUserRound'],
  用户: ['User', 'Users', 'Contact', 'IdCard', 'CircleUserRound'],
  团队: ['Users', 'UserRound', 'Handshake', 'HeartHandshake'],
  工作: ['Briefcase', 'Building2', 'Badge', 'Handshake'],
  项目: ['Folder', 'FolderGit2', 'Kanban', 'ListTodo'],
  教育: ['GraduationCap', 'School', 'BookOpen', 'Library'],
  奖项: ['Award', 'Trophy', 'Medal', 'Badge'],
  奖杯: ['Trophy', 'Award', 'Medal'],
  技能: ['Wrench', 'Code', 'Braces', 'Settings2', 'Terminal'],
  代码: ['Code', 'CodeXml', 'Braces', 'Terminal', 'Github'],
  设计: ['Palette', 'PenTool', 'Figma', 'WandSparkles'],
  联系: ['Mail', 'Phone', 'MapPin', 'Link', 'Globe'],
  社交: ['Linkedin', 'Github', 'Twitter', 'Instagram', 'MessageCircle'],
  星标: ['Star', 'Sparkles', 'BadgeCheck'],
  成长: ['Rocket', 'TrendingUp', 'Sprout', 'ChartNoAxesCombined'],
}

interface SectionIconLibraryDialogProps {
  selected: SectionIconName
  onSelect: (name: SectionIconName) => void
  onClose: () => void
}

const SectionIconLibraryDialog = ({
  selected,
  onSelect,
  onClose,
}: SectionIconLibraryDialogProps) => {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const matchingIconNames = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) {
      return showAll
        ? searchableIconNames
        : sectionIconOptions.map((option) => option.value)
    }

    const aliases = Object.entries(chineseSearchAliases)
      .filter(([alias]) => alias.includes(keyword))
      .flatMap(([, names]) => names)
    const matched = searchableIconNames.filter((name) =>
      name.toLowerCase().includes(keyword)
    )
    return [...new Set([...matched, ...aliases])].filter((name) =>
      searchableIconNames.includes(name as (typeof fullLucideIconNames)[number])
    )
  }, [query, showAll])

  const visibleIcons = matchingIconNames.slice(0, visibleCount)
  const hasMore = visibleIcons.length < matchingIconNames.length
  const isSearching = query.trim().length > 0

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setVisibleCount(PAGE_SIZE)
  }

  return createPortal(
    <div
      className='fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/25 p-3 backdrop-blur-[2px] sm:p-6'
      onMouseDown={onClose}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='section-icon-library-title'
        className='flex max-h-[min(720px,calc(100dvh-1.5rem))] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className='flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5 sm:px-5'>
          <h2
            id='section-icon-library-title'
            className='text-sm font-semibold text-slate-900'
          >
            选择 Lucide 图标
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
            aria-label='关闭图标库'
          >
            <X size={16} aria-hidden='true' />
          </button>
        </header>

        <div className='border-b border-slate-100 px-4 py-3 sm:px-5'>
          <label className='relative block'>
            <span className='sr-only'>搜索 Lucide 图标</span>
            <Search
              size={16}
              className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
              aria-hidden='true'
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              className='h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100'
              placeholder='例如：briefcase、github、用户、奖杯'
            />
          </label>
          <div className='mt-2 flex items-center justify-between gap-3 text-xs text-slate-400'>
            <span>
              {isSearching
                ? `找到 ${matchingIconNames.length} 个图标`
                : showAll
                  ? `浏览全部 ${searchableIconNames.length} 个图标`
                  : `常用 ${sectionIconOptions.length} 个图标`}
            </span>
            {!isSearching && !showAll && (
              <button
                type='button'
                onClick={() => {
                  setShowAll(true)
                  setVisibleCount(PAGE_SIZE)
                }}
                className='font-medium text-blue-600 transition hover:text-blue-700'
              >
                浏览全部
              </button>
            )}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar'>
          {visibleIcons.length > 0 ? (
            <div className='grid grid-cols-4 gap-1.5 sm:grid-cols-7 md:grid-cols-8'>
              {visibleIcons.map((iconName) => {
                const value = toSectionIconName(iconName)
                const active = value === selected
                return (
                  <button
                    key={iconName}
                    type='button'
                    onClick={() => {
                      onSelect(value)
                      onClose()
                    }}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[10px] transition ${
                      active
                        ? 'border-blue-200 bg-blue-50 text-blue-600'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                    aria-pressed={active}
                    title={`选择 ${getSectionIconLabel(value)} 图标`}
                  >
                    <SectionIconGlyph name={value} size={20} />
                    <span className='w-full truncate text-center'>
                      {getSectionIconLabel(value)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className='flex min-h-48 items-center justify-center text-sm text-slate-400'>
              没有匹配的图标，试试英文名称，例如 “calendar”。
            </div>
          )}

          {hasMore && (
            <button
              type='button'
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className='mx-auto mt-4 flex h-9 items-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'
            >
              显示更多（还有 {matchingIconNames.length - visibleIcons.length}{' '}
              个）
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body
  )
}

export default SectionIconLibraryDialog
