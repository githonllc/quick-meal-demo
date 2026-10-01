import { expect, test } from '@playwright/test'
import { waitForResults } from './helpers'

// Start every test with no saved default.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('AC-05: no exact match shows the message, relax chips and near cards', async ({ page }) => {
  await page.goto('/quick-meal?budget=15&time=15&distance=0.5')
  const box = page.getByTestId('no-match')
  await expect(box).toContainText('No exact matches')
  await expect(box).toContainText('Nothing fits a $15 budget, 15 min and 0.5 mi. Here are the closest meals.')
  const chips = page.getByTestId('relax-chip')
  await expect(chips).toHaveCount(2)
  await expect(chips.nth(0)).toHaveText('Budget up to $17 · 1 result')
  await expect(chips.nth(1)).toHaveText('Time up to 20 min · 1 result')
  await expect(page.getByTestId('near-card')).toHaveCount(5)
  await expect(page.getByTestId('miss-tag').first()).toHaveText(/over budget$/)
})

test('a relax chip loosens the view', async ({ page }) => {
  await page.goto('/quick-meal?budget=15&time=15&distance=0.5')
  await page.getByTestId('relax-chip').first().click()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(1)
  await expect(page.getByTestId('meal-card')).toContainText('Taylor St. Dumplings')
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $17 ▾')
  await expect(page).toHaveURL(/budget=17/)
})

test('a relax chip does not change the saved default', async ({ page }) => {
  await page.goto('/quick-meal')
  await page.getByTestId('chip-filters').click()
  const sheet = page.getByTestId('sheet-filters')
  await sheet.getByTestId('budget-slider').fill('15')
  await sheet.getByTestId('step-time-15').click()
  await sheet.getByTestId('step-distance-0.5').click()
  await sheet.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page.getByTestId('no-match')).toBeVisible()

  await page.getByTestId('relax-chip').first().click()
  await waitForResults(page)
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $17 ▾')

  await page.goto('/')
  await page.getByTestId('quick-meal-entry').click()
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $15 ▾')
})
