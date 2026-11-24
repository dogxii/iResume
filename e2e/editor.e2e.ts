import { expect, test } from '@playwright/test'
import { openHome, watchErrors } from './helpers'

test('新建空白简历：直接在纸面上编辑、拆分要点、撤销', async ({ page }) => {
  const errors = watchErrors(page)
  await openHome(page)
  await page.getByRole('button', { name: '空白简历' }).click()
  const name = page.locator('.r-name')
  await name.click()
  await page.keyboard.type('王小雨')
  await expect(name).toHaveText('王小雨')

  // 第一个经历条目：要点里回车拆成两条
  // 空要点平时隐藏，悬停到条目上才出现
  await page
    .locator('.r-section[data-kind=experience] .r-entry')
    .first()
    .hover()
  const bullet = page
    .locator('.r-section[data-kind=experience] .r-bullets [contenteditable]')
    .first()
  await bullet.click()
  await page.keyboard.type('负责数据看板重构首屏提速 60%')
  await page.keyboard.press('Enter')
  await page.keyboard.type('搭建组件库')
  await expect(
    page.locator('.r-section[data-kind=experience] .r-bullets li')
  ).toHaveCount(2)

  // 撤销是逐步的：先撤掉新输入的文字，再撤掉拆分
  const items = page.locator('.r-section[data-kind=experience] .r-bullets li')
  await page.locator('.e-desk').click({ position: { x: 8, y: 300 } })
  const undo = page.getByRole('button', { name: '撤销 (⌘Z)' })
  await undo.click()
  await expect(items.nth(1)).not.toContainText('搭建组件库')
  await undo.click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('首屏提速 60%')

  // 自动保存后回到首页，刷新仍在
  await expect(page.locator('.e-save')).toHaveText('已保存')
  await page.getByRole('button', { name: '返回简历库' }).click()
  await expect(page.locator('.h-card-name')).toContainText(['未命名简历'])
  await page.reload()
  await expect(
    page.locator('.h-card').filter({ hasText: '未命名简历' })
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('切换主题与一页适配', async ({ page }) => {
  await openHome(page)
  await page.locator('.h-grid.is-themes .h-card').first().click()
  await page.getByRole('button', { name: '主题' }).click()
  await page.locator('.e-gallery-item', { hasText: '双栏' }).first().click()
  await expect(page.locator('.e-paper .r-paper')).toHaveAttribute(
    'data-layout',
    'aside-left'
  )
  await expect(page.locator('.e-fit')).toContainText('1 页')
})
