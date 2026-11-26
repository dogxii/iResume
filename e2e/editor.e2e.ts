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
  const undo = page.getByRole('button', { name: /^撤销 \(/ })
  await undo.click()
  await expect(items.nth(1)).not.toContainText('搭建组件库')
  await undo.click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('首屏提速 60%')

  // 自动保存后回到首页，刷新仍在
  await expect(page.locator('.e-save')).toHaveText('已保存')
  await page.getByRole('button', { name: '返回简历库' }).click()
  await expect(page.locator('.h-card-name')).toContainText(['王小雨的简历'])
  await page.reload()
  await expect(
    page.locator('.h-card').filter({ hasText: '王小雨的简历' })
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

test.describe('笔记本尺寸', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('大纲默认收起、可展开并记住；批注出现时纸面不缩放；回车跳到下一个字段', async ({
    page,
  }) => {
    await openHome(page)
    await page.locator('.h-card-name').first().click()
    const outline = page.locator('nav.e-outline')
    await expect(outline).toHaveClass(/is-collapsed/)
    await page.getByRole('button', { name: /^展开大纲/ }).click()
    await expect(outline).not.toHaveClass(/is-collapsed/)
    await page.reload()
    await expect(page.locator('nav.e-outline')).not.toHaveClass(/is-collapsed/)
    await page.keyboard.press('ControlOrMeta+Backslash')
    await expect(page.locator('nav.e-outline')).toHaveClass(/is-collapsed/)
    // 等收起动画结束、纸面缩放稳定
    await expect
      .poll(() =>
        page
          .locator('nav.e-outline')
          .evaluate((e) => (e as HTMLElement).offsetWidth)
      )
      .toBe(0)

    // 新条目缺少时间会出现批注，纸面宽度保持不变
    const paper = page.locator('.e-paper')
    const before = (await paper.boundingBox())?.width
    await page
      .locator('.e-paper .r-section[data-kind=experience] .r-entry')
      .first()
      .hover()
    await page
      .getByRole('button', { name: /在下方/ })
      .first()
      .click()
    await page.keyboard.type('字节跳动')
    await page.keyboard.press('Enter')
    await page.keyboard.type('高级前端')
    await expect(page.locator('.e-note', { hasText: '缺少时间' })).toBeVisible()
    expect((await paper.boundingBox())?.width).toBe(before)
    await expect(
      page
        .locator('.e-paper .r-entry', { hasText: '字节跳动' })
        .locator('.r-sub')
    ).toHaveText('高级前端')
  })
})

test('只用键盘从头写：回车一路往下走，跳过空的可选字段；名称跟着姓名', async ({
  page,
}) => {
  const errors = watchErrors(page)
  await openHome(page)
  await page.getByRole('button', { name: '空白简历' }).click()
  const focused = () =>
    page.evaluate(() => document.activeElement?.getAttribute('data-ph'))
  await page.locator('.e-paper .r-name').click()
  for (const text of [
    '张三',
    '产品经理',
    'zs@mail.com',
    '13800000000',
    '北京',
  ]) {
    await page.keyboard.type(text)
    await page.keyboard.press('Enter')
  }
  // 页眉写完接着写第一段经历
  expect(await focused()).toBe('公司名称')
  for (const text of ['字节跳动', '产品经理', '2021.03', '至今']) {
    await page.keyboard.type(text)
    await page.keyboard.press('Enter')
  }
  // 城市、链接、技术栈是空的可选字段，直接到要点
  await page.keyboard.type('主导推荐系统改版')
  const exp = page.locator('.e-paper .r-section[data-kind=experience]')
  await expect(exp.locator('.r-bullets li').first()).toHaveText(
    '主导推荐系统改版'
  )
  await expect(exp.locator('.r-loc')).toHaveText('')

  // 区块标题回车进入区块的第一个字段
  const skills = page.locator('.e-paper .r-section[data-kind=skills]')
  await skills.locator('.r-heading .f').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  expect(await focused()).toBe('类别')

  // 纸面最后一个字段回车结束编辑，之后的按键不会写进任何字段
  await page.keyboard.press('Tab')
  await page.keyboard.type('Figma')
  await page.keyboard.press('Enter')
  await page.keyboard.type('不应出现')
  await expect(page.locator('.e-paper')).not.toContainText('不应出现')

  await expect(page.locator('.e-docname')).toHaveValue('张三的简历')
  expect(errors).toEqual([])
})
