import { guessContactKind, KIND_META } from '../model/defaults'
import { uid } from '../model/ids'
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
} from '../model/types'
import { normalizeTheme } from '../theme/normalize'

export type Rec = Record<string, unknown>
export const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
export const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback
const strList = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x.trim()) : []
const date = (v: unknown) =>
  typeof v === 'string' && Number.isFinite(Date.parse(v))
    ? v
    : new Date().toISOString()

const KINDS = Object.keys(KIND_META) as SectionKind[]
const CONTACT_KINDS: ContactKind[] = [
  'email',
  'phone',
  'location',
  'website',
  'github',
  'linkedin',
  'wechat',
  'text',
]

function normalizeContact(v: unknown): Contact | null {
  if (!isRec(v)) return null
  const value = str(v.value)
  const kind = CONTACT_KINDS.includes(v.kind as ContactKind)
    ? (v.kind as ContactKind)
    : guessContactKind(value)
  return { id: str(v.id) || uid('c'), kind, value }
}

export function normalizeItem(v: unknown): Item {
  const r = isRec(v) ? v : {}
  return {
    id: str(r.id) || uid('i'),
    title: str(r.title),
    subtitle: str(r.subtitle),
    location: str(r.location),
    start: str(r.start),
    end: str(r.end),
    links: strList(r.links),
    tags: str(r.tags),
    text: str(r.text),
    bullets: Array.isArray(r.bullets) ? r.bullets.map((b) => str(b)) : [],
    ...(r.hidden === true ? { hidden: true } : {}),
  }
}

export function normalizeSection(v: unknown): Section | null {
  if (!isRec(v)) return null
  const kind = KINDS.includes(v.kind as SectionKind)
    ? (v.kind as SectionKind)
    : 'custom'
  const layout: SectionLayout = ['entries', 'rows', 'text'].includes(
    v.layout as string
  )
    ? (v.layout as SectionLayout)
    : KIND_META[kind].layout
  return {
    id: str(v.id) || uid('s'),
    kind,
    title: str(v.title, KIND_META[kind].zh),
    layout,
    ...(v.hidden === true ? { hidden: true } : {}),
    items: Array.isArray(v.items) ? v.items.map(normalizeItem) : [],
  }
}

/** schema 3 文档的防御式规范化：缺什么补什么，绝不整体丢弃。 */
export function normalizeDoc(v: unknown): ResumeDoc {
  const r = isRec(v) ? v : {}
  const profile = isRec(r.profile) ? r.profile : {}
  const locale: Locale = r.locale === 'en' ? 'en' : 'zh'
  const ids = new Set<string>()
  const unique = <T extends { id: string }>(x: T, prefix: string): T => {
    const id = ids.has(x.id) ? uid(prefix) : x.id
    ids.add(id)
    return id === x.id ? x : { ...x, id }
  }
  return {
    id: str(r.id) || uid('r'),
    schema: SCHEMA,
    name: str(r.name).trim() || str(profile.name).trim() || '未命名简历',
    tags: strList(r.tags).slice(0, 8),
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
    locale,
    profile: {
      name: str(profile.name),
      headline: str(profile.headline),
      photo: str(profile.photo),
      contacts: Array.isArray(profile.contacts)
        ? profile.contacts
            .map(normalizeContact)
            .filter((c): c is Contact => c !== null)
            .map((c) => unique(c, 'c'))
        : [],
    },
    sections: Array.isArray(r.sections)
      ? r.sections
          .map(normalizeSection)
          .filter((s): s is Section => s !== null)
          .map((s) => ({
            ...unique(s, 's'),
            items: s.items.map((i) => unique(i, 'i')),
          }))
      : [],
    theme: normalizeTheme(r.theme),
    dismissed: strList(r.dismissed),
    ...(isRec(r.target) && {
      target: {
        baseId: str(r.target.baseId),
        role: str(r.target.role),
        company: str(r.target.company),
        jd: str(r.target.jd),
      },
    }),
  }
}
