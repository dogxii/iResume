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
import {
  getDefaultSectionIconNames,
  isCustomSectionKey,
} from '../data/resumeData'
import type {
  SectionIconName,
  SectionIconSelection,
  SectionKey,
} from '../types/resume'

const sectionIconComponents: Record<SectionIconName, LucideIcon> = {
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

export const sectionIconOptions: {
  value: SectionIconName
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

export const getSectionIconComponent = (name: SectionIconName) =>
  sectionIconComponents[name]

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
  const Icon = getSectionIconComponent(getSectionIconName(key, iconNames))
  return <Icon size={size} strokeWidth={1.8} aria-hidden='true' />
}
