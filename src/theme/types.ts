import type { DateStyle } from '../model/dates'
import type { SectionKind } from '../model/types'

export type FontId = 'sans' | 'serif' | 'humanist' | 'rounded' | 'mono' | 'kai'
export type ThemeLayout =
  | 'single'
  | 'aside-left'
  | 'aside-right'
  | 'side-headings'
export type HeaderAlign = 'left' | 'center' | 'split'
export type HeadingStyle = 'rule' | 'underline' | 'bar' | 'band' | 'plain'
export type DatePlacement = 'right' | 'below' | 'gutter'
export type BulletStyle = 'dot' | 'dash' | 'square' | 'none'
export type SkillsStyle = 'rows' | 'inline' | 'tags'
export type PageSize = 'A4' | 'Letter'

export interface Theme {
  /** 来源预设 id；用户改过任意参数后仍保留，用于「恢复预设」 */
  preset: string
  name: string
  layout: ThemeLayout
  /** 双栏版式下放入侧栏的区块类型 */
  aside: SectionKind[]
  header: {
    align: HeaderAlign
    photo: 'none' | 'circle' | 'rounded'
    contacts: 'inline' | 'stacked'
  }
  heading: { style: HeadingStyle; caps: boolean }
  entry: {
    date: DatePlacement
    /** 副标题（职位 / 专业）与主标题同行还是另起一行 */
    sub: 'inline' | 'below'
    timeline: boolean
  }
  bullet: BulletStyle
  skills: SkillsStyle
  font: {
    body: FontId
    heading: FontId
    /** 正文字号，单位 pt */
    size: number
    leading: number
    /** 姓名字号相对正文的倍数 */
    name: number
    /** 区块标题字号相对正文的倍数 */
    title: number
  }
  color: {
    accent: string
    ink: string
    muted: string
    rule: string
    aside: string
    onName: boolean
    onHeadings: boolean
    onLinks: boolean
    onRules: boolean
  }
  space: {
    /** 页边距 mm */
    margin: number
    /** 区块间距 em */
    section: number
    /** 条目间距 em */
    entry: number
  }
  page: PageSize
  date: { style: DateStyle; present: string }
}
