import { expect, type Locator, type Page, test } from '@playwright/test'
import { openHome, watchErrors } from './helpers'

/** 像真人一样按下、分几步移动、松开（Playwright 的 dragTo 一步到位，有的浏览器不会开始拖动） */
async function drag(page: Page, from: Locator, to: Locator, dy: number) {
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  if (!a || !b) throw new Error('元素不可见')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 10, a.y - 10, { steps: 4 })
  await page.mouse.move(b.x + 40, b.y + dy, { steps: 12 })
  await page.mouse.up()
}

test('拖动柄在同一区块内调整条目顺序，可以撤销', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Playwright 的 WebKit 用鼠标模拟不了原生拖放（dragstart 后立刻 dragend）；上移 / 下移按钮另有覆盖'
  )
  const errors = watchErrors(page)
  await openHome(page)
  await page.locator('.h-card-name').first().click()
  const exp = page.locator('.e-paper .r-section[data-kind=experience]')
  const titles = exp.locator('.r-entry .r-title')
  await expect(titles).toHaveText(['星图科技', '云帆网络'])

  const second = exp.locator('.r-entry').nth(1)
  await second.hover()
  const grip = second.locator('.e-drag')
  await expect(grip).toBeVisible()
  // 放到第一条的上半部 → 插到它前面
  await drag(page, grip, exp.locator('.r-entry').first(), 6)
  await expect(titles).toHaveText(['云帆网络', '星图科技'])

  // 不能拖到别的区块
  const first = exp.locator('.r-entry').first()
  await first.hover()
  await drag(
    page,
    first.locator('.e-drag'),
    page.locator('.e-paper .r-section[data-kind=projects] .r-entry'),
    10
  )
  await expect(titles).toHaveText(['云帆网络', '星图科技'])
  await expect(
    page.locator('.e-paper .r-section[data-kind=projects] .r-entry')
  ).toHaveCount(1)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(titles).toHaveText(['星图科技', '云帆网络'])
  await expect(page.locator('[data-drop], [data-dragging]')).toHaveCount(0)
  expect(errors).toEqual([])
})
