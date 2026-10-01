import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5199',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 5199 --strictPort',
        url: 'http://localhost:5199',
        reuseExistingServer: false,
        timeout: 120_000,
      },
  reporter: 'list',
})
