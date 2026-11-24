import { normalizeTheme } from './normalize'
import { presetById } from './presets'
import type { Theme } from './types'

/**
 * 主题分享链接：只编码与来源预设不同的字段，链接通常不到 200 个字符。
 * 形如 https://…/#/theme/<base64url(JSON)>，打开时由 normalizeTheme 补全并校验。
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

function diff(a: Json, base: Json): Json | undefined {
  if (
    a &&
    base &&
    typeof a === 'object' &&
    typeof base === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(base)
  ) {
    const out: Record<string, Json> = {}
    for (const [k, v] of Object.entries(a)) {
      const d = diff(v, base[k] ?? null)
      if (d !== undefined) out[k] = d
    }
    return Object.keys(out).length ? out : undefined
  }
  return JSON.stringify(a) === JSON.stringify(base) ? undefined : a
}

const toB64url = (text: string) => {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeTheme(theme: Theme): string {
  const base = presetById(theme.preset)?.theme
  const d = base
    ? diff(theme as unknown as Json, base as unknown as Json)
    : theme
  return toB64url(
    JSON.stringify({ ...(d as object), preset: theme.preset, name: theme.name })
  )
}

/** 解析失败返回 null；成功时返回经过完整校验的主题 */
export function decodeTheme(payload: string): Theme | null {
  if (!payload || payload.length > 4000) return null
  try {
    return normalizeTheme(JSON.parse(fromB64url(payload)))
  } catch {
    return null
  }
}

export const THEME_ROUTE = '#/theme/'

export const themeLink = (
  theme: Theme,
  base = `${location.origin}${location.pathname}`
) => `${base}${THEME_ROUTE}${encodeTheme(theme)}`
