import { defineMessages, tr } from '../i18n'
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
  {
    zh: string
    en: string
    layout: SectionLayout
    hint: Record<Locale, string>
  }
> = {
  summary: {
    zh: '个人简介',
    en: 'Summary',
    layout: 'text',
    hint: {
      zh: '两三句话说明你是谁、擅长什么、想做什么',
      en: 'Two or three sentences: who you are, what you’re good at, what you want next',
    },
  },
  experience: {
    zh: '工作经历',
    en: 'Experience',
    layout: 'entries',
    hint: {
      zh: '倒序排列，每段 3–5 条要点',
      en: 'Most recent first, 3–5 bullets each',
    },
  },
  projects: {
    zh: '项目经历',
    en: 'Projects',
    layout: 'entries',
    hint: {
      zh: '写清你的角色和可衡量的结果',
      en: 'Make your role and measurable results clear',
    },
  },
  education: {
    zh: '教育背景',
    en: 'Education',
    layout: 'entries',
    hint: {
      zh: '学校、专业、学位与时间',
      en: 'School, major, degree and dates',
    },
  },
  skills: {
    zh: '专业技能',
    en: 'Skills',
    layout: 'rows',
    hint: {
      zh: '按类别分组，只写真正熟练的',
      en: 'Group by category; list only what you’re genuinely good at',
    },
  },
  awards: {
    zh: '荣誉奖项',
    en: 'Awards',
    layout: 'entries',
    hint: {
      zh: '只保留与岗位相关、含金量高的',
      en: 'Keep only relevant, meaningful ones',
    },
  },
  activities: {
    zh: '校园经历',
    en: 'Activities',
    layout: 'entries',
    hint: {
      zh: '社团、志愿、竞赛等',
      en: 'Clubs, volunteering, competitions',
    },
  },
  publications: {
    zh: '论文发表',
    en: 'Publications',
    layout: 'entries',
    hint: {
      zh: '作者、题目、会议 / 期刊',
      en: 'Authors, title, venue',
    },
  },
  custom: {
    zh: '自定义',
    en: 'Section',
    layout: 'entries',
    hint: { zh: '', en: '' },
  },
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
  { label: Record<Locale, string>; placeholder: Record<Locale, string> }
> = {
  email: {
    label: { zh: '邮箱', en: 'Email' },
    placeholder: { zh: 'name@example.com', en: 'name@example.com' },
  },
  phone: {
    label: { zh: '电话', en: 'Phone' },
    placeholder: { zh: '138 0000 0000', en: '+1 555 010 0000' },
  },
  location: {
    label: { zh: '城市', en: 'Location' },
    placeholder: { zh: '上海', en: 'City' },
  },
  website: {
    label: { zh: '网站', en: 'Website' },
    placeholder: { zh: 'yourname.dev', en: 'yourname.dev' },
  },
  github: {
    label: { zh: 'GitHub', en: 'GitHub' },
    placeholder: { zh: 'github.com/yourname', en: 'github.com/yourname' },
  },
  linkedin: {
    label: { zh: 'LinkedIn', en: 'LinkedIn' },
    placeholder: {
      zh: 'linkedin.com/in/yourname',
      en: 'linkedin.com/in/yourname',
    },
  },
  wechat: {
    label: { zh: '微信', en: 'WeChat' },
    placeholder: { zh: '微信号', en: 'WeChat ID' },
  },
  text: {
    label: { zh: '其他', en: 'Other' },
    placeholder: {
      zh: '求职意向 / 到岗时间',
      en: 'Target role / availability',
    },
  },
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

/** 新建简历的默认名称，跟随简历自己的语言 */
const DOC_NAMES: Record<Locale, { sample: string; blank: string }> = {
  zh: { sample: '示例简历', blank: '未命名简历' },
  en: { sample: 'Sample resume', blank: 'Untitled resume' },
}

const M = defineMessages(
  { copyName: (name: string) => `${name} 副本` },
  { copyName: (name: string) => `${name} copy` }
)

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
  const content = options.sample
    ? locale === 'en'
      ? sampleContentEn()
      : sampleContent()
    : blankContent(locale)
  const names = DOC_NAMES[locale]
  return {
    id: uid('r'),
    schema: SCHEMA,
    name: options.name ?? (options.sample ? names.sample : names.blank),
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

/** 英文示例，结构与中文示例一致 */
function sampleContentEn(): Pick<ResumeDoc, 'profile' | 'sections'> {
  return {
    profile: {
      name: 'Jordan Lee',
      headline: 'Front-End Engineer · 3 years of experience',
      photo: '',
      contacts: [
        newContact('phone', '(415) 555-0132'),
        newContact('email', 'jordan.lee@email.com'),
        newContact('github', 'github.com/jordanlee'),
        newContact('location', 'San Francisco, CA'),
      ],
    },
    sections: [
      newSection('summary', 'en', {
        items: [
          newItem({
            text: 'Front-end engineer focused on web performance and design systems. Led two B2B products from zero to launch, measures user experience with data, and builds reusable engineering foundations.',
          }),
        ],
      }),
      newSection('experience', 'en', {
        items: [
          newItem({
            title: 'Starmap Analytics',
            subtitle: 'Front-End Engineer · Data Platform',
            location: 'San Francisco, CA',
            start: '2023.07',
            end: 'Present',
            bullets: [
              'Led a rebuild of the analytics dashboard, cutting first load from **3.2s to 1.1s** and lifting weekly active users by 18%',
              'Built a shared component library (40+ components) and design tokens, shortening new-page delivery by ~30%',
              'Drove adoption of TypeScript and unit testing, reducing production defects by 42% quarter over quarter',
            ],
          }),
          newItem({
            title: 'Sailcloud',
            subtitle: 'Front-End Engineering Intern',
            location: 'Seattle, WA',
            start: '2022.07',
            end: '2022.12',
            bullets: [
              'Shipped 12 pages of the internal operations console end to end, hitting 100% of delivery dates',
              'Designed reusable table-filter and permission components adopted by 3 product teams',
            ],
          }),
        ],
      }),
      newSection('projects', 'en', {
        items: [
          newItem({
            title: 'Lumen Charts',
            subtitle: 'Author · Open source',
            start: '2024.01',
            end: 'Present',
            links: ['github.com/jordanlee/lumen'],
            tags: 'TypeScript, Canvas, WebGL',
            bullets: [
              'Designed a declarative charting API at **12 KB** gzipped that renders 100k points at 60fps',
              'Wrote full docs and an examples site, earning 1.2k GitHub stars and adoption in 30+ projects',
            ],
          }),
        ],
      }),
      newSection('education', 'en', {
        items: [
          newItem({
            title: 'Northfield University',
            subtitle: 'B.S. in Computer Science',
            start: '2019.09',
            end: '2023.06',
            bullets: ['GPA 3.7/4.0 (top 10%), University Merit Scholarship'],
          }),
        ],
      }),
      newSection('skills', 'en', {
        items: [
          newItem({
            title: 'Languages',
            text: 'TypeScript, JavaScript, HTML/CSS, Node.js',
          }),
          newItem({ title: 'Frameworks', text: 'React, Vue 3, Next.js, Vite' }),
          newItem({
            title: 'Engineering',
            text: 'Performance, design systems, unit testing, CI/CD',
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
  copy.name = name ?? tr(M).copyName(doc.name)
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
