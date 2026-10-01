import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { waitForResults } from './helpers'

// "$18.73" -> 1873. Item names may hold digits, so read only the dollar amount.
async function cents(el: Locator): Promise<number> {
  const m = /\$(\d+)\.(\d\d)/.exec(await el.innerText())
  if (!m) throw new Error(`No price in "${await el.innerText()}"`)
  return Number(m[1]) * 100 + Number(m[2])
}

const ROWS = ['item', 'delivery', 'small', 'service', 'tax', 'tip']

test('AC-01: Home opens Quick Meal with chips, tabs and meal cards', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('quick-meal-entry').click()
  const chips = page.locator('[data-testid^="chip-"]:not([data-testid="chip-filters-badge"])')
  await expect(chips).toHaveCount(3)
  await expect(chips.nth(0)).toHaveAttribute('data-testid', 'chip-filters')
  await expect(chips.nth(1)).toHaveAttribute('data-testid', 'chip-time')
  await expect(chips.nth(2)).toHaveAttribute('data-testid', 'chip-budget')
  await expect(page.getByTestId('chip-distance')).toHaveCount(0)
  await expect(page.getByTestId('cuisine-tab-all')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('meal-card').first()).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Restaurant' })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Grocery' })).toHaveCount(0)
})

test('AC-02: every price fits the budget and each breakdown adds up', async ({ page }) => {
  await page.goto('/quick-meal?budget=20')
  await waitForResults(page)
  const prices = page.getByTestId('meal-price')
  await expect(prices.first()).toBeVisible()
  for (const price of await prices.all()) {
    expect(await cents(price)).toBeLessThanOrEqual(2000)
  }

  for (let i = 0; i < 3; i++) {
    await prices.nth(i).click()
    const sheet = page.getByTestId('breakdown-sheet')
    await expect(sheet).toBeVisible()
    let sum = 0
    for (const row of ROWS) sum += await cents(sheet.getByTestId(`breakdown-row-${row}`))
    expect(sum).toBe(await cents(sheet.getByTestId('breakdown-total')))
    expect(sum).toBe(await cents(prices.nth(i)))
    if ((await cents(sheet.getByTestId('breakdown-row-item'))) >= 1200) {
      await expect(sheet.getByTestId('breakdown-row-small')).toContainText('$0.00')
    }
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
  }
  // Tapping a price opens the sheet and does not leave the list.
  await expect(page).toHaveURL(/\/quick-meal\?budget=20$/)
})

test('AC-04: a cuisine tab splits the filtered meals and keeps the chips', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=20&distance=1')
  await expect(page.getByTestId('meal-card')).toHaveCount(4)
  await page.getByTestId('cuisine-tab-chinese').click()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(2)
  await expect(page.getByTestId('cuisine-tab-chinese')).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/cuisine=chinese/)
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $20 ▾')
  await expect(page.getByTestId('chip-time')).toHaveText('20 min ▾')
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('3')
})

test('the Paseo card shows its lead meal, all-in price and other fitting meals', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · Best match')
  const card = page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' })
  await expect(card).toContainText('Chicken Rice Bowl')
  await expect(card.getByTestId('meal-price')).toHaveText('$18.73 all-in')
  await expect(card).toContainText('Est. 13–18 min · 0.4 mi · $18.73 all-in')
  await expect(card.getByTestId('meal-more')).toContainText('+2 more under $20: Tofu Rice Bowl, Spam Musubi Plate')
  await card.getByTestId('meal-more').click()
  await expect(page).toHaveURL(/\/quick-meal\/restaurants\/paseo-rice-bowl\?budget=20$/)
})

test('AC-08: times are estimated ranges', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  const cards = page.getByTestId('meal-card')
  await expect(cards.first()).toBeVisible()
  for (const card of await cards.all()) {
    const m = /Est\. \d+–(\d+) min · [\d.]+ mi · \$\d+\.\d\d all-in/.exec(await card.innerText())
    if (!m) throw new Error(`No time range in "${await card.innerText()}"`)
    expect(Number(m[1])).toBeLessThanOrEqual(30)
  }
  await expect(page.getByTestId('meal-price').locator('b')).toHaveCount(0)
  await page.getByTestId('chip-filters').click()
  await expect(page.getByTestId('sheet-filters')).toContainText('Not guaranteed.')
})

test('error state offers a retry', async ({ page }) => {
  await page.goto('/quick-meal?fail=1')
  await expect(page.getByText('Could not load meals. Check your connection and try again.')).toBeVisible()
  await expect(page.getByTestId('retry')).toBeVisible()
})
