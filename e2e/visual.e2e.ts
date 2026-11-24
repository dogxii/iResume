import { expect, test } from '@playwright/test'
import { PRESETS } from '../src/theme/presets'
import { importDocs, longDoc, openDoc, openHome } from './helpers'

// 截图回归：依赖字体环境，基准图只在本地生成与比较（bun run e2e:visual）
for (const { theme } of PRESETS) {
  test(`@visual 预设外观：${theme.name}`, async ({ page }) => {
    await openHome(page)
    const doc = longDoc(theme, 0)
    await importDocs(page, [doc])
    await openDoc(page, doc.name)
    await page.getByRole('button', { name: '预览' }).click()
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.e-page').first()).toHaveScreenshot(
      `${theme.preset}.png`
    )
  })
}
