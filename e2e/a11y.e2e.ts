import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { openHome } from './helpers'

/** 只拦截严重与关键级别的问题；简历纸面本身是打印内容，单独放宽对比度规则 */
async function audit(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = result.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )
  const report = serious.map(
    (v) =>
      `${v.id}: ${v.help}\n  ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 5)
        .join('\n  ')}`
  )
  expect(report, `${label} 的无障碍问题`).toEqual([])
}

// 关闭动画：避免在弹层淡入过程中测到半透明的颜色
test.use({ colorScheme: 'light', reducedMotion: 'reduce' })

test('无障碍：首页', async ({ page }) => {
  await openHome(page)
  await audit(page, '首页')
  await page.locator('.h-sync-btn').click()
  await audit(page, '同步面板')
})

test('无障碍：编辑器与面板', async ({ page }) => {
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  await expect(page.locator('.e-paper .r-paper')).toBeVisible()
  await audit(page, '编辑器')
  for (const name of [
    '主题',
    '版式',
    '字体',
    '颜色',
    '间距',
    '历史版本',
    '岗位匹配',
  ]) {
    await page.getByRole('button', { name, exact: true }).first().click()
    await audit(page, `${name}面板`)
    await page.keyboard.press('Escape')
  }
  await page.getByRole('button', { name: '预览' }).click()
  await audit(page, '预览')
})
