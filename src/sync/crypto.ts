/**
 * 端到端加密：口令只在本机参与运算，GitHub 与 iResume 服务端都无法解密。
 * PBKDF2-SHA256 派生 AES-GCM 256 位密钥，密钥不可导出；
 * 信封的格式与 KDF 参数作为附加认证数据（AAD）参与校验，防止被篡改。
 */

export const FORMAT = 'iresume.sync.v3'
export const ITERATIONS = 600_000

export interface Envelope {
  format: typeof FORMAT
  kdf: { name: 'PBKDF2-SHA256'; salt: string; iterations: number }
  cipher: 'AES-GCM'
  iv: string
  data: string
}

/** 派生好的密钥与它对应的 KDF 参数 */
export interface SyncKey {
  key: CryptoKey
  salt: string
  iterations: number
}

export class WrongPassphrase extends Error {
  constructor() {
    super('同步口令不正确')
  }
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const randomSalt = () =>
  toBase64(crypto.getRandomValues(new Uint8Array(16)))

export async function deriveKey(
  passphrase: string,
  salt: string,
  iterations = ITERATIONS
): Promise<SyncKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  return { key, salt, iterations }
}

const aad = (salt: string, iterations: number) =>
  enc.encode(`${FORMAT}|PBKDF2-SHA256|${salt}|${iterations}`)

export async function seal(k: SyncKey, payload: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(k.salt, k.iterations) },
    k.key,
    enc.encode(JSON.stringify(payload))
  )
  const envelope: Envelope = {
    format: FORMAT,
    kdf: { name: 'PBKDF2-SHA256', salt: k.salt, iterations: k.iterations },
    cipher: 'AES-GCM',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  }
  return JSON.stringify(envelope)
}

export function parseEnvelope(content: string): Envelope {
  let v: Partial<Envelope>
  try {
    v = JSON.parse(content)
  } catch {
    throw new Error('云端文件不是有效的 JSON')
  }
  if (
    v.format !== FORMAT ||
    v.cipher !== 'AES-GCM' ||
    v.kdf?.name !== 'PBKDF2-SHA256' ||
    typeof v.kdf.salt !== 'string' ||
    !Number.isInteger(v.kdf.iterations) ||
    v.kdf.iterations < 100_000 ||
    typeof v.iv !== 'string' ||
    typeof v.data !== 'string'
  )
    throw new Error('云端文件格式不正确')
  return v as Envelope
}

export async function open(k: SyncKey, envelope: Envelope): Promise<unknown> {
  if (envelope.kdf.salt !== k.salt || envelope.kdf.iterations !== k.iterations)
    throw new WrongPassphrase()
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(envelope.iv),
        additionalData: aad(k.salt, k.iterations),
      },
      k.key,
      fromBase64(envelope.data)
    )
    return JSON.parse(dec.decode(plain))
  } catch {
    throw new WrongPassphrase()
  }
}

/** 2.x 的旧信封：服务端派生的原始 AES 密钥，仅用于一次性导入 */
export async function openLegacy(
  content: string,
  rawKey: string
): Promise<unknown> {
  const v = JSON.parse(content) as {
    format?: string
    iv?: string
    data?: string
  }
  if (v.format !== 'iresume.gist-sync.v2' || !v.iv || !v.data)
    throw new Error('不是 2.x 的同步文件')
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(rawKey),
    'AES-GCM',
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(v.iv) },
    key,
    fromBase64(v.data)
  )
  return JSON.parse(dec.decode(plain))
}
