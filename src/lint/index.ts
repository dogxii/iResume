import { defineMessages, tr } from '../i18n'
import { dateOrdinal, parseDate } from '../model/dates'
import { plainText } from '../model/inline'
import type { Item, ResumeDoc, Section } from '../model/types'

export type Level = 'warn' | 'tip'

export interface Suggestion {
  /** 稳定 id：规则 + 目标 + 内容摘要；内容改变后旧的忽略记录自动失效 */
  id: string
  rule: string
  level: Level
  /** 批注对齐的目标：'profile' 或条目 id */
  target: string
  sectionId?: string
  bullet?: number
  title: string
  detail: string
}

const WEAK =
  /^(参与|协助|负责|帮助|配合|跟进|辅助|了解|熟悉|assisted|helped|responsible for|worked on|participated|involved in)/i
const NUMBER =
  /\d|[一二三四五六七八九十百千万两]+\s*(倍|个|人|项|家|次|条|款|万|成)|翻倍|减半/
const FIRST_PERSON = /(?<!自)我|本人|\b(I|my|me)\b/
const ACHIEVEMENT_KINDS = new Set(['experience', 'projects'])

const M = defineMessages(
  {
    quantifyTitle: '缺少量化结果',
    quantifyDetail:
      '加一个数字：提升了多少、覆盖多少用户、节省多少时间？有数字的要点更可信。',
    weakTitle: (word: string) => `「${word}」开头偏弱`,
    weakDetail: '换成能体现你作用的动词：主导、设计、实现、推动、优化……',
    tooManyTitle: (n: number) => `要点有 ${n} 条`,
    tooManyDetail: '每段经历保留 3–5 条最有说服力的即可，其余可以删去或合并。',
    noDateTitle: '缺少时间',
    noDateDetail: '补上起止时间，招聘方会据此判断经验长度。',
    longTitle: '这条要点偏长',
    longDetail: '超过两行的要点不易扫读，试着拆成两条，或删掉修饰语。',
    firstPersonTitle: '避免使用第一人称',
    firstPersonDetail: '简历默认主语就是你，去掉「我」「本人」会更精炼。',
    badDateTitle: (value: string) => `无法识别日期「${value}」`,
    badDateDetail: '建议写成 2023.07 或「至今」，主题才能统一格式。',
    punctuationTitle: '句末标点不统一',
    punctuationDetail: '要点结尾统一不加句号，或统一都加。',
    contactTitle: '联系方式不完整',
    contactDetail: '至少留下邮箱和电话，方便招聘方第一时间联系你。',
    photoTitle: '英文简历通常不放照片',
    photoDetail: '欧美招聘普遍不要求照片，部分公司会因反歧视规定直接过滤。',
    orderTitle: '经历不是倒序排列',
    orderDetail: '把最近的经历放在最前面，招聘方最关心你现在在做什么。',
    summaryTitle: '简介偏长',
    summaryDetail: '控制在三行以内，只写最能代表你的两三点。',
  },
  {
    quantifyTitle: 'Add a measurable result',
    quantifyDetail:
      'Add a number: how much faster, how many users, how much time saved? Bullets with numbers are more convincing.',
    weakTitle: (word: string) => `“${word}” is a weak opener`,
    weakDetail:
      'Lead with a verb that shows your impact: Led, Designed, Built, Shipped, Improved…',
    tooManyTitle: (n: number) => `${n} bullets`,
    tooManyDetail:
      'Keep the 3–5 strongest bullets per role. Cut or merge the rest.',
    noDateTitle: 'Missing dates',
    noDateDetail:
      'Add start and end dates. Recruiters use them to gauge your experience.',
    longTitle: 'This bullet is long',
    longDetail:
      'Bullets over two lines are hard to scan. Split it in two or trim the qualifiers.',
    firstPersonTitle: 'Avoid first person',
    firstPersonDetail:
      'The subject of a resume is always you. Dropping “I” and “my” reads tighter.',
    badDateTitle: (value: string) => `Unrecognized date “${value}”`,
    badDateDetail:
      'Use a format like 2023.07 or “Present” so the theme can format it consistently.',
    punctuationTitle: 'Inconsistent punctuation',
    punctuationDetail: 'End either all bullets or none of them with a period.',
    contactTitle: 'Incomplete contact info',
    contactDetail:
      'Include at least an email and a phone number so recruiters can reach you quickly.',
    photoTitle: 'English resumes usually skip the photo',
    photoDetail:
      'Most US and European employers don’t expect a photo, and some filter them out under anti-discrimination rules.',
    orderTitle: 'Experience isn’t in reverse order',
    orderDetail:
      'Put your most recent role first. Recruiters care most about what you’re doing now.',
    summaryTitle: 'Summary is long',
    summaryDetail:
      'Keep it under three lines, with the two or three points that define you best.',
  }
)

/** 简单哈希，用于让忽略记录与内容绑定 */
function hash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++)
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const visualLength = (text: string) =>
  [...text].reduce((n, ch) => n + (/[⺀-鿿＀-￯]/.test(ch) ? 1 : 0.55), 0)

function itemRules(section: Section, item: Item, doc: ResumeDoc): Suggestion[] {
  const t = tr(M)
  const out: Suggestion[] = []
  const bullets = item.bullets.map(plainText).filter((b) => b.trim())
  const all = [item.text, ...bullets].map(plainText).join('\n')
  const make = (
    rule: string,
    level: Level,
    title: string,
    detail: string,
    bullet?: number,
    key = ''
  ) => ({
    id: `${rule}:${item.id}:${hash(key || all)}`,
    rule,
    level,
    target: item.id,
    sectionId: section.id,
    bullet,
    title,
    detail,
  })

  if (section.layout === 'entries' && ACHIEVEMENT_KINDS.has(section.kind)) {
    if (bullets.length > 0 && !bullets.some((b) => NUMBER.test(b))) {
      out.push(make('quantify', 'warn', t.quantifyTitle, t.quantifyDetail))
    }
    bullets.forEach((b, index) => {
      const weak = b.match(WEAK)
      if (weak) {
        out.push(
          make(
            'weak-verb',
            'warn',
            t.weakTitle(weak[0]),
            t.weakDetail,
            index,
            b
          )
        )
      }
    })
    if (bullets.length > 6) {
      out.push(
        make('too-many', 'tip', t.tooManyTitle(bullets.length), t.tooManyDetail)
      )
    }
    if (!item.start.trim() && (item.title.trim() || bullets.length)) {
      out.push(make('no-date', 'tip', t.noDateTitle, t.noDateDetail))
    }
  }

  bullets.forEach((b, index) => {
    const limit = doc.locale === 'en' ? 120 : 70
    if (visualLength(b) > limit) {
      out.push(make('long', 'tip', t.longTitle, t.longDetail, index, b))
    }
  })

  if (FIRST_PERSON.test(all)) {
    out.push(
      make('first-person', 'tip', t.firstPersonTitle, t.firstPersonDetail)
    )
  }

  for (const value of [item.start, item.end]) {
    if (parseDate(value)?.kind === 'raw') {
      out.push(
        make(
          'bad-date',
          'tip',
          t.badDateTitle(value.trim()),
          t.badDateDetail,
          undefined,
          value
        )
      )
      break
    }
  }

  const endings = bullets.map((b) => /[。.;；]$/.test(b.trim()))
  if (endings.length >= 2 && endings.some(Boolean) && endings.some((e) => !e)) {
    out.push(
      make('punctuation', 'tip', t.punctuationTitle, t.punctuationDetail)
    )
  }
  return out
}

export function lint(doc: ResumeDoc): Suggestion[] {
  const t = tr(M)
  const out: Suggestion[] = []
  const contacts = doc.profile.contacts.filter((c) => c.value.trim())
  if (
    !contacts.some((c) => c.kind === 'email') ||
    !contacts.some((c) => c.kind === 'phone')
  ) {
    out.push({
      id: `contact:profile:${hash(contacts.map((c) => c.kind).join())}`,
      rule: 'contact',
      level: 'warn',
      target: 'profile',
      title: t.contactTitle,
      detail: t.contactDetail,
    })
  }
  if (
    doc.locale === 'en' &&
    doc.profile.photo &&
    doc.theme.header.photo !== 'none'
  ) {
    out.push({
      id: 'photo:profile',
      rule: 'photo',
      level: 'tip',
      target: 'profile',
      title: t.photoTitle,
      detail: t.photoDetail,
    })
  }

  for (const section of doc.sections) {
    if (section.hidden) continue
    const items = section.items.filter((i) => !i.hidden)
    for (const item of items) out.push(...itemRules(section, item, doc))

    if (section.kind === 'experience' && section.layout === 'entries') {
      const starts = items.map((i) => dateOrdinal(i.start))
      const sorted = starts.every(
        (s, i) =>
          i === 0 ||
          s === null ||
          starts[i - 1] === null ||
          (starts[i - 1] as number) >= s
      )
      if (!sorted && items[0]) {
        out.push({
          id: `order:${section.id}:${hash(starts.join())}`,
          rule: 'order',
          level: 'warn',
          target: items[0].id,
          sectionId: section.id,
          title: t.orderTitle,
          detail: t.orderDetail,
        })
      }
    }
    if (section.kind === 'summary') {
      const text = items
        .map((i) => plainText([i.text, ...i.bullets].join('')))
        .join('')
      if (visualLength(text) > 160 && items[0]) {
        out.push({
          id: `summary-long:${items[0].id}:${hash(text)}`,
          rule: 'summary-long',
          level: 'tip',
          target: items[0].id,
          sectionId: section.id,
          title: t.summaryTitle,
          detail: t.summaryDetail,
        })
      }
    }
  }
  const dismissed = new Set(doc.dismissed)
  return out.filter((s) => !dismissed.has(s.id))
}
