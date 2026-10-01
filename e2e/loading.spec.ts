import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'
import { waitForResults } from './helpers'

test('a filter change keeps the old list, dimmed, until the new one arrives', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(6)

  // Hold the Chinese answer so the in-between state can be checked without a race.
  const held: Route[] = []
  await page.route('**/api/quick-meal/search?*cuisine=chinese*', (route) => {
    held.push(route)
  })

  await page.getByTestId('cuisine-tab-chinese').click()
  // Same tick as the tap: the old cards are still there, not replaced by skeletons.
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await expect(page.locator('.meal-skel')).toHaveCount(0)
  await expect(page.locator('[data-testid="results"][aria-busy="true"]')).toBeVisible()
  await expect(page.getByTestId('loading-bar')).toBeVisible()

  // Let the held requests through. A request React already aborted may throw here.
  await expect.poll(() => held.length).toBeGreaterThan(0)
  await page.unroute('**/api/quick-meal/search?*cuisine=chinese*')
  for (const route of held) await route.continue().catch(() => {})

  await waitForResults(page)
  await expect(page.getByTestId('loading-bar')).toHaveCount(0)
  await expect(page.getByTestId('count-line')).toHaveText('3 places have a meal that fits · Best match')
  await expect(page.getByTestId('meal-card')).toHaveCount(3)
})
