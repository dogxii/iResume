import { newContact, newItem, newSection } from '../model/defaults'
import type {
  ContactKind,
  ResumeDoc,
  Section,
  SectionKind,
  Target,
} from '../model/types'
import { requestFocus } from '../render/Field'
import { derivedSuffix, TAILORED_SUFFIX, update } from '../store/store'
import type { Theme } from '../theme/types'

const sec = (d: ResumeDoc, id: string) => d.sections.find((s) => s.id === id)

/** 把条目挪到 to(当前位置) 处；越界或没动就什么也不做 */
function placeItem(
  s: Section | undefined,
  itemId: string,
  to: (from: number) => number
) {
  const from = s?.items.findIndex((i) => i.id === itemId) ?? -1
  if (!s || from < 0) return
  const at = to(from)
  if (at === from || at < 0 || at >= s.items.length) return
  s.items.splice(at, 0, ...s.items.splice(from, 1))
}

/** 某个文档上的所有编辑动作 */
export function actions(docId: string) {
  const u = (recipe: (d: ResumeDoc) => void, coalesce?: string) =>
    update(docId, recipe, coalesce)
  return {
    update: u,
    theme(recipe: (t: Theme) => void, coalesce?: string) {
      u((d) => recipe(d.theme), coalesce)
    },
    setTheme(theme: Theme) {
      u((d) => {
        d.theme = structuredClone(theme)
      })
    },
    setTarget(patch: Partial<Target>) {
      u(
        (d) => {
          const prev = d.target
          d.target = {
            baseId: '',
            role: '',
            company: '',
            jd: '',
            ...prev,
            ...patch,
          }
          // 派生版的默认名称跟随公司 / 岗位变化；用户改过名字就不再动
          // 未填公司 / 岗位时的默认后缀可能是用另一种界面语言起的；
          // 前后都没填时保持原样，不因界面语言不同而改名
          const named = (t?: Partial<Target>) => !!(t?.company || t?.role)
          const tail = (
            named(prev) ? [derivedSuffix(prev)] : Object.values(TAILORED_SUFFIX)
          )
            .map((s) => ` · ${s}`)
            .find((s) => d.name.endsWith(s))
          if (prev?.baseId && tail && (named(prev) || named(d.target)))
            d.name = `${d.name.slice(0, -tail.length)} · ${derivedSuffix(d.target)}`
        },
        `target:${Object.keys(patch).join()}`
      )
    },
    rename(name: string) {
      u((d) => {
        d.name = name
      }, 'doc:name')
    },
    moveSection(id: string, to: number) {
      u((d) => {
        const from = d.sections.findIndex((s) => s.id === id)
        if (from < 0) return
        const [s] = d.sections.splice(from, 1)
        d.sections.splice(Math.max(0, Math.min(to, d.sections.length)), 0, s)
      })
    },
    toggleSection(id: string) {
      u((d) => {
        const s = sec(d, id)
        if (s) s.hidden = !s.hidden || undefined
      })
    },
    removeSection(id: string) {
      u((d) => {
        d.sections = d.sections.filter((s) => s.id !== id)
      })
    },
    addSection(
      kind: SectionKind,
      locale: ResumeDoc['locale'],
      at?: number
    ): Section {
      const s = newSection(kind, locale)
      u((d) => {
        d.sections.splice(at ?? d.sections.length, 0, s)
      })
      requestFocus(
        `${s.items[0].id}:${s.layout === 'entries' ? 'title' : s.layout === 'rows' ? 'title' : 'text'}`,
        0
      )
      return s
    },
    setLayout(id: string, layout: Section['layout']) {
      u((d) => {
        const s = sec(d, id)
        if (s) s.layout = layout
      })
    },
    addItem(sectionId: string, at?: number) {
      let focusKey = ''
      u((d) => {
        const s = sec(d, sectionId)
        if (!s) return
        const item = newItem(s.layout === 'entries' ? { bullets: [''] } : {})
        s.items.splice(at ?? s.items.length, 0, item)
        focusKey = `${item.id}:${s.layout === 'text' ? 'text' : 'title'}`
      })
      if (focusKey) requestFocus(focusKey, 0)
    },
    /** 上移 / 下移一格 */
    moveItem(sectionId: string, itemId: string, delta: number) {
      u((d) => placeItem(sec(d, sectionId), itemId, (from) => from + delta))
    },
    /** 拖动排序：把条目放到区块中的第 to 个位置 */
    moveItemTo(sectionId: string, itemId: string, to: number) {
      u((d) => placeItem(sec(d, sectionId), itemId, () => to))
    },
    removeItem(sectionId: string, itemId: string) {
      u((d) => {
        const s = sec(d, sectionId)
        if (s) s.items = s.items.filter((i) => i.id !== itemId)
      })
    },
    toggleItem(sectionId: string, itemId: string) {
      u((d) => {
        const item = sec(d, sectionId)?.items.find((i) => i.id === itemId)
        if (item) item.hidden = !item.hidden || undefined
      })
    },
    addContact(kind: ContactKind) {
      const c = newContact(kind)
      u((d) => {
        d.profile.contacts.push(c)
      })
      requestFocus(`contact:${c.id}`, 0)
    },
    removeContact(id: string) {
      u((d) => {
        d.profile.contacts = d.profile.contacts.filter((c) => c.id !== id)
      })
    },
    setPhoto(photo: string) {
      u((d) => {
        d.profile.photo = photo
        if (photo && d.theme.header.photo === 'none')
          d.theme.header.photo = 'rounded'
      })
    },
    dismiss(id: string) {
      u((d) => {
        if (!d.dismissed.includes(id)) d.dismissed.push(id)
      })
    },
  }
}

export type Actions = ReturnType<typeof actions>
