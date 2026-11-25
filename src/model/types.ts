import type { Theme } from '../theme/types'

export const SCHEMA = 3 as const

export type Locale = 'zh' | 'en'

export type ContactKind =
  | 'email'
  | 'phone'
  | 'location'
  | 'website'
  | 'github'
  | 'linkedin'
  | 'wechat'
  | 'text'

export interface Contact {
  id: string
  kind: ContactKind
  value: string
}

export interface Profile {
  name: string
  headline: string
  photo: string
  contacts: Contact[]
}

/** kind 只影响写作建议与默认文案；渲染只看 layout。 */
export type SectionKind =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'awards'
  | 'activities'
  | 'publications'
  | 'custom'

export type SectionLayout = 'entries' | 'rows' | 'text'

export interface Item {
  id: string
  /** entries：职位 / 项目名 / 学校；rows：标签（如「语言」） */
  title: string
  /** entries：公司 / 角色 / 学位 */
  subtitle: string
  location: string
  start: string
  end: string
  links: string[]
  /** 技术栈、关键词，逗号分隔 */
  tags: string
  /** entries：一句话描述；rows：内容；text：段落 */
  text: string
  bullets: string[]
  hidden?: boolean
}

export interface Section {
  id: string
  kind: SectionKind
  title: string
  layout: SectionLayout
  hidden?: boolean
  items: Item[]
}

export interface ResumeDoc {
  id: string
  schema: typeof SCHEMA
  name: string
  tags: string[]
  createdAt: string
  updatedAt: string
  locale: Locale
  profile: Profile
  sections: Section[]
  theme: Theme
  dismissed: string[]
  /** 岗位定制信息：派生版本与 JD 匹配 */
  target?: Target
}

export interface Target {
  /** 派生自哪份简历（可能已被删除） */
  baseId: string
  role: string
  company: string
  /** 岗位描述原文，只保存在本机 */
  jd: string
}

/** 版本快照：某一时刻的完整文档 */
export interface Snapshot {
  id: string
  docId: string
  label: string
  /** 自动快照会被定期清理，手动快照永久保留 */
  auto: boolean
  /** 导出 PDF 时留的底：修改标记可以以它为基准；每份简历只保留最新一份 */
  exported?: boolean
  createdAt: string
  doc: ResumeDoc
}
