export type MarkdownLineBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

const markdownListMarkerPattern = /^[-*]\s+(.+)$/

export function parseMarkdownBlocks(text: string): MarkdownLineBlock[] {
  const blocks: MarkdownLineBlock[] = []
  let pendingList: string[] = []

  const flushList = () => {
    if (pendingList.length === 0) return
    blocks.push({ type: 'list', items: pendingList })
    pendingList = []
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    const listMatch = line.match(markdownListMarkerPattern)
    if (listMatch) {
      pendingList.push(listMatch[1].trim())
      continue
    }

    flushList()
    blocks.push({ type: 'paragraph', text: line })
  }

  flushList()
  return blocks
}
