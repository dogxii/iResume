import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test('离线可用：断网后仍能打开并编辑', async ({ page, context }) => {
  await openHome(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
  await page.locator('.h-card-name').first().click()
  const name = page.locator('.e-paper .r-name')
  await name.click()
  await page.keyboard.press('End')
  await page.keyboard.type('·离线')
  await expect(name).toHaveText(/·离线$/)
  await expect(page.locator('.e-save')).toHaveText('已保存')
})
