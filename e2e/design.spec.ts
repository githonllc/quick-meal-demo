import { expect, test } from '@playwright/test'

test('the design page is served by the Worker', async ({ page }) => {
  const res = await page.goto('/design.html')
  expect(res?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText('Quick Meal')
})
