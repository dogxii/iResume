import { useSyncExternalStore } from 'react'
import type { Locale } from '../model/types'

/**
 * 界面语言（中文 / 英文）。与简历本身的语言（ResumeDoc.locale）相互独立：
 * - 界面上的按钮、提示、批注跟随这里；
 * - 纸面上的内容（区块默认标题、占位文字、「至今」）跟随简历自己的 locale。
 *
 * 文案与组件放在一起：每个文件用 defineMessages 声明中英两份，
 * 英文缺键或类型不符会在编译时报错。
 */

export type Lang = Locale

const KEY = 'iresume-lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* 隐私模式下 localStorage 不可用 */
  }
  const prefs =
    typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
  for (const p of prefs) {
    const l = p?.toLowerCase() ?? ''
    if (l.startsWith('zh')) return 'zh'
    if (l.startsWith('en')) return 'en'
  }
  return 'zh'
}

let lang: Lang = detect()
const listeners = new Set<() => void>()

function applyToDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
}
applyToDocument()

export const getLang = () => lang

export function setLang(next: Lang) {
  if (next === lang) return
  lang = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* 忽略 */
  }
  applyToDocument()
  for (const l of listeners) l()
}

export const useLang = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getLang,
    getLang
  )

/** BCP 47 标签，用于 Intl 与日期格式化 */
export const intlLocale = (l: Lang = lang) => (l === 'en' ? 'en-US' : 'zh-CN')

// biome-ignore lint/suspicious/noExplicitAny: 文案可以是带参数的函数
type Dict = Record<string, string | ((...args: any[]) => string)>
export interface Messages<T extends Dict> {
  zh: T
  en: T
}

/** 声明一组文案：英文必须与中文的键和参数完全对应 */
export const defineMessages = <T extends Dict>(
  zh: T,
  en: NoInfer<T>
): Messages<T> => ({ zh, en })

/** 组件内取文案，语言切换时自动重渲染 */
export const useT = <T extends Dict>(m: Messages<T>): T => m[useLang()]

/** 非组件代码取文案（取调用时的语言） */
export const tr = <T extends Dict>(m: Messages<T>): T => m[lang]
