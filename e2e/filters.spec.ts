import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { waitForResults } from './helpers'

// Start every test with no saved default and no "Saved" toast flag.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// Opens the Filters sheet, sets budget $20 and time 30 min, and waits for the live count.
async function pickBudget20Time30(page: Page) {
  const sheet = page.getByTestId('sheet-filters')
  await expect(sheet).toBeVisible()
  await sheet.getByTestId('budget-slider').fill('20')
  await sheet.getByTestId('step-time-30').click()
  await expect(sheet.getByTestId('sheet-apply')).toHaveText('Show 6 results')
}

async function expectBudget20Time30(page: Page) {
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $20 ▾')
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('2')
}

test('AC-03: the Filters sheet opens from the chip and the top-right icon', async ({ page }) => {
  const openers = [page.getByTestId('chip-filters'), page.getByRole('button', { name: 'Open filters' })]
  for (const opener of openers) {
    await page.evaluate(() => localStorage.clear())
    await page.goto('/quick-meal')
    await expect(page.getByTestId('meal-card')).toHaveCount(28)
    await opener.click()
    await pickBudget20Time30(page)
    await page.getByTestId('sheet-apply').click()
    await expect(page.getByTestId('sheet-filters')).toHaveCount(0)
    await expectBudget20Time30(page)
    await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  }
})

test('AC-07: applied filters come back next visit, the cuisine tab does not', async ({ page, context, browser, baseURL }) => {
  await page.goto('/quick-meal')
  await page.getByTestId('chip-filters').click()
  await pickBudget20Time30(page)
  await page.getByTestId('sheet-apply').click()
  await expectBudget20Time30(page)
  await page.getByTestId('cuisine-tab-chinese').click()
  await expect(page).toHaveURL(/cuisine=chinese/)
  await waitForResults(page)

  // Leave and come back from Home in a new tab.
  const again = await context.newPage()
  await again.goto('/')
  await again.getByTestId('quick-meal-entry').click()
  await expectBudget20Time30(again)
  await expect(again.getByTestId('cuisine-tab-all')).toHaveAttribute('aria-selected', 'true')

  // A fresh browser context with the same storage, like closing and reopening the browser.
  const reopened = await browser.newContext({ storageState: await context.storageState() })
  const later = await reopened.newPage()
  await later.goto(`${baseURL}/quick-meal`)
  await expect(later).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expectBudget20Time30(later)
  await expect(later.getByTestId('cuisine-tab-all')).toHaveAttribute('aria-selected', 'true')
  await reopened.close()
})

test('closing the sheet without applying keeps the list', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-filters').click()
  await page.getByTestId('budget-slider').fill('12')
  await page.getByTestId('step-time-30').click()
  await expect(page.getByTestId('sheet-apply')).not.toHaveText('Show 6 results')
  // Tap the dimmed page above the sheet.
  await page.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } })
  await expect(page.getByTestId('sheet-filters')).toHaveCount(0)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expectBudget20Time30(page)

  // The sheet opens again from the applied filters, not the dropped draft.
  await page.getByTestId('chip-filters').click()
  await expect(page.getByTestId('step-time-30')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('budget-slider')).toHaveValue('20')
})

test('Clear all then apply removes every filter', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-filters').click()
  await page.getByTestId('sheet-clear').click()
  await expect(page.getByTestId('sheet-apply')).toHaveText('Show 28 results')
  // Clear all only changes the draft.
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('2')
  await page.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page.getByTestId('count-line')).toHaveText('28 places open now · Best match')
  await expect(page.getByTestId('chip-filters-badge')).toHaveCount(0)
  await expect(page).toHaveURL(/\/quick-meal$/)
})

test('the "Saved" toast shows on the first apply only', async ({ page }) => {
  const toast = page.getByTestId('toast')
  await page.goto('/quick-meal')
  await page.getByTestId('chip-budget').click()
  await page.getByTestId('budget-slider').fill('20')
  await expect(page.getByTestId('sheet-apply')).toHaveText('Show 10 results')
  await page.getByTestId('sheet-apply').click()
  await expect(toast).toHaveText('Saved. Quick Meal will open with these filters.')
  await expect(toast).toHaveCount(0)

  await page.getByTestId('chip-time').click()
  await page.getByTestId('step-time-30').click()
  await expectBudget20Time30(page)
  // The toast would show in the same click that applied the filters.
  expect(await toast.count()).toBe(0)
})
