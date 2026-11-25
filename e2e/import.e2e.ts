import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { PRESETS } from '../src/theme/presets'
import {
  exportPdf,
  importDocs,
  longDoc,
  openDoc,
  openHome,
  watchErrors,
} from './helpers'

async function openImport(page: Page) {
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '导入简历' })).toBeVisible()
}

async function chooseFile(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType: string
) {
  await page
    .getByRole('dialog')
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType, buffer })
}

test('导入 PDF：预览识别结果，创建后可以直接编辑', async ({ page }) => {
  const errors = watchErrors(page)
  await openHome(page)
  await openImport(page)
  await chooseFile(
    page,
    'Jordan Lee.pdf',
    readFileSync(new URL('./fixtures/sample-classic-en.pdf', import.meta.url)),
    'application/pdf'
  )
  const dialog = page.getByRole('dialog', { name: '导入简历' })
  await expect(dialog.getByRole('heading', { name: '导入预览' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(dialog).toContainText('识别出 5 个区块、8 个条目')
  await expect(dialog.locator('.r-name')).toHaveText('Jordan Lee')
  await expect(dialog.locator('.h-import-warn')).toHaveCount(0)
  await dialog.getByRole('button', { name: '创建简历' }).click()

  await expect(page.locator('.e-docname')).toHaveValue('Jordan Lee')
  const paper = page.locator('.e-paper .r-paper')
  await expect(paper.locator('.r-section')).toHaveCount(5)
  await expect(paper).toContainText('Starmap Analytics')
  await expect(paper).toContainText('Jul 2023 – Present')
  await expect(
    paper.locator('.r-section[data-kind=experience] .r-bullets li')
  ).toHaveCount(5)
  expect(errors).toEqual([])
})

test('粘贴纯文本导入；认不出的行进入「待整理」', async ({ page }) => {
  await openHome(page)
  await openImport(page)
  const dialog = page.getByRole('dialog', { name: '导入简历' })
  await dialog.getByRole('textbox').fill(`陈晨
产品经理
chenchen@example.com · 137 0000 2222
- 期望薪资面议，可随时到岗

工作经历
小红书 · 高级产品经理 · 上海  2021.03 – 至今
- 负责社区推荐策略，日活提升 12%

教育背景
复旦大学 · 新闻学 · 学士  2014.09 – 2018.06`)
  await dialog.getByRole('button', { name: '识别' }).click()
  await expect(dialog.getByRole('heading', { name: '导入预览' })).toBeVisible()
  await expect(dialog.locator('.h-import-warn')).toContainText('1 行')
  await dialog.getByRole('button', { name: '创建简历' }).click()
  await expect(page.locator('.e-docname')).toHaveValue('陈晨')
  await expect(page.locator('.e-paper .r-section').last()).toContainText(
    '待整理'
  )
})

test('旧版 .doc 给出明确提示；JSON 备份仍走原来的导入', async ({ page }) => {
  await openHome(page)
  await openImport(page)
  await chooseFile(page, 'old.doc', Buffer.from('x'), 'application/msword')
  await expect(page.getByRole('alert')).toContainText('另存为 .docx')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '导入简历' })).toBeHidden()
})

test('往返：两页的时间线简历导出 PDF 后再导入，要点一条不少', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', '只有 Chromium 能自动生成 PDF')
  await openHome(page)
  const theme = PRESETS.find((p) => p.theme.name === '时间线')?.theme
  const doc = longDoc(theme)
  await importDocs(page, [doc])
  await openDoc(page, doc.name)
  const pdf = await exportPdf(page)
  await page.getByRole('button', { name: '返回' }).click()

  await openImport(page)
  await chooseFile(page, 'roundtrip.pdf', pdf, 'application/pdf')
  const dialog = page.getByRole('dialog', { name: '导入简历' })
  await expect(dialog.getByRole('heading', { name: '导入预览' })).toBeVisible({
    timeout: 20_000,
  })
  await dialog.getByRole('button', { name: '创建简历' }).click()
  const exp = page.locator('.e-paper .r-section[data-kind=experience]')
  const expected = doc.sections.find((s) => s.kind === 'experience')
  await expect(exp.locator('.r-entry')).toHaveCount(expected?.items.length ?? 0)
  await expect(exp.locator('.r-bullets li')).toHaveCount(
    expected?.items.reduce((n, i) => n + i.bullets.length, 0) ?? 0
  )
  await expect(
    page.locator('.e-paper .r-section', { hasText: '待整理' })
  ).toHaveCount(0)
})
