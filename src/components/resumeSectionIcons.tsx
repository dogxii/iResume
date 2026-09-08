import {
  Award,
  BookOpen,
  Briefcase,
  Code,
  FileText,
  Folder,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  type LucideIcon,
  Medal,
  Rocket,
  School,
  Star,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react'
import { lazy, Suspense } from 'react'
import {
  getDefaultSectionIconNames,
  isCustomSectionKey,
} from '../data/resumeData'
import type {
  PresetSectionIconName,
  SectionIconName,
  SectionIconSelection,
  SectionKey,
} from '../types/resume'
import { LUCIDE_ICON_NAME_PREFIX } from '../types/resume'

const sectionIconComponents: Record<PresetSectionIconName, LucideIcon> = {
  code: Code,
  briefcase: Briefcase,
  folder: Folder,
  'graduation-cap': GraduationCap,
  award: Award,
  school: School,
  'file-text': FileText,
  wrench: Wrench,
  'book-open': BookOpen,
  rocket: Rocket,
  lightbulb: Lightbulb,
  users: Users,
  'heart-handshake': HeartHandshake,
  trophy: Trophy,
  medal: Medal,
  star: Star,
}

const presetSectionIconNameByLucideName: Record<string, PresetSectionIconName> =
  {
    Code: 'code',
    Briefcase: 'briefcase',
    Folder: 'folder',
    GraduationCap: 'graduation-cap',
    Award: 'award',
    School: 'school',
    FileText: 'file-text',
    Wrench: 'wrench',
    BookOpen: 'book-open',
    Rocket: 'rocket',
    Lightbulb: 'lightbulb',
    Users: 'users',
    HeartHandshake: 'heart-handshake',
    Trophy: 'trophy',
    Medal: 'medal',
    Star: 'star',
  }

export const sectionIconOptions: {
  value: PresetSectionIconName
  label: string
}[] = [
  { value: 'code', label: '代码' },
  { value: 'briefcase', label: '工作' },
  { value: 'folder', label: '项目' },
  { value: 'graduation-cap', label: '教育' },
  { value: 'award', label: '获奖' },
  { value: 'school', label: '校园' },
  { value: 'file-text', label: '文档' },
  { value: 'wrench', label: '工具' },
  { value: 'book-open', label: '书籍' },
  { value: 'rocket', label: '成长' },
  { value: 'lightbulb', label: '创意' },
  { value: 'users', label: '团队' },
  { value: 'heart-handshake', label: '协作' },
  { value: 'trophy', label: '奖杯' },
  { value: 'medal', label: '奖牌' },
  { value: 'star', label: '星标' },
]

const FullLucideIcon = lazy(async () => {
  const { FullLucideIcon: Icon } = await import('./fullLucideIconLibrary')
  return { default: Icon }
})

const isPresetSectionIconName = (
  name: SectionIconName
): name is PresetSectionIconName => name in sectionIconComponents

export const getFullLucideIconName = (name: SectionIconName) =>
  name.startsWith(LUCIDE_ICON_NAME_PREFIX)
    ? name.slice(LUCIDE_ICON_NAME_PREFIX.length)
    : null

export const toSectionIconName = (name: string): SectionIconName =>
  presetSectionIconNameByLucideName[name] ??
  (name in sectionIconComponents
    ? (name as PresetSectionIconName)
    : `${LUCIDE_ICON_NAME_PREFIX}${name}`)

export const getSectionIconLabel = (name: SectionIconName) => {
  const preset = sectionIconOptions.find((option) => option.value === name)
  if (preset) return preset.label

  const fullIconName = getFullLucideIconName(name)
  return fullIconName
    ? fullIconName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    : '文档'
}

export const SectionIconGlyph = ({
  name,
  size = 13,
  className,
}: {
  name: SectionIconName
  size?: number
  className?: string
}) => {
  if (isPresetSectionIconName(name)) {
    const Icon = sectionIconComponents[name]
    return (
      <Icon
        size={size}
        strokeWidth={1.8}
        className={className}
        aria-hidden='true'
      />
    )
  }

  const fullIconName = getFullLucideIconName(name)
  if (!fullIconName)
    return <FileText size={size} className={className} aria-hidden='true' />

  return (
    <Suspense
      fallback={
        <FileText size={size} className={className} aria-hidden='true' />
      }
    >
      <FullLucideIcon
        name={fullIconName}
        size={size}
        strokeWidth={1.8}
        className={className}
        aria-hidden='true'
      />
    </Suspense>
  )
}

export const getSectionIconName = (
  key: SectionKey,
  iconNames?: SectionIconSelection
): SectionIconName => {
  if (isCustomSectionKey(key)) return iconNames?.[key] ?? 'file-text'
  return iconNames?.[key] ?? getDefaultSectionIconNames()[key]
}

export const getResumeSectionIcon = (
  key: SectionKey,
  iconNames?: SectionIconSelection,
  size = 13
) => {
  return (
    <SectionIconGlyph name={getSectionIconName(key, iconNames)} size={size} />
  )
}
