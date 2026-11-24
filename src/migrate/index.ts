import { fromJsonResume, isJsonResume } from '../export/jsonresume'
import type { ResumeDoc, Snapshot } from '../model/types'
import { isRec, normalizeDoc, type Rec } from './normalize'
import { convertV2Document, convertV2Histories } from './v2'

export { normalizeDoc } from './normalize'
export { convertV2Document } from './v2'

export const BUNDLE_FORMAT = 'iresume'

export interface ResumeBundle {
  format: typeof BUNDLE_FORMAT
  schema: 3
  exportedAt: string
  docs: ResumeDoc[]
}

export function toBundle(docs: ResumeDoc[]): ResumeBundle {
  return {
    format: BUNDLE_FORMAT,
    schema: 3,
    exportedAt: new Date().toISOString(),
    docs,
  }
}

export type ImportSource =
  | 'v3-bundle'
  | 'v3-doc'
  | 'v2-workspace'
  | 'v2-library'
  | 'v2-backup'
  | 'v2-data'
  | 'json-resume'

export interface ImportResult {
  source: ImportSource
  docs: ResumeDoc[]
  /** 随数据一起带来的历史版本（目前来自 2.x 工作区） */
  snapshots?: Snapshot[]
}

/**
 * 识别任意 iResume 导出 / 备份 / 存储格式并转换为 v3 文档。
 * 无法识别时抛出错误，绝不返回「默认数据」冒充导入结果。
 */
export function importAny(value: unknown): ImportResult {
  if (!isRec(value)) throw new Error('文件内容不是 iResume 数据')

  if (value.format === BUNDLE_FORMAT && Array.isArray(value.docs)) {
    return { source: 'v3-bundle', docs: value.docs.map(normalizeDoc) }
  }
  if (isJsonResume(value)) {
    return { source: 'json-resume', docs: [fromJsonResume(value as Rec)] }
  }
  if (value.schema === 3) {
    return { source: 'v3-doc', docs: [normalizeDoc(value)] }
  }
  if (isRec(value.library) && Array.isArray(value.library.documents)) {
    return {
      source: 'v2-workspace',
      snapshots: convertV2Histories(value.histories),
      docs: value.library.documents.map(convertV2Document),
    }
  }
  if (Array.isArray(value.documents)) {
    return {
      source: 'v2-library',
      docs: value.documents.map(convertV2Document),
    }
  }
  if (isRec(value.data) && isRec(value.data.personal)) {
    return {
      source: 'v2-backup',
      docs: [
        convertV2Document({ data: value.data, appearance: value.appearance }),
      ],
    }
  }
  if (isRec(value.personal)) {
    return { source: 'v2-data', docs: [convertV2Document({ data: value })] }
  }
  throw new Error('无法识别的文件格式')
}
