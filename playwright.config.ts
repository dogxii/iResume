import { defineConfig, devices } from '@playwright/test'

/**
 * 端到端测试跑在生产构建上（含 Service Worker）。
 * - functional：功能、分页一致性、同步、离线、无障碍，CI 必跑；
 * - visual：8 套预设的截图回归，依赖字体环境，只在本地运行（bun run e2e:visual）。
 */
const PORT = 4317

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    locale: 'zh-CN',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  projects: [
    {
      name: 'functional',
      grepInvert: /@visual/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'visual',
      grep: /@visual/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `bunx vite build && bunx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
