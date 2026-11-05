import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TemplateResumePreview from '../components/TemplateResumePreview'
import type { ResumeData } from '../types/resume'
import { initialResumeState } from './initialData'
import { createResumeBackup, normalizeResumeBackup } from './resumeBackup'
import { normalizeResumeData } from './resumeData'
import {
  addSnapshot,
  createDocumentHistory,
  createSnapshotDiff,
} from './resumeHistory'
import { createResumeDocument, normalizeResumeDocument } from './resumeLibrary'
import { createResumeMarkdown } from './resumeMarkdown'
import {
  DEFAULT_SECTION_PREFERENCES,
  normalizeResumeSectionPreferences,
} from './resumeStyle'
import { templateIds } from './templateConfigs'

const competitionName = '全国大学生数学建模竞赛'
const createAwardData = (): ResumeData => ({
  ...structuredClone(initialResumeState),
  sectionOrder: ['awards', 'campus'],
  sectionVisibility: {
    ...initialResumeState.sectionVisibility,
    awards: true,
    campus: true,
  },
  awards: [
    {
      id: 1,
      competitionName,
      title: '全国一等奖',
      subtitle: '赛事组委会',
      date: '2026.09',
      details: '- 完成建模与论文撰写',
    },
  ],
})

describe('award competition name', () => {
  it('preserves the field through document loading and JSON backup import', () => {
    const data = createAwardData()
    const document = createResumeDocument({ data })
    expect(normalizeResumeDocument(document, 0).data.awards).toEqual(
      data.awards
    )

    const backup = createResumeBackup(data, document.appearance)
    const restored = normalizeResumeBackup(JSON.parse(JSON.stringify(backup)))
    expect(restored.data.awards).toEqual(data.awards)
    expect(restored.data.campus).toEqual(data.campus)
  })

  it('accepts old awards and invalid field values without changing other fields', () => {
    for (const value of [undefined, null, 123, {}, []]) {
      const data = createAwardData()
      const { competitionName: _name, ...legacyAward } = data.awards[0]
      const restored = normalizeResumeData({
        ...data,
        awards: [{ ...legacyAward, competitionName: value }],
      })
      expect(restored.awards).toEqual([{ ...legacyAward, competitionName: '' }])
      expect(restored.campus).toEqual(data.campus)
    }
  })

  it('exports competition, award, issuer, date and details to Markdown', () => {
    const markdown = createResumeMarkdown(createAwardData())
    expect(markdown).toContain(
      '### 全国一等奖\n全国大学生数学建模竞赛\n赛事组委会 / 2026.09\n- 完成建模与论文撰写'
    )
  })

  it('reports changes to the competition name in history and preserves snapshots', () => {
    const before = createResumeDocument({ data: createAwardData() })
    const after = structuredClone(before)
    after.data.awards[0].competitionName = '另一场比赛'
    let history = addSnapshot(
      createDocumentHistory(),
      before,
      'before',
      '1.0.0'
    )
    history = addSnapshot(history, after, 'after', '1.0.1')
    expect(history.snapshots[1].document.data.awards[0].competitionName).toBe(
      competitionName
    )
    const diff = createSnapshotDiff(history.snapshots[1], history.snapshots[0])
    expect(diff.changes).toContainEqual(
      expect.objectContaining({
        scope: '获奖经历',
        detail: expect.stringContaining('比赛名称'),
      })
    )
  })

  it('does not report a content change when upgrading legacy awards', () => {
    const before = createResumeDocument({ data: createAwardData() })
    delete before.data.awards[0].competitionName
    const after = normalizeResumeDocument(before, 0)
    let history = addSnapshot(
      createDocumentHistory(),
      before,
      'before',
      '1.0.0'
    )
    history = addSnapshot(history, after, 'after', '1.0.1')
    expect(
      createSnapshotDiff(history.snapshots[1], history.snapshots[0]).changes
    ).toEqual([])
  })

  for (const templateId of templateIds) {
    it(`renders award information with template ${templateId}`, () => {
      const html = renderToStaticMarkup(
        <TemplateResumePreview
          data={createAwardData()}
          templateId={templateId}
        />
      )
      for (const text of [
        competitionName,
        '全国一等奖',
        '赛事组委会',
        '2026.09',
        '完成建模与论文撰写',
      ]) {
        expect(html).toContain(text)
      }
    })

    it(`shows competition-only awards and hides empty awards with template ${templateId}`, () => {
      const data = createAwardData()
      data.awards = [
        {
          id: 1,
          competitionName,
          title: '',
          subtitle: '',
          date: '',
          details: '',
        },
      ]
      expect(createResumeMarkdown(data)).toContain(competitionName)
      expect(
        renderToStaticMarkup(
          <TemplateResumePreview data={data} templateId={templateId} />
        )
      ).toContain(competitionName)
      data.awards[0].competitionName = '  '
      expect(createResumeMarkdown(data)).not.toContain('## 获奖经历')
      expect(
        renderToStaticMarkup(
          <TemplateResumePreview data={data} templateId={templateId} />
        )
      ).not.toContain('获奖经历')
    })

    it(`keeps legacy award rendering identical with template ${templateId}`, () => {
      const data = createAwardData()
      delete data.awards[0].competitionName
      const legacyHtml = renderToStaticMarkup(
        <TemplateResumePreview data={data} templateId={templateId} />
      )
      const legacyMarkdown = createResumeMarkdown(data)
      data.awards[0].competitionName = ''
      expect(
        renderToStaticMarkup(
          <TemplateResumePreview data={data} templateId={templateId} />
        )
      ).toBe(legacyHtml)
      expect(createResumeMarkdown(data)).toBe(legacyMarkdown)
    })
  }
})

describe('award title placement', () => {
  it('defaults award placement to the middle', () => {
    for (const awards of [
      undefined,
      null,
      {},
      { titlePosition: 'invalid' },
      { titlePosition: 'title' },
    ]) {
      const preferences = normalizeResumeSectionPreferences({ awards })
      expect(preferences.awards.titlePosition).toBe('middle')
      expect(preferences.experience).toEqual(
        DEFAULT_SECTION_PREFERENCES.experience
      )
    }
  })

  it.each(['middle', 'bottom'] as const)(
    'preserves %s placement through document loading and backup import',
    (titlePosition) => {
      const document = createResumeDocument({
        data: createAwardData(),
        appearance: {
          sectionPreferences: {
            ...DEFAULT_SECTION_PREFERENCES,
            awards: { titlePosition },
          },
        },
      })
      expect(
        normalizeResumeDocument(document, 0).appearance.sectionPreferences
          .awards.titlePosition
      ).toBe(titlePosition)
      const backup = createResumeBackup(document.data, document.appearance)
      expect(
        normalizeResumeBackup(JSON.parse(JSON.stringify(backup)))
          .sectionPreferences?.awards.titlePosition
      ).toBe(titlePosition)
    }
  )

  it('uses the default for removed placement while preserving other section settings', () => {
    const document = createResumeDocument({ data: createAwardData() })
    const backup = createResumeBackup(document.data, document.appearance)
    const raw = JSON.parse(JSON.stringify(backup))
    raw.appearance.sectionPreferences.awards.titlePosition = 'title'
    raw.appearance.sectionPreferences.experience.rolePosition = 'title'
    raw.appearance.sectionPreferences.projects.rolePosition = 'title'
    const restored = normalizeResumeBackup(raw)
    expect(restored.sectionPreferences?.awards.titlePosition).toBe('middle')
    expect(restored.sectionPreferences?.experience.rolePosition).toBe('title')
    expect(restored.sectionPreferences?.projects.rolePosition).toBe('title')
  })

  for (const templateId of templateIds) {
    it(`places awards correctly without affecting campus or legacy entries in ${templateId}`, () => {
      const data = createAwardData()
      const render = (titlePosition: 'middle' | 'bottom') =>
        renderToStaticMarkup(
          <TemplateResumePreview
            data={data}
            templateId={templateId}
            itemTitleFontSizePx={20}
            sectionPreferences={{
              ...DEFAULT_SECTION_PREFERENCES,
              awards: { titlePosition },
            }}
          />
        )
      const bottom = render('bottom')
      const middle = render('middle')
      for (const html of [bottom, middle]) {
        expect(html).toContain('--resume-item-title-font-size:20px')
        expect(html.split('全国一等奖')).toHaveLength(2)
        for (const text of [
          competitionName,
          '赛事组委会',
          '2026.09',
          '完成建模与论文撰写',
        ])
          expect(html).toContain(text)
        // Changing award placement must leave the entire campus section intact.
        const sections = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/g)
        const campus = sections?.at(-1)
        expect(campus).toContain('学生技术协会')
        expect(campus).toBe(
          bottom.match(/<section\b[^>]*>[\s\S]*?<\/section>/g)?.at(-1)
        )
      }
      if (templateId === 'structured') {
        expect(middle).toContain(
          '<span class="resume-item-title min-w-0 break-words text-center">全国一等奖</span>'
        )
        expect(bottom).toContain(`${competitionName}</span>全国一等奖</span>`)
      } else {
        expect(middle).toMatch(
          /<div class="min-w-0 justify-self-center text-center"><h3[^>]*>全国一等奖<\/h3><\/div>/
        )
        expect(bottom).toMatch(
          /全国大学生数学建模竞赛<\/div><\/div><h3[^>]*>全国一等奖<\/h3>/
        )
      }
      data.awards[0].competitionName = ''
      expect(render('middle')).toBe(render('bottom'))
    })
  }
})
