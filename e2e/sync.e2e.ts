import {
  type BrowserContext,
  expect,
  type Page,
  type Route,
  test,
} from '@playwright/test'
import { openHome } from './helpers'

/** 内存中的 GitHub API：两台「设备」共享同一份 Gist */
function fakeGitHub() {
  const gists = new Map<
    string,
    {
      id: string
      html_url: string
      updated_at: string
      files: Record<string, { content: string }>
    }
  >()
  let n = 0
  const handler = async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (req.headers().authorization !== 'Bearer ghp_e2e')
      return json(401, { message: 'Bad credentials' })
    if (url.pathname === '/user')
      return json(200, { login: 'octo', avatar_url: '' })
    if (url.pathname === '/gists' && req.method() === 'GET')
      return json(200, [...gists.values()])
    if (url.pathname === '/gists' && req.method() === 'POST') {
      const g = {
        id: `g${++n}`,
        html_url: 'https://gist.github.com/x',
        updated_at: new Date().toISOString(),
        files: JSON.parse(req.postData() ?? '{}').files,
      }
      gists.set(g.id, g)
      return json(201, g)
    }
    const g = gists.get(decodeURIComponent(url.pathname.split('/')[2] ?? ''))
    if (!g) return json(404, { message: 'Not Found' })
    if (req.method() === 'PATCH') {
      Object.assign(g.files, JSON.parse(req.postData() ?? '{}').files)
      g.updated_at = new Date().toISOString()
    }
    return json(200, g)
  }
  return { gists, handler }
}

async function device(
  context: BrowserContext,
  handler: (r: Route) => Promise<void>
): Promise<Page> {
  await context.route('https://api.github.com/**', handler)
  const page = await context.newPage()
  await openHome(page)
  await page.locator('.h-sync-btn').click()
  await page.locator('#sync-token').fill('ghp_e2e')
  await page.getByRole('button', { name: '连接', exact: true }).click()
  return page
}

// Service Worker 会让 WebKit 的请求绕过 context.route；这里测的是同步，不需要它
const noSw = { serviceWorkers: 'block' } as const

test('端到端加密同步：两台设备、错误口令、云端只有密文', async ({
  browser,
}) => {
  test.slow() // PBKDF2 60 万次迭代
  const gh = fakeGitHub()

  const a = await device(await browser.newContext(noSw), gh.handler)
  await expect(
    a.locator('input[autocomplete="new-password"]').first()
  ).toBeVisible()
  const pass = a.locator('.h-sync-pass input')
  await pass.nth(0).fill('correct horse battery')
  await pass.nth(1).fill('correct horse battery')
  await a.getByRole('button', { name: '设置口令并开始同步' }).click()
  await expect(a.getByRole('button', { name: '立即同步' })).toBeEnabled({
    timeout: 20_000,
  })
  const content = [...gh.gists.values()][0].files['iresume-sync-v3.json']
    .content
  expect(content).toContain('"format":"iresume.sync.v3"')
  expect(content).not.toContain('林小明')

  const b = await device(await browser.newContext(noSw), gh.handler)
  // 云端已有数据：只需输入一次原口令
  const join = b.locator('input[autocomplete="current-password"]')
  await join.fill('wrong password!')
  await b.getByRole('button', { name: '解锁并同步' }).click()
  await expect(b.locator('.h-sync-msg.is-error')).toContainText('口令不正确', {
    timeout: 20_000,
  })
  await join.fill('correct horse battery')
  await b.getByRole('button', { name: '解锁并同步' }).click()
  await expect(b.getByRole('button', { name: '立即同步' })).toBeEnabled({
    timeout: 20_000,
  })
  await b.keyboard.press('Escape')
  // 两台设备各自的示例简历都在
  await expect(b.locator('.h-card-name')).toHaveCount(2)

  await a.getByRole('button', { name: '立即同步' }).click()
  await a.keyboard.press('Escape')
  await expect(a.locator('.h-card-name')).toHaveCount(2)
})
