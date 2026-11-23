import { Fragment } from 'react'
import { parseInline } from '../model/inline'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`
  )

/** 行内语法 → HTML 字符串（用于可编辑字段失焦后的展示） */
export function inlineHtml(source: string): string {
  return parseInline(source)
    .map((t) =>
      t.type === 'bold'
        ? `<strong>${esc(t.text)}</strong>`
        : t.type === 'link'
          ? `<a href="${esc(t.href)}" target="_blank" rel="noreferrer">${esc(t.text)}</a>`
          : esc(t.text)
    )
    .join('')
}

/** 行内语法 → React 节点（只读渲染，与 inlineHtml 输出相同结构） */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((t, i) =>
        t.type === 'bold' ? (
          <strong key={i}>{t.text}</strong>
        ) : t.type === 'link' ? (
          <a key={i} href={t.href} target='_blank' rel='noreferrer'>
            {t.text}
          </a>
        ) : (
          <Fragment key={i}>{t.text}</Fragment>
        )
      )}
    </>
  )
}
