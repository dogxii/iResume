/**
 * JSON Resume（https://jsonresume.org/schema，v1.0.0）互转。
 * 导出时把 iResume 独有的信息（主题、自定义区块、区块顺序）放进 meta.iresume，
 * 再导入时可无损还原；其他工具导出的 JSON Resume 也能直接导入。
 */

import { isRec, normalizeSection, type Rec, str } from '../migrate/normalize'
import { parseDate } from '../model/dates'
import { createDoc, newContact, newItem, newSection } from '../model/defaults'
import { plainText } from '../model/inline'
import type {
  Contact,
  Item,
  Locale,
  ResumeDoc,
  Section,
  SectionKind,
} from '../model/types'
import { normalizeTheme } from '../theme/normalize'
import { visibleContacts, visibleSections } from './visible'

type Json = Record<string, unknown>

/** 任意日期写法 → ISO 8601 的 YYYY-MM / YYYY；「至今」返回 undefined */
export function toIsoDate(value: string): string | undefined {
  const p = parseDate(value)
  if (!p || p.kind === 'present') return undefined
  if (p.kind === 'raw') return p.text
  return p.month
    ? `${p.year}-${String(p.month).padStart(2, '0')}`
    : String(p.year)
}

/** ISO 日期 → iResume 存储写法（2023.07） */
export function fromIsoDate(value: unknown): string {
  const p = parseDate(str(value))
  if (!p) return ''
  if (p.kind === 'raw') return p.text
  if (p.kind === 'present') return '至今'
  return p.month
    ? `${p.year}.${String(p.month).padStart(2, '0')}`
    : String(p.year)
}

const compact = <T extends Json>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) =>
        v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  ) as T

const keywords = (text: string) =>
  plainText(text)
    .split(/[,，、;；|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

const dates = (i: Item) =>
  compact({
    startDate: toIsoDate(i.start),
    endDate: i.end.trim() ? toIsoDate(i.end) : undefined,
  })

const MAPPED: SectionKind[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'awards',
  'activities',
  'publications',
]

export function toJsonResume(doc: ResumeDoc): Json {
  const sections = visibleSections(doc)
  const of = (kind: SectionKind) =>
    sections.filter((s) => s.section.kind === kind).flatMap((s) => s.items)
  const contacts = visibleContacts(doc)
  const first = (kind: Contact['kind']) =>
    contacts.find((c) => c.kind === kind)?.value.trim()
  const profile = (network: string, value: string) => {
    const url = /^https?:/.test(value) ? value : `https://${value}`
    return compact({
      network,
      url,
      username: value.replace(/\/$/, '').split('/').pop(),
    })
  }
  const website = first('website')

  return {
    $schema:
      'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: compact({
      name: doc.profile.name.trim(),
      label: doc.profile.headline.trim(),
      image: doc.profile.photo || undefined,
      email: first('email'),
      phone: first('phone'),
      url: website
        ? /^https?:/.test(website)
          ? website
          : `https://${website}`
        : undefined,
      summary:
        of('summary')
          .map((i) =>
            plainText([i.text, ...i.bullets].filter(Boolean).join('\n'))
          )
          .join('\n') || undefined,
      location: first('location') ? { city: first('location') } : undefined,
      profiles: contacts
        .filter((c) => c.kind === 'github' || c.kind === 'linkedin')
        .map((c) =>
          profile(c.kind === 'github' ? 'GitHub' : 'LinkedIn', c.value.trim())
        ),
    }),
    work: of('experience').map((i) =>
      compact({
        name: i.title,
        position: i.subtitle,
        location: i.location,
        url: i.links[0],
        ...dates(i),
        summary: i.text,
        highlights: i.bullets,
      })
    ),
    volunteer: of('activities').map((i) =>
      compact({
        organization: i.title,
        position: i.subtitle,
        url: i.links[0],
        ...dates(i),
        summary: i.text,
        highlights: i.bullets,
      })
    ),
    education: of('education').map((i) =>
      compact({
        institution: i.title,
        area: i.subtitle,
        url: i.links[0],
        ...dates(i),
        courses: i.bullets,
      })
    ),
    awards: of('awards').map((i) =>
      compact({
        title: i.title,
        awarder: i.subtitle,
        date: toIsoDate(i.start),
        summary: [i.text, ...i.bullets].filter(Boolean).join('\n'),
      })
    ),
    publications: of('publications').map((i) =>
      compact({
        name: i.title,
        publisher: i.subtitle,
        releaseDate: toIsoDate(i.start),
        url: i.links[0],
        summary: [i.text, ...i.bullets].filter(Boolean).join('\n'),
      })
    ),
    skills: sections
      .filter((s) => s.section.kind === 'skills')
      .flatMap(({ section, items }) =>
        section.layout === 'rows'
          ? items.map((i) =>
              compact({ name: i.title, keywords: keywords(i.text) })
            )
          : items.map((i) =>
              compact({
                name: section.title,
                keywords: i.bullets.length
                  ? i.bullets.map(plainText)
                  : keywords(i.text),
              })
            )
      ),
    projects: of('projects').map((i) =>
      compact({
        name: i.title,
        roles: i.subtitle ? [i.subtitle] : undefined,
        url: i.links[0],
        ...dates(i),
        description: i.text,
        highlights: i.bullets,
        keywords: keywords(i.tags),
      })
    ),
    meta: {
      lastModified: doc.updatedAt,
      iresume: {
        schema: 3,
        name: doc.name,
        locale: doc.locale,
        theme: doc.theme,
        order: doc.sections.filter((s) => !s.hidden).map((s) => s.kind),
        titles: Object.fromEntries(
          doc.sections
            .filter((s) => MAPPED.includes(s.kind))
            .map((s) => [s.kind, s.title])
        ),
        custom: doc.sections.filter(
          (s) => !s.hidden && !MAPPED.includes(s.kind)
        ),
      },
    },
  }
}

// —— 导入 ————————————————————————————————————————————

const list = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : [])
const strs = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x.trim()) : []
const lines = (v: unknown) =>
  str(v)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

function entry(
  r: Rec,
  map: {
    title: string
    subtitle: string
    start?: string
    end?: string
    text?: string
    bullets?: string
  }
): Item {
  return newItem({
    title: str(r[map.title]),
    subtitle: Array.isArray(r[map.subtitle])
      ? strs(r[map.subtitle]).join(' / ')
      : str(r[map.subtitle]),
    location: str(r.location),
    start: fromIsoDate(r[map.start ?? 'startDate']),
    end:
      r[map.start ?? 'startDate'] && !r[map.end ?? 'endDate'] && map.end !== ''
        ? '至今'
        : fromIsoDate(r[map.end ?? 'endDate']),
    links: [str(r.url)].filter(Boolean),
    text: map.text ? str(r[map.text]) : '',
    bullets: map.bullets
      ? [...strs(r[map.bullets]), ...(map.text ? [] : lines(r.summary))]
      : [],
  })
}

const isLatin = (text: string) => {
  const letters = text.replace(/[^\p{L}]/gu, '')
  if (!letters) return false
  const latin = letters.replace(/[^A-Za-z]/g, '')
  return latin.length / letters.length > 0.7
}

export function isJsonResume(value: unknown): value is Rec {
  return isRec(value) && isRec(value.basics)
}

export function fromJsonResume(value: Rec): ResumeDoc {
  const basics = isRec(value.basics) ? value.basics : {}
  const meta =
    isRec(value.meta) && isRec(value.meta.iresume) ? value.meta.iresume : null
  const locale: Locale =
    meta?.locale === 'zh' || meta?.locale === 'en'
      ? meta.locale
      : isLatin(JSON.stringify([basics.name, basics.label, value.work]))
        ? 'en'
        : 'zh'
  const doc = createDoc({
    locale,
    name: str(meta?.name) || str(basics.name) || 'JSON Resume',
  })
  if (meta?.theme) doc.theme = normalizeTheme(meta.theme)
  const titles = isRec(meta?.titles) ? meta.titles : {}
  const section = (
    kind: SectionKind,
    items: Item[],
    patch: Partial<Section> = {}
  ) =>
    items.length
      ? newSection(kind, locale, {
          items,
          ...patch,
          ...(str(titles[kind]) ? { title: str(titles[kind]) } : {}),
        })
      : null

  const location = isRec(basics.location)
    ? [
        basics.location.city,
        basics.location.region,
        basics.location.countryCode,
      ]
        .map((x) => str(x))
        .filter(Boolean)
        .join(', ')
    : str(basics.location)
  const contacts: Contact[] = [
    newContact('email', str(basics.email)),
    newContact('phone', str(basics.phone)),
    newContact('website', str(basics.url)),
    ...list(basics.profiles).map((p) => {
      const network = str(p.network).toLowerCase()
      const kind = network.includes('github')
        ? 'github'
        : network.includes('linkedin')
          ? 'linkedin'
          : 'website'
      return newContact(kind, str(p.url) || str(p.username))
    }),
    newContact('location', location),
  ].filter((c) => c.value.trim())
  doc.profile = {
    name: str(basics.name),
    headline: str(basics.label),
    photo: str(basics.image),
    contacts,
  }

  const sections: Record<string, Section | null> = {
    summary: str(basics.summary).trim()
      ? section('summary', [newItem({ text: str(basics.summary).trim() })])
      : null,
    experience: section(
      'experience',
      list(value.work).map((r) =>
        entry(
          { ...r, name: r.name ?? r.company },
          {
            title: 'name',
            subtitle: 'position',
            text: 'summary',
            bullets: 'highlights',
          }
        )
      )
    ),
    projects: section(
      'projects',
      list(value.projects).map((r) => ({
        ...entry(r, {
          title: 'name',
          subtitle: 'roles',
          text: 'description',
          bullets: 'highlights',
        }),
        tags: strs(r.keywords).join(', '),
      }))
    ),
    education: section(
      'education',
      list(value.education).map((r) =>
        entry(
          {
            ...r,
            degree: [str(r.area), str(r.studyType)].filter(Boolean).join(' · '),
          },
          { title: 'institution', subtitle: 'degree', bullets: 'courses' }
        )
      )
    ),
    skills: section('skills', [
      ...list(value.skills).map((r) =>
        newItem({
          title: str(r.name),
          text: strs(r.keywords).join(', ') || str(r.level),
        })
      ),
      ...list(value.languages).map((r) =>
        newItem({ title: str(r.language), text: str(r.fluency) })
      ),
    ]),
    awards: section(
      'awards',
      list(value.awards).map((r) =>
        entry(r, {
          title: 'title',
          subtitle: 'awarder',
          start: 'date',
          end: '',
          bullets: 'none',
        })
      )
    ),
    activities: section(
      'activities',
      list(value.volunteer).map((r) =>
        entry(r, {
          title: 'organization',
          subtitle: 'position',
          text: 'summary',
          bullets: 'highlights',
        })
      )
    ),
    publications: section(
      'publications',
      list(value.publications).map((r) =>
        entry(r, {
          title: 'name',
          subtitle: 'publisher',
          start: 'releaseDate',
          end: '',
          bullets: 'none',
        })
      )
    ),
  }
  const order = Array.isArray(meta?.order) ? meta.order.map((k) => str(k)) : []
  const ordered = [...new Set([...order, ...Object.keys(sections)])]
  const custom = Array.isArray(meta?.custom)
    ? meta.custom.map(normalizeSection).filter((s): s is Section => s !== null)
    : []
  doc.sections = []
  for (const key of ordered) {
    const s = sections[key]
    if (s) doc.sections.push(s)
    else if (key === 'custom' && custom.length)
      doc.sections.push(custom.shift() as Section)
  }
  doc.sections.push(...custom)
  return doc
}
