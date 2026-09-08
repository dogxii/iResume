import { describe, expect, it } from 'vitest'
import { createResumeBackup, normalizeResumeBackup } from './resumeBackup'
import {
  createResumeDocument,
  normalizeResumeAppearance,
} from './resumeLibrary'

describe('resume section icon appearance', () => {
  it('normalizes missing and invalid icon values to safe defaults', () => {
    const appearance = normalizeResumeAppearance({
      sectionIconNames: {
        skills: 'rocket',
        experience: 'not-an-icon',
      },
      sectionIconSizePx: 19,
    })

    expect(appearance.sectionIconNames.skills).toBe('rocket')
    expect(appearance.sectionIconNames.experience).toBe('briefcase')
    expect(appearance.sectionIconNames.projects).toBe('folder')
    expect(appearance.sectionIconSizePx).toBe(13)
  })

  it('preserves icon selections and size in resume backups', () => {
    const document = createResumeDocument()
    document.appearance.sectionIconNames.projects = 'trophy'
    document.appearance.sectionIconSizePx = 18

    const imported = normalizeResumeBackup(
      createResumeBackup(document.data, document.appearance)
    )

    expect(imported.sectionIconNames?.projects).toBe('trophy')
    expect(imported.sectionIconSizePx).toBe(18)
  })
})
