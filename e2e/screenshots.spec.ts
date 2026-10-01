import path from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Saves the demo screenshots to docs/screenshots/. Run only on purpose:
// SCREENSHOTS=1 BASE_URL=<url> npx playwright test e2e/screenshots.spec.ts
test.skip(process.env.SCREENSHOTS !== '1', 'Set SCREENSHOTS=1 to save the demo screenshots.')

// Start every shot with no saved default and no "Saved" toast flag.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// Waits for every image on screen to finish loading, then saves the shot.
// Images below the fold may be lazy and never load, so they are left out.
async function shot(page: Page, name: string) {
  await page.waitForFunction(
    'Array.from(document.images).filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => i.complete)',
  )
  await page.screenshot({
    path: path.resolve(test.info().project.testDir, '..', 'docs', 'screenshots', name),
    animations: 'disabled',
  })
}

test('1: Home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('What can we get you?')).toBeVisible()
  await shot(page, '1-home.png')
})

test('2: Quick Meal list at $20 and 30 min', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await shot(page, '2-list.png')
})

test('3: Filters sheet open', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await page.getByTestId('chip-filters').click()
  await expect(page.getByTestId('sheet-apply')).toHaveText('Show results')
  await shot(page, '3-filters.png')
})

test('4: no match with relax chips', async ({ page }) => {
  await page.goto('/quick-meal?budget=15&time=15&distance=0.5')
  await expect(page.getByTestId('no-match')).toBeVisible()
  await expect(page.getByTestId('near-card')).toHaveCount(5)
  await shot(page, '4-no-match.png')
})

test('5: Paseo menu with the Tofu Rice Bowl breakdown', async ({ page }) => {
  await page.goto('/quick-meal/restaurants/paseo-rice-bowl?budget=20')
  const tofu = page.getByTestId('menu-row').filter({ hasText: 'Tofu Rice Bowl' })
  await tofu.getByTestId('menu-est').click()
  await expect(page.getByTestId('breakdown-total')).toContainText('$19.48')
  await shot(page, '5-menu-breakdown.png')
})
