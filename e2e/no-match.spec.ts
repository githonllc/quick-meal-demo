import { expect, test } from '@playwright/test'
import { waitForResults } from './helpers'

// Start every test with no saved default.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('AC-05: no exact match shows the message, relax chips and near cards', async ({ page }) => {
  await page.goto('/quick-meal?budget=15&time=15')
  const box = page.getByTestId('no-match')
  await expect(box).toContainText('No exact matches')
  await expect(box).toContainText('Nothing fits a $15 budget and 15 min. Here are the closest meals.')
  const chips = page.getByTestId('relax-chip')
  await expect(chips).toHaveCount(2)
  await expect(chips.nth(0)).toHaveText('Budget up to $17 · 1 result')
  await expect(chips.nth(1)).toHaveText('Time up to 20 min · 2 results')
  const near = page.getByTestId('near-card')
  await expect(near).toHaveCount(5)
  await expect(near.first()).toContainText('Chicken Tacos (2)')
  await expect(near.first()).toContainText('Santa Clara Taco Co.')
  await expect(page.getByTestId('miss-tag').first()).toHaveText('1 min slower')
})

test('a relax chip loosens the view and moves the slider', async ({ page }) => {
  await page.goto('/quick-meal?budget=15&time=15')
  await page.getByTestId('relax-chip').first().click()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(1)
  await expect(page.getByTestId('meal-card')).toContainText('Taylor St. Dumplings')
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $17 ▾')
  await expect(page).toHaveURL(/budget=17/)
  await page.getByTestId('chip-budget').click()
  await expect(page.getByTestId('budget-slider')).toHaveValue('17')
})

test('pickup near meals show the distance and no time', async ({ page }) => {
  await page.goto('/quick-meal?budget=12&distance=0.5')
  const chips = page.getByTestId('relax-chip')
  await expect(chips).toHaveText(['Budget up to $14 · 2 results', 'Distance up to 1 mi · 1 result'])
  const near = page.getByTestId('near-card')
  await expect(near.first()).toBeVisible()
  for (const card of await near.all()) {
    const text = await card.innerText()
    expect(text).toMatch(/[\d.]+ mi · Est\. \$\d+\.\d\d all-in/)
    expect(text).not.toMatch(/min/)
  }
})

test('a relax chip does not change the saved default', async ({ page }) => {
  await page.goto('/quick-meal')
  await page.getByTestId('chip-filters').click()
  const sheet = page.getByTestId('sheet-filters')
  await sheet.getByTestId('budget-slider').fill('15')
  await sheet.getByTestId('step-time-15').click()
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
