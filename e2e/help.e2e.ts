import { expect, test } from '@playwright/test'
import { openHome, watchErrors } from './helpers'

test('上手提示：第一次打开编辑器出现，看完或关掉后不再出现', async ({
  page,
}) => {
  const errors = watchErrors(page)
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  const tips = page.getByRole('region', { name: '上手提示' })
  await expect(tips).toContainText('直接在纸上写')
  await tips.getByRole('button', { name: '下一条' }).click()
  await expect(tips).toContainText('悬停出现工具')
  await tips.getByRole('button', { name: '下一条' }).click()
  await expect(tips).toContainText('导出 PDF')
  await tips.getByRole('button', { name: '开始写吧' }).click()
  await expect(tips).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.e-paper .r-paper')).toBeVisible()
  await expect(tips).toHaveCount(0)
  expect(errors).toEqual([])
})

test('「?」打开快捷键面板；在文字里输入「?」不会打开', async ({ page }) => {
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  await page
    .getByRole('region', { name: '上手提示' })
    .getByRole('button', { name: '不再显示提示' })
    .click()

  const name = page.locator('.e-paper .r-name')
  await name.click()
  await page.keyboard.press('End')
  await page.keyboard.type('?')
  await expect(name).toHaveText(/\?$/)
  await expect(page.getByRole('dialog', { name: '键盘快捷键' })).toBeHidden()

  await page.keyboard.press('Escape')
  await page.keyboard.press('Shift+Slash')
  const dialog = page.getByRole('dialog', { name: '键盘快捷键' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('导出 PDF')
  await expect(dialog).toContainText('与上一条合并')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 右下角的「?」按钮；从面板里可以重新看上手提示
  await page.getByRole('button', { name: '帮助与快捷键（?）' }).click()
  await dialog.getByRole('button', { name: '重新显示上手提示' }).click()
  await expect(page.getByRole('region', { name: '上手提示' })).toBeVisible()
})

test('悬停条目时，空着的链接与技术栈显示为「+ 链接」', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: '空白简历' }).click()
  const entry = page
    .locator('.e-paper .r-section[data-kind=experience] .r-entry')
    .first()
  await entry.hover()
  const after = (sel: string) =>
    entry
      .locator(sel)
      // 各浏览器序列化 content 的方式不同（"+ 链接" 或 "+ " "链接"），去掉引号与空格再比
      .evaluate((el) =>
        getComputedStyle(el, '::after').content.replace(/["\s]/g, '')
      )
  await expect.poll(() => after('.r-links')).toBe('+链接')
  await expect.poll(() => after('.r-tags')).toContain('+技术栈')
  // 聚焦后是普通的占位提示
  await entry.locator('.r-links').click()
  await expect.poll(() => after('.r-links')).toBe('链接')
})
