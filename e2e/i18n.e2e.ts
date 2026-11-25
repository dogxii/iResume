import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { settle, watchErrors } from './helpers'

/** 英文浏览器：界面、示例简历、新建简历都应是英文 */
test.use({ locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce' })

const CJK = /[一-鿿]/

/** 页面上可见的界面文字里不应残留中文（语言切换按钮「中文」除外） */
async function chromeText(page: Page) {
  return page.evaluate(() => {
    const out: string[] = []
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('[lang="zh"], [lang="zh-CN"]')) continue
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const text = n.textContent?.trim()
      if (text) out.push(text)
    }
    for (const el of document.querySelectorAll<HTMLElement>(
      '[aria-label], [title], [placeholder]'
    ))
      for (const a of ['aria-label', 'title', 'placeholder'])
        if (el.getAttribute(a)) out.push(el.getAttribute(a) as string)
    return out
  })
}

async function audit(page: Page, label: string) {
  await settle(page)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(serious, `${label}`).toEqual([])
}

test('英文界面：首页、示例简历与新建简历', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'My resumes' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.h-card-name').first()).toContainText(
    'Sample resume'
  )
  expect((await chromeText(page)).filter((t) => CJK.test(t))).toEqual([])
  await audit(page, 'home (en)')

  // 新建的空白简历：区块标题与「至今」都是英文
  await page.getByRole('button', { name: 'Blank resume' }).click()
  await expect(
    page.locator('.e-paper .r-section[data-kind=experience] .r-heading')
  ).toContainText('Experience')
  await expect(page.getByRole('button', { name: 'Undo (⌘Z)' })).toBeVisible()
  expect((await chromeText(page)).filter((t) => CJK.test(t))).toEqual([])
  for (const name of ['Theme', 'Layout', 'Version history', 'Job match']) {
    await page.getByRole('button', { name, exact: true }).first().click()
    expect(
      (await chromeText(page)).filter((t) => CJK.test(t)),
      `${name} panel`
    ).toEqual([])
    await audit(page, `${name} panel (en)`)
    await page.keyboard.press('Escape')
  }
  await page.getByRole('button', { name: 'Back to resumes' }).click()
  await expect(page.locator('.h-card-name')).toContainText(['Untitled resume'])
  expect(errors).toEqual([])
})

test('语言切换会被记住', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '中文' }).click()
  await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await page.reload()
  await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'My resumes' })).toBeVisible()
})
