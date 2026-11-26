import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
} from 'react'
import { defineMessages } from '../i18n'
import { formatDate } from '../model/dates'
import { CONTACT_META, KIND_META, setPersonName } from '../model/defaults'
import { toHref } from '../model/inline'
import type { Contact, Item, Locale, ResumeDoc, Section } from '../model/types'
import { themeAttrs, themeVars } from '../theme/css'
import type { Theme } from '../theme/types'
import { Bullets } from './Bullets'
import { Field, useEdit } from './Field'
import { Inline } from './inline'
import './resume.css'

export interface Tools {
  header?(): ReactNode
  section?(section: Section): ReactNode
  item?(section: Section, item: Item, index: number): ReactNode
}

interface Props {
  doc: ResumeDoc
  tools?: Tools
  className?: string
}

/** 纸面占位文字：跟随简历自己的语言（doc.locale），而不是界面语言 */
const M = defineMessages(
  {
    name: '你的名字',
    headline: '一句话定位，例如「前端工程师 · 3 年经验」',
    location: '城市',
    start: '开始',
    end: '结束',
    links: '链接',
    tags: '技术栈 / 关键词',
    text: '一句话描述',
    bullets: '动词开头 + 做了什么 + 结果数字',
    rowTitle: '类别',
    rowText: '用逗号分隔，例如 React, TypeScript',
    write: '写点什么…',
  },
  {
    name: 'Your name',
    headline: 'One-line headline, e.g. “Frontend engineer · 3 years”',
    location: 'City',
    start: 'Start',
    end: 'End',
    links: 'Links',
    tags: 'Tech stack / keywords',
    text: 'One-line description',
    bullets: 'Action verb + what you did + measurable result',
    rowTitle: 'Category',
    rowText: 'Comma-separated, e.g. React, TypeScript',
    write: 'Write something…',
  }
)

const ITEM_PH: Record<Locale, Record<string, [string, string]>> = {
  zh: {
    experience: ['公司名称', '职位'],
    projects: ['项目名称', '你的角色'],
    education: ['学校', '专业 · 学位'],
    awards: ['奖项名称', '颁发机构'],
    activities: ['组织 / 活动', '角色'],
    publications: ['论文题目', '作者 · 期刊 / 会议'],
    custom: ['标题', '副标题'],
  },
  en: {
    experience: ['Company', 'Title'],
    projects: ['Project name', 'Your role'],
    education: ['School', 'Major · Degree'],
    awards: ['Award', 'Issuer'],
    activities: ['Organization / activity', 'Role'],
    publications: ['Paper title', 'Authors · Journal / conference'],
    custom: ['Title', 'Subtitle'],
  },
}

/** 当前纸面的语言（doc.locale），供各子组件取占位文字 */
const PaperLocale = createContext<Locale>('zh')
const usePaperLocale = () => useContext(PaperLocale)

/** 统一渲染器：编辑、预览、打印共用。是否可编辑由 EditContext 决定。 */
export function Resume({ doc, tools, className }: Props) {
  const t = doc.theme
  const visible = doc.sections.filter((s) => !s.hidden)
  const aside = t.layout === 'aside-left' || t.layout === 'aside-right'
  const asideSections = aside
    ? visible.filter((s) => t.aside.includes(s.kind))
    : []
  const mainSections = aside
    ? visible.filter((s) => !t.aside.includes(s.kind))
    : visible
  const editable = !!useEdit()
  const sections = (list: Section[]) =>
    list.map((s) => (
      <SectionView key={s.id} section={s} theme={t} tools={tools} />
    ))

  return (
    <article
      className={`r-paper ${className ?? ''}`}
      style={themeVars(t) as CSSProperties}
      {...themeAttrs(t)}
      data-editable={editable || undefined}
      lang={doc.locale === 'en' ? 'en' : 'zh-CN'}
    >
      <PaperLocale.Provider value={doc.locale}>
        {aside ? (
          <>
            <aside className='r-aside'>
              <Photo doc={doc} />
              <Contacts doc={doc} />
              {sections(asideSections)}
            </aside>
            <div className='r-main'>
              <Header doc={doc} tools={tools} withContacts={false} />
              {sections(mainSections)}
            </div>
          </>
        ) : (
          <>
            <Header doc={doc} tools={tools} withContacts />
            {sections(mainSections)}
          </>
        )}
      </PaperLocale.Provider>
    </article>
  )
}

function Photo({ doc }: { doc: ResumeDoc }) {
  if (doc.theme.header.photo === 'none' || !doc.profile.photo) return null
  return (
    <img
      className='r-photo'
      data-shape={doc.theme.header.photo}
      src={doc.profile.photo}
      alt=''
    />
  )
}

function Header({
  doc,
  tools,
  withContacts,
}: {
  doc: ResumeDoc
  tools?: Tools
  withContacts: boolean
}) {
  const edit = useEdit()
  const ph = M[doc.locale]
  const p = doc.profile
  const target = { itemId: 'profile' }
  return (
    <header className='r-header' data-item='profile'>
      {tools?.header?.()}
      {withContacts && <Photo doc={doc} />}
      <div className='r-id'>
        <Field
          as='h1'
          className='r-name'
          fkey='profile:name'
          value={p.name}
          placeholder={ph.name}
          target={target}
          onChange={(v) =>
            edit?.update((d) => setPersonName(d, v), 'profile:name')
          }
        />
        <Field
          as='p'
          className='r-headline'
          fkey='profile:headline'
          value={p.headline}
          placeholder={ph.headline}
          target={target}
          onChange={(v) =>
            edit?.update((d) => {
              d.profile.headline = v
            }, 'profile:headline')
          }
        />
        {withContacts && <Contacts doc={doc} />}
      </div>
    </header>
  )
}

function Contacts({ doc }: { doc: ResumeDoc }) {
  const edit = useEdit()
  const list = edit
    ? doc.profile.contacts
    : doc.profile.contacts.filter((c) => c.value.trim())
  if (list.length === 0) return null
  return (
    <ul className='r-contacts'>
      {list.map((c) => (
        <li key={c.id} data-kind={c.kind}>
          {edit ? (
            <Field
              fkey={`contact:${c.id}`}
              value={c.value}
              placeholder={CONTACT_META[c.kind].placeholder[doc.locale]}
              target={{ itemId: 'profile' }}
              onChange={(v) =>
                edit.update((d) => {
                  const found = d.profile.contacts.find((x) => x.id === c.id)
                  if (found) found.value = v
                }, `contact:${c.id}`)
              }
            />
          ) : (
            <ContactLink contact={c} />
          )}
        </li>
      ))}
    </ul>
  )
}

function ContactLink({ contact }: { contact: Contact }) {
  const v = contact.value.trim()
  if (
    contact.kind === 'location' ||
    contact.kind === 'text' ||
    contact.kind === 'wechat'
  )
    return <span>{v}</span>
  return (
    <a href={toHref(v)} target='_blank' rel='noreferrer'>
      {v.replace(/^https?:\/\//, '')}
    </a>
  )
}

function SectionView({
  section,
  theme,
  tools,
}: {
  section: Section
  theme: Theme
  tools?: Tools
}) {
  const edit = useEdit()
  const locale = usePaperLocale()
  // 编辑时 dt/dd 是可编辑文本框，不能再放在 <dl> 里
  const Rows = edit ? 'div' : 'dl'
  const items = edit ? section.items : section.items.filter((i) => !i.hidden)
  if (!edit && !hasContent(section)) return null
  return (
    <section
      className='r-section'
      data-section={section.id}
      data-kind={section.kind}
      data-layout={section.layout}
    >
      {tools?.section?.(section)}
      <h2 className='r-heading'>
        <Field
          fkey={`${section.id}:title`}
          value={section.title}
          placeholder={KIND_META[section.kind][locale]}
          target={{ sectionId: section.id }}
          onChange={(v) =>
            edit?.update((d) => {
              const s = d.sections.find((x) => x.id === section.id)
              if (s) s.title = v
            }, `${section.id}:title`)
          }
        />
      </h2>
      <div className='r-body'>
        {section.layout === 'rows' ? (
          <Rows className='r-rows'>
            {items.map((item, index) => (
              <Row
                key={item.id}
                section={section}
                item={item}
                index={index}
                tools={tools}
                theme={theme}
              />
            ))}
          </Rows>
        ) : (
          items.map((item, index) =>
            section.layout === 'text' ? (
              <TextBlock
                key={item.id}
                section={section}
                item={item}
                index={index}
                tools={tools}
              />
            ) : (
              <Entry
                key={item.id}
                section={section}
                item={item}
                index={index}
                theme={theme}
                tools={tools}
              />
            )
          )
        )}
      </div>
    </section>
  )
}

function hasContent(section: Section) {
  return section.items.some(
    (i) =>
      !i.hidden &&
      [i.title, i.subtitle, i.text, ...i.bullets].some((v) => v.trim())
  )
}

/** 修改某个条目的工具函数 */
function useItemUpdate(sectionId: string, itemId: string) {
  const edit = useEdit()
  return (patch: (item: Item) => void, coalesce?: string) =>
    edit?.update((d) => {
      const item = d.sections
        .find((s) => s.id === sectionId)
        ?.items.find((i) => i.id === itemId)
      if (item) patch(item)
    }, coalesce)
}

interface ItemProps {
  section: Section
  item: Item
  index: number
  tools?: Tools
  theme: Theme
}

function Entry({ section, item, index, theme, tools }: ItemProps) {
  const set = useItemUpdate(section.id, item.id)
  const k = (f: string) => `${item.id}:${f}`
  const target = { sectionId: section.id, itemId: item.id }
  const locale = usePaperLocale()
  const ph = M[locale]
  const [titlePh, subPh] =
    ITEM_PH[locale][section.kind] ?? ITEM_PH[locale].custom
  const field = (
    name: 'title' | 'subtitle' | 'location' | 'tags',
    className: string,
    placeholder: string
  ) => (
    <Field
      fkey={k(name)}
      className={className}
      value={item[name]}
      placeholder={placeholder}
      target={target}
      onChange={(v) =>
        set((i) => {
          i[name] = v
        }, k(name))
      }
    />
  )
  const date = (name: 'start' | 'end', placeholder: string) => (
    <Field
      as='time'
      fkey={k(name)}
      className={`r-${name}`}
      value={item[name]}
      display={formatDate(item[name], theme.date)}
      placeholder={placeholder}
      target={target}
      onChange={(v) =>
        set((i) => {
          i[name] = v
        }, k(name))
      }
    />
  )
  const edit = useEdit()
  const hasDate = !!(item.start.trim() || item.end.trim())
  return (
    <div
      className='r-entry'
      data-item={item.id}
      data-hidden={item.hidden || undefined}
    >
      {tools?.item?.(section, item, index)}
      <div className='r-entry-head'>
        <div className='r-entry-main'>
          {field('title', 'r-title', titlePh)}
          {field('subtitle', 'r-sub', subPh)}
          {field('location', 'r-loc r-opt', ph.location)}
        </div>
        {(edit || hasDate) && (
          <div
            className='r-date'
            data-open={item.start && !item.end ? '' : undefined}
          >
            {date('start', ph.start)}
            {(edit || (item.start.trim() && item.end.trim())) && (
              <span className='r-dash' aria-hidden>
                {' – '}
              </span>
            )}
            {date('end', ph.end)}
          </div>
        )}
      </div>
      {(edit || item.links.length > 0 || item.tags.trim()) && (
        <div className='r-meta'>
          {edit ? (
            <Field
              fkey={k('links')}
              className='r-links r-opt'
              value={item.links.join('  ')}
              placeholder={ph.links}
              target={target}
              onChange={(v) =>
                set((i) => {
                  i.links = v
                    .split(/\s{2,}|[,，]\s*/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                }, k('links'))
              }
            />
          ) : (
            item.links.length > 0 && (
              <span className='r-links'>
                {item.links.map((l) => (
                  <a key={l} href={toHref(l)} target='_blank' rel='noreferrer'>
                    {l.replace(/^https?:\/\//, '')}
                  </a>
                ))}
              </span>
            )
          )}
          {field('tags', 'r-tags r-opt', ph.tags)}
        </div>
      )}
      {(item.text || !edit) && (
        <Field
          as='p'
          fkey={k('text')}
          className='r-text'
          value={item.text}
          rich
          placeholder={ph.text}
          target={target}
          onChange={(v) =>
            set((i) => {
              i.text = v
            }, k('text'))
          }
        />
      )}
      <Bullets
        base={k('b')}
        items={item.bullets}
        target={target}
        locale={locale}
        placeholder={ph.bullets}
        onChange={(next, coalesce) =>
          set((i) => {
            i.bullets = next
          }, coalesce)
        }
      />
    </div>
  )
}

function Row({ section, item, index, tools }: ItemProps) {
  const set = useItemUpdate(section.id, item.id)
  const k = (f: string) => `${item.id}:${f}`
  const target = { sectionId: section.id, itemId: item.id }
  const edit = useEdit()
  const ph = M[usePaperLocale()]
  const chips = item.text.split(/[,，、;；]\s*/).filter((s) => s.trim())
  return (
    <div
      className='r-row'
      data-item={item.id}
      data-hidden={item.hidden || undefined}
    >
      {tools?.item?.(section, item, index)}
      <Field
        as='dt'
        fkey={k('title')}
        value={item.title}
        placeholder={ph.rowTitle}
        target={target}
        onChange={(v) =>
          set((i) => {
            i.title = v
          }, k('title'))
        }
      />
      {edit ? (
        <Field
          as='dd'
          fkey={k('text')}
          value={item.text}
          rich
          placeholder={ph.rowText}
          target={target}
          onChange={(v) =>
            set((i) => {
              i.text = v
            }, k('text'))
          }
        />
      ) : (
        <dd>
          <span className='r-plain'>
            <Inline text={item.text} />
          </span>
          <span className='r-chips'>
            {chips.map((c, i) => (
              <span key={i} className='r-chip'>
                <Inline text={c.trim()} />
              </span>
            ))}
          </span>
        </dd>
      )}
    </div>
  )
}

function TextBlock({ section, item, index, tools }: Omit<ItemProps, 'theme'>) {
  const set = useItemUpdate(section.id, item.id)
  const k = (f: string) => `${item.id}:${f}`
  const target = { sectionId: section.id, itemId: item.id }
  const locale = usePaperLocale()
  const useBullets = item.bullets.length > 0
  return (
    <div
      className='r-textblock'
      data-item={item.id}
      data-hidden={item.hidden || undefined}
    >
      {tools?.item?.(section, item, index)}
      {(!useBullets || item.text) && (
        <Field
          as='p'
          className='r-text'
          fkey={k('text')}
          value={item.text}
          rich
          placeholder={KIND_META[section.kind].hint[locale] || M[locale].write}
          target={target}
          onChange={(v) =>
            set((i) => {
              i.text = v
            }, k('text'))
          }
        />
      )}
      {useBullets && (
        <Bullets
          base={k('b')}
          items={item.bullets}
          target={target}
          locale={locale}
          onChange={(next, c) =>
            set((i) => {
              i.bullets = next
            }, c)
          }
        />
      )}
    </div>
  )
}
