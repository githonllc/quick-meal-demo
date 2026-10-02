import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { waitForResults } from './helpers'

// Start every test with no saved default and no "Saved" toast flag.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// Opens the Filters sheet, sets budget $20 and time 30 min, and and checks the button label.
async function pickBudget20Time30(page: Page) {
  const sheet = page.getByTestId('sheet-filters')
  await expect(sheet).toBeVisible()
  await sheet.getByTestId('budget-slider').fill('20')
  await sheet.getByTestId('step-time-30').click()
  await expect(sheet.getByTestId('sheet-apply')).toHaveText('Show results')
}

async function expectBudget20Time30(page: Page) {
  await waitForResults(page)
  await expect(page.locator('.qm-hint')).toHaveCount(0)
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
    // The first group is Delivery | Pickup, on Delivery, asking for time.
    await expect(page.getByTestId('sheet-filters').locator('.grp h3').first()).toHaveText('Get it by')
    await expect(page.getByTestId('side-delivery')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('sheet-filters').locator('.grp-q')).toHaveText('How much time do you have?')
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
  // Tap the dimmed page above the sheet.
  await page.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } })
  await expect(page.getByTestId('sheet-filters')).toHaveCount(0)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expectBudget20Time30(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $20 ▾')
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')

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
  await expect(page.getByTestId('sheet-apply')).toHaveText('Show results')
  // Clear all only changes the draft.
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('2')
  await page.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page.getByTestId('count-line')).toHaveText('28 places open now · fastest first')
  await expect(page.locator('.qm-hint')).toHaveText('Short on time? Pick a time and a budget to see meals that fit.')
  await expect(page.getByTestId('chip-filters-badge')).toHaveCount(0)
  await expect(page).toHaveURL(/\/quick-meal$/)
})

test('the "Saved" toast shows on the first apply only', async ({ page }) => {
  const toast = page.getByTestId('toast')
  await page.goto('/quick-meal')
  await page.getByTestId('chip-budget').click()
  await page.getByTestId('budget-slider').fill('20')
  await expect(page.getByTestId('sheet-apply')).toHaveText('Show results')
  await page.getByTestId('sheet-apply').click()
  await expect(toast).toHaveText('Saved. Quick Meal will open with these filters.')
  await expect(toast).toHaveCount(0)

  await page.getByTestId('chip-time').click()
  await page.getByTestId('step-time-30').click()
  await expectBudget20Time30(page)
  // The toast would show in the same click that applied the filters.
  expect(await toast.count()).toBe(0)
})

test('no search request leaves the Filters sheet until the user applies', async ({ page }) => {
  await page.goto('/quick-meal')
  await waitForResults(page)
  await page.getByTestId('chip-filters').click()
  const requests: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/quick-meal/search')) requests.push(req.url())
  })
  await page.getByTestId('budget-slider').fill('15')
  await page.getByTestId('step-time-30').click()
  // Wait longer than any debounce a live count would have used.
  await page.waitForTimeout(500)
  expect(requests).toHaveLength(0)
  await page.getByTestId('sheet-apply').click()
  await waitForResults(page)
  expect(requests.length).toBeGreaterThan(0)
})

// "$16.74" -> 1674. Item names may hold digits, so read only the dollar amount.
async function cents(el: import('@playwright/test').Locator): Promise<number> {
  const m = /\$(\d+)\.(\d\d)/.exec(await el.innerText())
  if (!m) throw new Error(`No price in "${await el.innerText()}"`)
  return Number(m[1]) * 100 + Number(m[2])
}

test('AC-09: Pickup swaps time for distance and drops the delivery fee', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-filters').click()
  const sheet = page.getByTestId('sheet-filters')
  await expect(page.getByText('Deliver to SJSU · Now')).toBeVisible()
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.getByTestId('side-pickup')).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByTestId('side-delivery')).toHaveAttribute('aria-checked', 'false')

  // The time steps are replaced by 0.5 · 1 · 2 · 3 mi, none picked.
  await expect(sheet.locator('[data-testid^="step-time-"]')).toHaveCount(0)
  const steps = sheet.locator('[data-testid^="step-distance-"]')
  await expect(steps).toHaveText(['0.5 mi', '1 mi', '2 mi', '3 mi'])
  for (const step of await steps.all()) await expect(step).toHaveAttribute('aria-pressed', 'false')
  await expect(sheet).toContainText('How far can you go?')
  await expect(page.getByText('For pickup')).toHaveCount(0)
  // Pickup has no Fastest.
  await expect(sheet.getByTestId('sort-fastest')).toHaveCount(0)
  await expect(sheet.getByTestId('sort-nearest')).toHaveAttribute('aria-pressed', 'true')

  await sheet.getByTestId('step-distance-1').click()
  await sheet.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 1 mi ▾')
  await expect(page.getByText('Pickup near SJSU · Now')).toBeVisible()
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&distance=1$/)
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('2')
  await expect(page.getByTestId('count-line')).toHaveText('7 places have a meal that fits · nearest first')
  const cards = page.getByTestId('meal-card')
  await expect(cards).toHaveCount(7)
  for (const card of await cards.all()) {
    const text = await card.innerText()
    expect(text).toMatch(/[\d.]+ mi · Est\. \$\d+\.\d\d all-in/)
    expect(text).not.toMatch(/min/)
  }

  // The Paseo breakdown has no delivery fee line and adds up to $16.74.
  const paseo = cards.filter({ hasText: 'Paseo Rice Bowl' })
  await expect(paseo).toContainText('0.4 mi · Est. $16.74 all-in')
  await paseo.getByTestId('meal-price').click()
  const breakdown = page.getByTestId('breakdown-sheet')
  await expect(breakdown).toBeVisible()
  await expect(breakdown.getByTestId('breakdown-row-delivery')).toHaveCount(0)
  let sum = 0
  for (const row of ['item', 'small', 'service', 'tax', 'tip']) sum += await cents(breakdown.getByTestId(`breakdown-row-${row}`))
  expect(sum).toBe(1674)
  await expect(breakdown.getByTestId('breakdown-total')).toContainText('$16.74')
})

test('the Time chip sheet has the same switch and applies a step at once', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await sheet.getByTestId('side-pickup').click()
  await sheet.getByTestId('step-distance-1').click()
  await expect(sheet).toHaveCount(0)
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&distance=1$/)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 1 mi ▾')
  await expect(page.getByTestId('meal-card')).toHaveCount(7)

  // Back to delivery: the distance is cleared and Nearest becomes Fastest.
  await page.getByTestId('chip-time').click()
  await expect(sheet.getByTestId('side-pickup')).toHaveAttribute('aria-checked', 'true')
  await sheet.getByTestId('side-delivery').click()
  await sheet.getByTestId('step-time-30').click()
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')
})

test('after a switch in the Time chip sheet no step is picked', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await expect(sheet.getByTestId('step-time-30')).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByTestId('side-pickup').click()
  await sheet.getByTestId('side-delivery').click()
  await expect(sheet.getByTestId('step-time-30')).toHaveAttribute('aria-pressed', 'false')
  // Picking a step applies that value instead of clearing it.
  await sheet.getByTestId('step-time-30').click()
  await expect(sheet).toHaveCount(0)
  await waitForResults(page)
  await expect(page).toHaveURL(/[?&]time=30(&|$)/)
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')
})

test('a breakdown opened while pickup loads keeps the prices of the tapped card', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  // Hold the pickup answer so the delivery cards stay on screen, dimmed.
  const held: Route[] = []
  await page.route('**/api/quick-meal/search?*distance=1*', (route) => {
    held.push(route)
  })
  await page.getByTestId('chip-time').click()
  await page.getByTestId('sheet-time').getByTestId('side-pickup').click()
  await page.getByTestId('step-distance-1').click()
  await expect(page.locator('[data-testid="results"][aria-busy="true"]')).toBeVisible()

  const paseo = page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' })
  await paseo.getByTestId('meal-price').click()
  const breakdown = page.getByTestId('breakdown-sheet')
  await expect(breakdown.getByTestId('breakdown-row-delivery')).toHaveCount(1)
  await expect(breakdown.getByTestId('breakdown-total')).toContainText('$18.73')

  await expect.poll(() => held.length).toBeGreaterThan(0)
  await page.unroute('**/api/quick-meal/search?*distance=1*')
  for (const route of held) await route.continue().catch(() => {})
  await waitForResults(page)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 1 mi ▾')
  // The sheet still shows the delivery card it was opened for.
  await expect(breakdown.getByTestId('breakdown-row-delivery')).toHaveCount(1)
  await expect(breakdown.getByTestId('breakdown-total')).toContainText('$18.73')
})

test('switching sides swaps Fastest and Nearest, and a step on the same side keeps the sort', async ({ page }) => {
  // Filters sheet: Delivery + Fastest, to Pickup and back, is Fastest again.
  await page.goto('/quick-meal?time=30')
  await waitForResults(page)
  await page.getByTestId('chip-filters').click()
  const sheet = page.getByTestId('sheet-filters')
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.getByTestId('sort-nearest')).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByTestId('side-delivery').click()
  await expect(sheet.getByTestId('sort-fastest')).toHaveAttribute('aria-pressed', 'true')

  // Time chip sheet: Pickup + Nearest, switch to Delivery and pick 30 min. Sort is Fastest, no sort in the URL.
  await page.goto('/quick-meal?distance=1')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  await page.getByTestId('side-delivery').click()
  await page.getByTestId('step-time-30').click()
  await waitForResults(page)
  await expect(page.getByTestId('count-line')).toContainText('fastest first')
  await expect(page).toHaveURL(/\/quick-meal\?time=30$/)

  // Delivery + Nearest chosen on purpose keeps Nearest when another step is picked.
  await page.goto('/quick-meal?time=30&sort=nearest')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  await page.getByTestId('step-time-45').click()
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?time=45&sort=nearest$/)
})
