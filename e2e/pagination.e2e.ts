import { expect, test } from '@playwright/test'
import { PRESETS } from '../src/theme/presets'
import {
  exportPdf,
  importDocs,
  longDoc,
  openDoc,
  openHome,
  pdfPages,
} from './helpers'

// 逐页预览、编辑器页数与导出的 PDF 必须一致
for (const { theme } of PRESETS) {
  test(`分页一致：${theme.name}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '只有 Chromium 能自动生成 PDF')
    await openHome(page)
    const doc = longDoc(theme)
    await importDocs(page, [doc])
    await openDoc(page, doc.name)
    const fit = await page.locator('.e-fit').innerText()
    const pages = Number(fit.match(/(\d+) 页/)?.[1])
    expect(pages).toBeGreaterThan(1)

    await page.getByRole('button', { name: '预览' }).click()
    await expect(page.locator('.e-page')).toHaveCount(pages)
    await page.keyboard.press('Escape')

    // 孤行标题的显式换页（给 Firefox / Safari 用）在 Chromium 上必须与它自己的分页一致
    const pdf = await exportPdf(page)
    expect(pdfPages(pdf)).toBe(pages)
  })
}
