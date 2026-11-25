import { expect, test } from '@playwright/test'
import { openHome, startExport, watchErrors } from './helpers'

test('修订标记：默认关闭；修改后显示在页边，可撤回；导出 PDF 后可以以导出时为基准', async ({
  page,
}) => {
  const errors = watchErrors(page)
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  await expect(page.locator('.e-marks-bar')).toHaveCount(0)

  const bullet = page
    .locator('.e-paper .r-section[data-kind=experience] .r-bullets li .f')
    .first()
  await bullet.click()
  await page.keyboard.press('End')
  await page.keyboard.type('，并降低 30% 成本')
  await page.locator('.e-desk').click({ position: { x: 8, y: 400 } })

  const toggle = page.getByRole('button', { name: '修订标记', exact: true })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.e-marks-count')).toHaveText('1 处修改')
  await page.locator('.e-mark.is-changed').click()
  await expect(page.locator('.e-mark-diff ins')).toHaveText('，并降低 30% 成本')
  await page.getByRole('button', { name: '撤回这一处' }).click()
  await expect(page.locator('.e-marks-count')).toHaveText('没有修改')
  await expect(bullet).not.toContainText('降低 30% 成本')

  // 记住开关
  await expect(page.locator('.e-save')).toHaveText('已保存')
  await page.reload()
  await expect(page.locator('.e-marks-bar')).toBeVisible()

  // 导出后再改：以「上次导出」为基准只看到导出之后的修改
  await startExport(page)
  await expect(
    page.locator('.e-marks-bar option', { hasText: '上次导出 PDF 时' })
  ).toHaveCount(1)
  await page.locator('.e-marks-bar select').selectOption('export')
  await page.locator('.e-paper .r-name').click()
  await page.keyboard.press('End')
  await page.keyboard.type('X')
  await page.locator('.e-desk').click({ position: { x: 8, y: 400 } })
  await expect(page.locator('.e-marks-count')).toHaveText('1 处修改')
  await page.getByRole('button', { name: '关闭修订标记' }).click()
  await expect(page.locator('.e-mark')).toHaveCount(0)
  expect(errors).toEqual([])
})
