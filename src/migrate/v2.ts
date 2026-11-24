/**
 * iResume 2.x → 3.0 迁移。
 * 只读取旧数据，不修改旧数据；所有字段都按「尽量保留」处理。
 */

import { splitRange } from '../model/dates'
import { newContact, newItem, newSection } from '../model/defaults'
import { uid } from '../model/ids'
import { splitBullets } from '../model/inline'
import type {
  Contact,
  ContactKind,
  Item,
  ResumeDoc,
  Section,
  Snapshot,
} from '../model/types'
import { SCHEMA } from '../model/types'
import { normalizeTheme } from '../theme/normalize'
import { DEFAULT_THEME, presetById } from '../theme/presets'
import type { FontId, Theme } from '../theme/types'
import { isRec, type Rec, str } from './normalize'

const TEMPLATE_TO_PRESET: Record<string, string> = {
  classic: 'clean',
  minimal: 'clean',
  ats: 'clean',
  structured: 'clean',
  outline: 'margin',
  timeline: 'timeline',
  focus: 'modern',
  fresh: 'modern',
  executive: 'classic',
  elegant: 'editorial',
  rose: 'editorial',
}

const LEGACY_SKILL_LABELS: Record<string, string> = {
  core: '核心能力',
  react: 'React 生态',
  engineering: '工程化',
  style: '样式 & 性能',
}

const list = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : [])

/** 多行文本 → 要点；单行无列表标记的保留为段落 */
function textOrBullets(source: string): Pick<Item, 'text' | 'bullets'> {
  const trimmed = source.trim()
  if (!trimmed) return { text: '', bullets: [] }
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim())
  const marked = lines.some(
    (l) => /^\s*([-*•·▪–]|\d{1,2}[.)、])\s*/.test(l) && !/^\s*\*\*/.test(l)
  )
  if (lines.length === 1 && !marked) return { text: trimmed, bullets: [] }
  return { text: '', bullets: splitBullets(trimmed) }
}

function entry(patch: Partial<Item>, date: unknown, details: unknown): Item {
  const [start, end] = splitRange(str(date))
  const { text, bullets } = textOrBullets(str(details))
  return newItem({
    ...patch,
    start,
    end,
    bullets: text ? [text, ...bullets] : bullets,
  })
}

function contacts(personal: Rec): Contact[] {
  const fields: [string, ContactKind][] = [
    ['phone', 'phone'],
    ['email', 'email'],
    ['location', 'location'],
    ['github', 'github'],
    ['website', 'website'],
    ['availability', 'text'],
  ]
  return fields
    .map(([key, kind]) => [str(personal[key]).trim(), kind] as const)
    .filter(([value]) => value)
    .map(([value, kind]) => newContact(kind, value))
}

function skillsSection(raw: unknown, title: string): Section {
  const rows: { label: string; content: string }[] = Array.isArray(raw)
    ? list(raw).map((s) => ({
        label: str(s.label).trim(),
        content: str(s.content),
      }))
    : isRec(raw)
      ? Object.entries(raw).map(([k, v]) => ({
          label: LEGACY_SKILL_LABELS[k] ?? k,
          content: str(v),
        }))
      : []
  const filled = rows.filter((r) => r.content.trim() || r.label)
  if (filled.length > 0 && filled.every((r) => !r.label)) {
    return newSection('skills', 'zh', {
      title,
      layout: 'text',
      items: [
        newItem({ bullets: filled.flatMap((r) => splitBullets(r.content)) }),
      ],
    })
  }
  return newSection('skills', 'zh', {
    title,
    layout: 'rows',
    items: filled.map((r) =>
      newItem({ title: r.label, text: splitBullets(r.content).join('；') })
    ),
  })
}

function textSection(
  kind: 'summary' | 'custom',
  title: string,
  content: string
): Section {
  const { text, bullets } = textOrBullets(content)
  return newSection(kind, 'zh', {
    title,
    layout: 'text',
    items: [newItem({ text, bullets })],
  })
}

/** 旧版 ResumeData → 新版 profile + sections */
export function convertV2Data(
  data: unknown
): Pick<ResumeDoc, 'profile' | 'sections'> {
  const d = isRec(data) ? data : {}
  const personal = isRec(d.personal) ? d.personal : {}
  const titles = isRec(d.sectionTitles) ? d.sectionTitles : {}
  const visibility = isRec(d.sectionVisibility) ? d.sectionVisibility : {}
  const title = (key: string, fallback: string) =>
    str(titles[key]).trim() || fallback

  const build: Record<string, () => Section | null> = {
    skills: () => skillsSection(d.skills, title('skills', '专业技能')),
    experience: () =>
      newSection('experience', 'zh', {
        title: title('experience', '工作经历'),
        items: list(d.experience).map((e) =>
          entry(
            { title: str(e.company), subtitle: str(e.role) },
            e.date,
            e.details
          )
        ),
      }),
    projects: () =>
      newSection('projects', 'zh', {
        title: title('projects', '项目经历'),
        items: list(d.projects).map((p) =>
          entry(
            {
              title: str(p.name),
              subtitle: str(p.role),
              tags: str(p.tags),
              links: [str(p.link), str(p.source)]
                .map((l) => l.trim())
                .filter(Boolean),
            },
            p.date,
            p.description
          )
        ),
      }),
    education: () =>
      newSection('education', 'zh', {
        title: title('education', '教育背景'),
        items: list(d.education).map((e) =>
          entry(
            { title: str(e.school), subtitle: str(e.degree) },
            e.date,
            e.details
          )
        ),
      }),
    awards: () =>
      newSection('awards', 'zh', {
        title: title('awards', '荣誉奖项'),
        items: list(d.awards).map((a) =>
          entry(
            { title: str(a.title), subtitle: str(a.subtitle) },
            a.date,
            a.details
          )
        ),
      }),
    campus: () =>
      newSection('activities', 'zh', {
        title: title('campus', '校园经历'),
        items: list(d.campus).map((a) =>
          entry(
            { title: str(a.title), subtitle: str(a.subtitle) },
            a.date,
            a.details
          )
        ),
      }),
    other: () =>
      str(d.other).trim()
        ? textSection('summary', title('other', '自我评价'), str(d.other))
        : null,
  }

  const customs = list(d.customSections)
  for (const c of customs) {
    const id = str(c.id)
    build[id] = () =>
      textSection(
        'custom',
        str(titles[id]).trim() || str(c.title) || '自定义',
        str(c.content)
      )
  }

  const order = Array.isArray(d.sectionOrder)
    ? d.sectionOrder.map((k) => str(k))
    : []
  const keys = [...new Set([...order, ...Object.keys(build)])]
  const sections: Section[] = []
  for (const key of keys) {
    const section = build[key]?.()
    if (!section) continue
    const visible =
      visibility[key] !== false &&
      (order.length === 0 || order.includes(key) || key.startsWith('custom-'))
    const empty = section.items.length === 0
    if (empty && !visible) continue
    if (empty) section.items = [newItem({ bullets: [''] })]
    sections.push(visible ? section : { ...section, hidden: true })
  }

  return {
    profile: {
      name: str(personal.name),
      headline: str(personal.title),
      photo: str(personal.photoUrl),
      contacts: contacts(personal),
    },
    sections,
  }
}

function fontFrom(value: string): FontId | undefined {
  const v = value.toLowerCase()
  if (v.includes('kai')) return 'kai'
  if (v.includes('mono')) return 'mono'
  if (v.includes('serif') || v.includes('song')) return 'serif'
  if (v.includes('round')) return 'rounded'
  return undefined
}

export function convertV2Appearance(appearance: unknown): Theme {
  const a = isRec(appearance) ? appearance : {}
  const preset =
    presetById(TEMPLATE_TO_PRESET[str(a.templateId)] ?? 'clean')?.theme ??
    DEFAULT_THEME
  const theme = structuredClone(preset)
  const accent = str(a.accentColor)
  if (/^#[0-9a-f]{6}$/i.test(accent)) theme.color.accent = accent.toLowerCase()
  if (typeof a.lineHeight === 'number') theme.font.leading = a.lineHeight
  const font = fontFrom(str(a.fontFamily))
  if (font) {
    theme.font.body = font
    theme.font.heading = font
  }
  return normalizeTheme(theme)
}

/** 旧版 library 中的一份文档 */
export function convertV2Document(raw: unknown): ResumeDoc {
  const r = isRec(raw) ? raw : {}
  const now = new Date().toISOString()
  const content = convertV2Data(r.data)
  const valid = (v: unknown) =>
    typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : now
  return {
    id: str(r.id) || uid('r'),
    schema: SCHEMA,
    name: str(r.name).trim() || content.profile.name || '导入的简历',
    tags: Array.isArray(r.tags)
      ? r.tags
          .map((t) => str(t))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    createdAt: valid(r.createdAt),
    updatedAt: valid(r.updatedAt),
    locale: 'zh',
    theme: convertV2Appearance(r.appearance),
    dismissed: [],
    ...content,
  }
}

/** 2.x 的 histories：{ [docId]: { snapshots: [{ id, label, version, createdAt, document: { data, appearance } }] } } */
export function convertV2Histories(raw: unknown): Snapshot[] {
  if (!isRec(raw)) return []
  const out: Snapshot[] = []
  for (const [docId, history] of Object.entries(raw)) {
    const snapshots =
      isRec(history) && Array.isArray(history.snapshots)
        ? history.snapshots
        : []
    for (const s of snapshots) {
      if (!isRec(s) || !isRec(s.document)) continue
      const createdAt = str(s.createdAt)
      const label = str(s.label).trim() || '手动保存'
      const version = str(s.version).trim()
      out.push({
        id: str(s.id) || uid('v'),
        docId,
        label: version ? `${label} · v${version}` : label,
        auto: false,
        createdAt: Number.isFinite(Date.parse(createdAt))
          ? createdAt
          : new Date().toISOString(),
        doc: convertV2Document({
          id: docId,
          name: label,
          createdAt,
          updatedAt: createdAt,
          data: s.document.data,
          appearance: s.document.appearance,
        }),
      })
    }
  }
  return out
}
