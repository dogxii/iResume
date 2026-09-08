export type PreviewPageMode = 'continuous' | 'paged'

export const DEFAULT_PREVIEW_PAGE_MODE: PreviewPageMode = 'continuous'

export const normalizePreviewPageMode = (value: unknown): PreviewPageMode =>
  value === 'paged' ? 'paged' : DEFAULT_PREVIEW_PAGE_MODE
