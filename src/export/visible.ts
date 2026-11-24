import type { Item, ResumeDoc, Section } from '../model/types'

/** 导出时真正出现的内容：跳过隐藏与空白的区块、条目、要点 */
export function visibleSections(
  doc: ResumeDoc
): { section: Section; items: Item[] }[] {
  return doc.sections
    .filter((s) => !s.hidden)
    .map((section) => ({
      section,
      items: section.items
        .filter((i) => !i.hidden)
        .map((i) => ({ ...i, bullets: i.bullets.filter((b) => b.trim()) }))
        .filter((i) =>
          [i.title, i.subtitle, i.text, i.location, i.tags, ...i.bullets].some(
            (v) => v.trim()
          )
        ),
    }))
    .filter((s) => s.items.length > 0)
}

export const visibleContacts = (doc: ResumeDoc) =>
  doc.profile.contacts.filter((c) => c.value.trim())

export const join = (parts: string[], sep: string) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(sep)
