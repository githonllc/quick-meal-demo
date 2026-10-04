import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { setLayout, setStop, waitForResults } from './helpers'

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
  await setStop(sheet.getByTestId('time-slider'), '30')
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
  await setStop(page.getByTestId('time-slider'), '45')
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
  await expect(page.getByTestId('time-slider')).toHaveAttribute('aria-valuetext', '30 minutes')
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
  await setStop(page.getByTestId('time-slider'), '30')
  await page.getByTestId('sheet-apply').click()
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
  await setStop(page.getByTestId('time-slider'), '30')
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

  // The time slider is replaced by a distance slider from 0.5 to 5 mi in 0.5 mi steps, at Any.
  await expect(sheet.getByTestId('time-slider')).toHaveCount(0)
  const slider = sheet.getByTestId('distance-slider')
  await expect(slider.locator('xpath=following-sibling::div[1]/span')).toHaveText(['0.5 mi', 'Any'])
  await expect(slider).toHaveAttribute('aria-valuetext', 'Any distance')
  await expect(sheet.getByTestId('distance-slider-val')).toHaveText('Any distance')
  await expect(sheet).toContainText('How far can you go?')
  await expect(page.getByText('For pickup')).toHaveCount(0)
  // Pickup has no Fastest.
  await expect(sheet.getByTestId('sort-fastest')).toHaveCount(0)
  await expect(sheet.getByTestId('sort-nearest')).toHaveAttribute('aria-pressed', 'true')

  await setStop(slider, '1')
  await expect(sheet.getByTestId('distance-slider-val')).toHaveText('Within 1 mi')
  await expect(slider).toHaveAttribute('aria-valuetext', '1 mile')
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

test('AC-09 on restaurant cards: pickup cards show only the distance, and the menu has pickup prices', async ({ page }) => {
  await setLayout(page, 'places')
  await page.goto('/quick-meal?budget=20&distance=1')
  await waitForResults(page)
  await expect(page.getByTestId('count-line')).toHaveText('7 places have a meal that fits · nearest first')
  const cards = page.getByTestId('meal-card')
  await expect(cards).toHaveCount(7)
  for (const card of await cards.all()) {
    await expect(card.getByTestId('meal-meta')).toHaveText(/^[\d.]+ mi$/)
    expect(await card.innerText()).not.toMatch(/Est\.|all-in|\$\d+\.\d\d/)
  }

  // Paseo's menu, opened from its card: the Chicken Rice Bowl breakdown has no delivery fee line and adds up to $16.74.
  const paseo = cards.filter({ hasText: 'Paseo Rice Bowl' })
  await expect(paseo.getByTestId('meal-meta')).toHaveText('0.4 mi')
  await paseo.click()
  await expect(page).toHaveURL(/\/quick-meal\/restaurants\/paseo-rice-bowl\?budget=20&distance=1$/)
  await waitForResults(page, 'menu-results')
  const chicken = page.getByTestId('menu-fits').getByTestId('menu-row').filter({ hasText: 'Chicken Rice Bowl' })
  await chicken.getByTestId('menu-est').click()
  const breakdown = page.getByTestId('breakdown-sheet')
  await expect(breakdown).toBeVisible()
  await expect(breakdown.getByTestId('breakdown-row-delivery')).toHaveCount(0)
  let sum = 0
  for (const row of ['item', 'small', 'service', 'tax', 'tip']) sum += await cents(breakdown.getByTestId(`breakdown-row-${row}`))
  expect(sum).toBe(1674)
  await expect(breakdown.getByTestId('breakdown-total')).toContainText('$16.74')
})

test('the Delivery slider shows the time above the track and ends at Any time', async ({ page }) => {
  await page.goto('/quick-meal')
  await page.getByTestId('chip-filters').click()
  const sheet = page.getByTestId('sheet-filters')
  const slider = sheet.getByTestId('time-slider')
  const val = sheet.getByTestId('time-slider-val')
  // 31 stops are too many to label, so only the two ends have labels, like the budget slider.
  await expect(slider.locator('xpath=following-sibling::div[1]/span')).toHaveText(['15 min', 'Any'])
  await expect(val).toHaveText('Any time')
  await setStop(slider, '30')
  await expect(val).toHaveText('Up to 30 min')
  await expect(slider).toHaveAttribute('aria-valuetext', '30 minutes')
  // The keyboard moves one minute at a time, and End is Any.
  await slider.press('ArrowRight')
  await expect(val).toHaveText('Up to 31 min')
  await setStop(slider, '45')
  await slider.press('ArrowRight')
  await expect(val).toHaveText('Any time')
  await slider.press('End')
  await expect(val).toHaveText('Any time')
  await expect(slider).toHaveAttribute('aria-valuetext', 'Any time')
  await slider.press('Home')
  await expect(val).toHaveText('Up to 15 min')
})

test('the Time chip sheet has the same switch and applies on Show results', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await expect(sheet.getByTestId('time-slider-val')).toHaveText('Up to 30 min')
  await sheet.getByTestId('side-pickup').click()
  await setStop(sheet.getByTestId('distance-slider'), '1')
  // Moving the slider changes nothing until the button.
  await page.waitForTimeout(300)
  await expect(sheet).toBeVisible()
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')
  await sheet.getByTestId('sheet-apply').click()
  await expect(sheet).toHaveCount(0)
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&distance=1$/)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 1 mi ▾')
  await expect(page.getByTestId('meal-card')).toHaveCount(7)

  // Back to delivery: the distance is cleared and Nearest becomes Fastest.
  await page.getByTestId('chip-time').click()
  await expect(sheet.getByTestId('side-pickup')).toHaveAttribute('aria-checked', 'true')
  await sheet.getByTestId('side-delivery').click()
  await setStop(sheet.getByTestId('time-slider'), '30')
  await sheet.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expect(page.getByTestId('chip-time')).toHaveText('30 min ▾')
})

test('closing the Time chip sheet without applying keeps the filters', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await setStop(sheet.getByTestId('time-slider'), '15')
  await page.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } })
  await expect(sheet).toHaveCount(0)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await expectBudget20Time30(page)
})

test('after a switch in the Time chip sheet the slider is at Any', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  const slider = sheet.getByTestId('time-slider')
  await expect(slider).toHaveAttribute('aria-valuetext', '30 minutes')
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.getByTestId('distance-slider')).toHaveAttribute('aria-valuetext', 'Any distance')
  await sheet.getByTestId('side-delivery').click()
  await expect(slider).toHaveAttribute('aria-valuetext', 'Any time')
  await setStop(slider, '30')
  await sheet.getByTestId('sheet-apply').click()
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
  await setStop(page.getByTestId('distance-slider'), '1')
  await page.getByTestId('sheet-apply').click()
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

test('a card tapped while pickup loads opens the menu at the prices it was shown with', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  // Hold the pickup answer so the delivery cards stay on screen, dimmed.
  const held: Route[] = []
  await page.route('**/api/quick-meal/search?*distance=1*', (route) => {
    held.push(route)
  })
  await page.getByTestId('chip-time').click()
  await page.getByTestId('sheet-time').getByTestId('side-pickup').click()
  await setStop(page.getByTestId('distance-slider'), '1')
  await page.getByTestId('sheet-apply').click()
  await expect(page.locator('[data-testid="results"][aria-busy="true"]')).toBeVisible()
  await expect.poll(() => held.length).toBeGreaterThan(0)

  // The menu opens with the delivery filters of the cards on screen, not the pickup ones still loading.
  await page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' }).click()
  await expect(page).toHaveURL(/\/quick-meal\/restaurants\/paseo-rice-bowl\?budget=20$/)
  await waitForResults(page, 'menu-results')
  const chicken = page.getByTestId('menu-fits').getByTestId('menu-row').filter({ hasText: 'Chicken Rice Bowl' })
  await expect(chicken.getByTestId('menu-est')).toHaveText('Est. $18.73')
  await chicken.getByTestId('menu-est').click()
  await expect(page.getByTestId('breakdown-row-delivery')).toHaveCount(1)
  await expect(page.getByTestId('breakdown-total')).toContainText('$18.73')

  await page.unroute('**/api/quick-meal/search?*distance=1*')
  for (const route of held) await route.continue().catch(() => {})
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
  await setStop(page.getByTestId('time-slider'), '30')
  await page.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page.getByTestId('count-line')).toContainText('fastest first')
  await expect(page).toHaveURL(/\/quick-meal\?time=30$/)

  // Delivery shows no Nearest option: each side shows exactly 3 sorts.
  // Dish cards (the default) sort by Most liked, restaurant cards by Top rated.
  await page.getByTestId('chip-filters').click()
  await expect(sheet.locator('[data-testid^="sort-"]')).toHaveText(['Fastest', 'Lowest price', 'Most liked'])
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.locator('[data-testid^="sort-"]')).toHaveText(['Nearest', 'Lowest price', 'Most liked'])
  await setLayout(page, 'places')
  await page.goto('/quick-meal?time=30')
  await waitForResults(page)
  await page.getByTestId('chip-filters').click()
  await expect(sheet.locator('[data-testid^="sort-"]')).toHaveText(['Fastest', 'Lowest price', 'Top rated'])
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.locator('[data-testid^="sort-"]')).toHaveText(['Nearest', 'Lowest price', 'Top rated'])

  // Lowest price survives switches, and a step on the same side keeps it.
  await page.goto('/quick-meal?time=30&sort=price')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  await setStop(page.getByTestId('time-slider'), '45')
  await page.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?time=45&sort=price$/)
  await page.getByTestId('chip-filters').click()
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.getByTestId('sort-price')).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByTestId('side-delivery').click()
  await expect(sheet.getByTestId('sort-price')).toHaveAttribute('aria-pressed', 'true')
})

test('the distance slider moves in half miles up to 5 mi, then Any', async ({ page }) => {
  await page.goto('/quick-meal?distance=1')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  const slider = sheet.getByTestId('distance-slider')
  const val = sheet.getByTestId('distance-slider-val')
  await expect(val).toHaveText('Within 1 mi')
  await slider.press('ArrowRight')
  await expect(val).toHaveText('Within 1.5 mi')
  await setStop(slider, '5')
  await expect(val).toHaveText('Within 5 mi')
  await slider.press('ArrowRight')
  await expect(val).toHaveText('Any distance')
  await slider.press('Home')
  await expect(val).toHaveText('Within 0.5 mi')
  await setStop(slider, '2.5')
  await sheet.getByTestId('sheet-apply').click()
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?distance=2\.5$/)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 2.5 mi ▾')
})

test('Clear in the Budget chip sheet sets Any budget, and applies on Show results', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expectBudget20Time30(page)
  await page.getByTestId('chip-budget').click()
  const sheet = page.getByTestId('sheet-budget')
  await sheet.getByTestId('sheet-clear').click()
  await expect(sheet.getByTestId('budget-slider')).toHaveAttribute('aria-valuetext', 'Any budget')
  // Clear only moves the draft.
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
  await sheet.getByTestId('sheet-apply').click()
  await expect(sheet).toHaveCount(0)
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?time=30$/)
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('1')
})

test('Clear in the Time chip sheet goes back to Delivery at Any time', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&distance=1')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await expect(sheet.getByTestId('side-pickup')).toHaveAttribute('aria-checked', 'true')
  await sheet.getByTestId('sheet-clear').click()
  await expect(sheet.getByTestId('side-delivery')).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByTestId('time-slider')).toHaveAttribute('aria-valuetext', 'Any time')
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&distance=1$/)
  await sheet.getByTestId('sheet-apply').click()
  await expect(sheet).toHaveCount(0)
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?budget=20$/)
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('1')
})
