import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test('历史版本：保存、对比、恢复', async ({ page }) => {
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  await page.getByRole('button', { name: '历史版本' }).click()
  await page.getByLabel('版本名称').fill('投递前')
  await page.getByRole('button', { name: '保存版本' }).click()
  await expect(page.locator('.e-version', { hasText: '投递前' })).toBeVisible()
  await page.keyboard.press('Escape')

  const headline = page.locator('.r-headline')
  await headline.click()
  await page.keyboard.press('End')
  await page.keyboard.type('（新版）')
  await page.locator('.e-desk').click({ position: { x: 8, y: 300 } })

  await page.getByRole('button', { name: '历史版本' }).click()
  await page.locator('.e-version', { hasText: '投递前' }).click()
  await expect(page.locator('.e-diff')).toContainText('（新版）')
  await page.getByRole('button', { name: /恢复/ }).click()
  await expect(headline).not.toContainText('（新版）')
})

test('岗位匹配：派生定制版并分析 JD', async ({ page }) => {
  await openHome(page)
  await page.locator('.h-card-info [aria-label="更多"]').first().click()
  await page.getByText('派生定制版…').click()
  const panel = page.locator('.e-match')
  await expect(panel).toBeVisible()
  await panel.getByPlaceholder('如：星图科技').fill('云帆科技')
  await panel
    .locator('textarea')
    .fill(
      '任职要求：\n1. 熟练掌握 React、TypeScript；\n2. 有 Kubernetes 经验者优先；\n3. 良好的沟通能力。'
    )
  await expect(panel.locator('.e-kw.is-covered')).toContainText('React')
  await expect(panel.locator('.e-kw.is-missing')).toContainText('Kubernetes')
  await expect(page.locator('.e-docname')).toHaveValue(/云帆科技$/)
})

test('主题分享链接', async ({ page, browser }) => {
  // 剪贴板权限各浏览器的自动化接口不同，这里直接记下写入的内容
  await page.addInitScript(() => {
    const w = window as unknown as { copied?: string }
    navigator.clipboard.writeText = async (text: string) => {
      w.copied = text
    }
  })
  await openHome(page)
  await page.locator('.h-grid.is-themes .h-card').nth(2).click()
  await page.getByRole('button', { name: '主题' }).click()
  await page.getByLabel('复制主题分享链接').click()
  const link = await page.evaluate(
    () => (window as unknown as { copied?: string }).copied ?? ''
  )
  expect(link).toMatch(/#\/theme\/[\w-]+$/)

  const other = await browser.newPage()
  await other.goto(link)
  await expect(other.getByText('有人和你分享了一个主题')).toBeVisible()
  await other.getByRole('button', { name: '保存到我的主题' }).click()
  await expect(other.getByText(/已保存主题/)).toBeVisible()
  await other.close()
})
