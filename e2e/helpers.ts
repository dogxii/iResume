import { expect, type Page } from '@playwright/test'
import { toBundle } from '../src/migrate'
import { createDoc } from '../src/model/defaults'
import type { ResumeDoc } from '../src/model/types'
import { PRESETS } from '../src/theme/presets'
import type { Theme } from '../src/theme/types'

/** 一份足够长、会排成多页的简历 */
export function longDoc(
  theme: Theme = PRESETS[0].theme,
  copies = 3
): ResumeDoc {
  const doc = createDoc({ sample: true, theme, name: `长简历 · ${theme.name}` })
  const exp = doc.sections.find((s) => s.kind === 'experience')
  if (exp) {
    const base = structuredClone(exp.items)
    for (let k = 1; k <= copies; k++)
      exp.items.push(
        ...base.map((i, n) => ({
          ...structuredClone(i),
          id: `e${k}-${n}`,
          title: `${i.title} ${k}`,
        }))
      )
  }
  return doc
}

/** 打开首页并清空本地数据（每个测试都是新的浏览器上下文，这里只等待加载完成） */
export async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
}

/** 通过首页的「导入」导入简历 */
export async function importDocs(page: Page, docs: ResumeDoc[]) {
  await page.locator('input[type=file][multiple]').setInputFiles({
    name: 'docs.iresume.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(toBundle(docs))),
  })
  await expect(page.getByText(`已导入 ${docs.length} 份简历`)).toBeVisible()
}

export async function openDoc(page: Page, name: string) {
  await page.locator('.h-card-name', { hasText: name }).click()
  await expect(page.locator('.e-paper .r-paper')).toBeVisible()
}

/** 收集页面错误；测试结束时断言为空 */
export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** 统计 PDF 页数 */
export const pdfPages = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length

/** 触发「导出 PDF」，在打印对话框出现前生成 PDF */
export async function exportPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => {
    window.print = () =>
      setTimeout(() => window.dispatchEvent(new Event('afterprint')), 2000)
  })
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: /PDF/ }).click()
  await page.locator('.print-root .r-paper').waitFor({ state: 'attached' })
  return page.pdf({ preferCSSPageSize: true, printBackground: true })
}
