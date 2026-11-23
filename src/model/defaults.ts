import { DEFAULT_THEME } from '../theme/presets'
import type { Theme } from '../theme/types'
import { uid } from './ids'
import {
  type Contact,
  type ContactKind,
  type Item,
  type Locale,
  type ResumeDoc,
  SCHEMA,
  type Section,
  type SectionKind,
  type SectionLayout,
} from './types'

export const KIND_META: Record<
  SectionKind,
  { zh: string; en: string; layout: SectionLayout; hint: string }
> = {
  summary: {
    zh: '个人简介',
    en: 'Summary',
    layout: 'text',
    hint: '两三句话说明你是谁、擅长什么、想做什么',
  },
  experience: {
    zh: '工作经历',
    en: 'Experience',
    layout: 'entries',
    hint: '倒序排列，每段 3–5 条要点',
  },
  projects: {
    zh: '项目经历',
    en: 'Projects',
    layout: 'entries',
    hint: '写清你的角色和可衡量的结果',
  },
  education: {
    zh: '教育背景',
    en: 'Education',
    layout: 'entries',
    hint: '学校、专业、学位与时间',
  },
  skills: {
    zh: '专业技能',
    en: 'Skills',
    layout: 'rows',
    hint: '按类别分组，只写真正熟练的',
  },
  awards: {
    zh: '荣誉奖项',
    en: 'Awards',
    layout: 'entries',
    hint: '只保留与岗位相关、含金量高的',
  },
  activities: {
    zh: '校园经历',
    en: 'Activities',
    layout: 'entries',
    hint: '社团、志愿、竞赛等',
  },
  publications: {
    zh: '论文发表',
    en: 'Publications',
    layout: 'entries',
    hint: '作者、题目、会议 / 期刊',
  },
  custom: { zh: '自定义', en: 'Section', layout: 'entries', hint: '' },
}

export const ADDABLE_KINDS: SectionKind[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'awards',
  'activities',
  'publications',
  'custom',
]

export const CONTACT_META: Record<
  ContactKind,
  { label: string; placeholder: string }
> = {
  email: { label: '邮箱', placeholder: 'name@example.com' },
  phone: { label: '电话', placeholder: '138 0000 0000' },
  location: { label: '城市', placeholder: '上海' },
  website: { label: '网站', placeholder: 'yourname.dev' },
  github: { label: 'GitHub', placeholder: 'github.com/yourname' },
  linkedin: { label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
  wechat: { label: '微信', placeholder: '微信号' },
  text: { label: '其他', placeholder: '求职意向 / 到岗时间' },
}

/** 根据内容推断联系方式类型 */
export function guessContactKind(value: string): ContactKind {
  const v = value.trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email'
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return 'phone'
  if (v.includes('github.com')) return 'github'
  if (v.includes('linkedin.com')) return 'linkedin'
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return 'website'
  return 'text'
}

export function newItem(patch: Partial<Item> = {}): Item {
  return {
    id: uid('i'),
    title: '',
    subtitle: '',
    location: '',
    start: '',
    end: '',
    links: [],
    tags: '',
    text: '',
    bullets: [],
    ...patch,
  }
}

export function newContact(kind: ContactKind, value = ''): Contact {
  return { id: uid('c'), kind, value }
}

export function newSection(
  kind: SectionKind,
  locale: Locale = 'zh',
  patch: Partial<Section> = {}
): Section {
  const meta = KIND_META[kind]
  const layout = patch.layout ?? meta.layout
  return {
    id: uid('s'),
    kind,
    title: locale === 'en' ? meta.en : meta.zh,
    layout,
    items: [layout === 'entries' ? newItem({ bullets: [''] }) : newItem()],
    ...patch,
  }
}

interface CreateOptions {
  name?: string
  locale?: Locale
  theme?: Theme
  sample?: boolean
}

export function createDoc(options: CreateOptions = {}): ResumeDoc {
  const now = new Date().toISOString()
  const locale = options.locale ?? 'zh'
  const theme = structuredClone(options.theme ?? DEFAULT_THEME)
  if (locale === 'en' && theme.date.present === '至今') {
    theme.date = { style: 'month-en', present: 'Present' }
  }
  const content = options.sample ? sampleContent() : blankContent(locale)
  return {
    id: uid('r'),
    schema: SCHEMA,
    name: options.name ?? (options.sample ? '示例简历' : '未命名简历'),
    tags: [],
    createdAt: now,
    updatedAt: now,
    locale,
    theme,
    dismissed: [],
    ...content,
  }
}

function blankContent(locale: Locale): Pick<ResumeDoc, 'profile' | 'sections'> {
  return {
    profile: {
      name: '',
      headline: '',
      photo: '',
      contacts: [
        newContact('email'),
        newContact('phone'),
        newContact('location'),
      ],
    },
    sections: (['experience', 'projects', 'education', 'skills'] as const).map(
      (kind) => newSection(kind, locale)
    ),
  }
}

/** 示例内容本身就是一份「最佳实践」：动词开头、有数字、每段 2–4 条。 */
function sampleContent(): Pick<ResumeDoc, 'profile' | 'sections'> {
  return {
    profile: {
      name: '林小明',
      headline: '前端工程师 · 3 年经验',
      photo: '',
      contacts: [
        newContact('phone', '138 1234 5678'),
        newContact('email', 'linxiaoming@email.com'),
        newContact('github', 'github.com/linxiaoming'),
        newContact('location', '上海'),
      ],
    },
    sections: [
      newSection('summary', 'zh', {
        items: [
          newItem({
            text: '专注 Web 性能与设计系统的前端工程师。主导过 2 个从 0 到 1 的 B 端产品，习惯用数据衡量体验，乐于沉淀可复用的工程方案。',
          }),
        ],
      }),
      newSection('experience', 'zh', {
        items: [
          newItem({
            title: '星图科技',
            subtitle: '前端工程师 · 数据平台部',
            location: '上海',
            start: '2023.07',
            end: '至今',
            bullets: [
              '主导数据看板重构，首屏时间从 **3.2s 降到 1.1s**，周活跃用户提升 18%',
              '搭建团队组件库（40+ 组件）与设计 token，新页面开发周期缩短约 30%',
              '推动 TypeScript 与单元测试落地，线上缺陷数季度环比下降 42%',
            ],
          }),
          newItem({
            title: '云帆网络',
            subtitle: '前端开发实习生',
            location: '杭州',
            start: '2022.07',
            end: '2022.12',
            bullets: [
              '独立完成运营后台 12 个页面的开发与联调，按期交付率 100%',
              '封装表格筛选与权限组件，被 3 条业务线复用',
            ],
          }),
        ],
      }),
      newSection('projects', 'zh', {
        items: [
          newItem({
            title: 'Lumen 轻量图表库',
            subtitle: '作者 · 开源',
            start: '2024.01',
            end: '至今',
            links: ['github.com/linxiaoming/lumen'],
            tags: 'TypeScript, Canvas, WebGL',
            bullets: [
              '设计声明式图表 API，包体积 **12 KB**（gzip），渲染 10 万点保持 60fps',
              '编写完整文档与示例站点，获 1.2k Star，被 30+ 个项目引用',
            ],
          }),
        ],
      }),
      newSection('education', 'zh', {
        items: [
          newItem({
            title: '南昌大学',
            subtitle: '计算机科学与技术 · 学士',
            start: '2019.09',
            end: '2023.06',
            bullets: ['GPA 3.7/4.0（前 10%），校级一等奖学金'],
          }),
        ],
      }),
      newSection('skills', 'zh', {
        items: [
          newItem({
            title: '语言',
            text: 'TypeScript, JavaScript, HTML/CSS, Node.js',
          }),
          newItem({ title: '框架', text: 'React, Vue 3, Next.js, Vite' }),
          newItem({
            title: '工程',
            text: '性能优化, 设计系统, 单元测试, CI/CD',
          }),
        ],
      }),
    ],
  }
}

/** 复制一份简历：全部 id 重新生成。 */
export function duplicateDoc(doc: ResumeDoc, name?: string): ResumeDoc {
  const now = new Date().toISOString()
  const copy = structuredClone(doc)
  copy.id = uid('r')
  copy.name = name ?? `${doc.name} 副本`
  copy.createdAt = now
  copy.updatedAt = now
  copy.profile.contacts = copy.profile.contacts.map((c) => ({
    ...c,
    id: uid('c'),
  }))
  copy.sections = copy.sections.map((s) => ({
    ...s,
    id: uid('s'),
    items: s.items.map((i) => ({ ...i, id: uid('i') })),
  }))
  return copy
}
