import { formatRange } from '../model/dates'
import { plainText, toHref } from '../model/inline'
import type { ResumeDoc } from '../model/types'
import { join, visibleContacts, visibleSections } from './visible'

const LINKABLE = new Set(['email', 'phone', 'website', 'github', 'linkedin'])

/** Markdown：保留粗体与链接，适合邮件正文、招聘网站与 Git 仓库 */
export function toMarkdown(doc: ResumeDoc): string {
  const out: string[] = []
  const p = doc.profile
  if (p.name.trim()) out.push(`# ${p.name.trim()}`)
  if (p.headline.trim()) out.push('', p.headline.trim())
  const contacts = visibleContacts(doc).map((c) => {
    const v = c.value.trim()
    return LINKABLE.has(c.kind)
      ? `[${v.replace(/^https?:\/\//, '')}](${toHref(v)})`
      : v
  })
  if (contacts.length) out.push('', contacts.join(' · '))

  for (const { section, items } of visibleSections(doc)) {
    out.push('', `## ${section.title.trim()}`, '')
    if (section.layout === 'rows') {
      for (const i of items)
        out.push(
          i.title.trim()
            ? `- **${i.title.trim()}**：${i.text.trim()}`
            : `- ${i.text.trim()}`
        )
      continue
    }
    if (section.layout === 'text') {
      for (const i of items) {
        if (i.text.trim()) out.push(i.text.trim(), '')
        for (const b of i.bullets) out.push(`- ${b.trim()}`)
      }
      continue
    }
    items.forEach((i, index) => {
      if (index > 0) out.push('')
      const heading = join([i.title, i.subtitle, i.location], ' · ')
      if (heading) out.push(`### ${heading}`)
      const date = formatRange(i.start, i.end, doc.theme.date)
      const meta = join(
        [
          date ? `*${date}*` : '',
          ...i.links.map(
            (l) => `[${l.replace(/^https?:\/\//, '')}](${toHref(l)})`
          ),
          i.tags,
        ],
        ' · '
      )
      if (meta) out.push('', meta)
      if (i.text.trim()) out.push('', i.text.trim())
      if (i.bullets.length)
        out.push('', ...i.bullets.map((b) => `- ${b.trim()}`))
    })
  }
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}

/** 纯文本：去掉全部标记，适合在线申请表的「粘贴简历」文本框 */
export function toPlainText(doc: ResumeDoc): string {
  const out: string[] = []
  const p = doc.profile
  out.push(join([p.name, p.headline], ' | '))
  const contacts = visibleContacts(doc).map((c) => c.value.trim())
  if (contacts.length) out.push(contacts.join(' | '))

  for (const { section, items } of visibleSections(doc)) {
    const title = section.title.trim()
    out.push('', title, '-'.repeat(Math.max(4, [...title].length * 2)))
    for (const i of items) {
      if (section.layout === 'rows') {
        out.push(join([i.title, plainText(i.text)], '：'))
        continue
      }
      if (section.layout === 'entries') {
        out.push(
          join(
            [
              i.title,
              i.subtitle,
              i.location,
              formatRange(i.start, i.end, doc.theme.date),
            ],
            ' | '
          )
        )
        const meta = join([...i.links, i.tags], ' | ')
        if (meta) out.push(meta)
      }
      if (i.text.trim()) out.push(plainText(i.text))
      for (const b of i.bullets) out.push(`• ${plainText(b)}`)
      if (section.layout === 'entries') out.push('')
    }
  }
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
