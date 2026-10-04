import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { setLayout, waitForResults } from './helpers'

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

test('AC-04: a cuisine tab splits the filtered meals and keeps the chips', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=20')
  await expect(page.getByTestId('meal-card')).toHaveCount(4)
  await page.getByTestId('cuisine-tab-chinese').click()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(2)
  await expect(page.getByTestId('cuisine-tab-chinese')).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/cuisine=chinese/)
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $20 ▾')
  await expect(page.getByTestId('chip-time')).toHaveText('20 min ▾')
  await expect(page.getByTestId('chip-filters-badge')).toHaveText('2')
})

test('error state offers a retry', async ({ page }) => {
  await page.goto('/quick-meal?fail=1')
  await expect(page.getByText('Could not load meals. Check your connection and try again.')).toBeVisible()
  await expect(page.getByTestId('retry')).toBeVisible()
})

test('a study link with ?layout= sets the layout, it stays, and the sort follows it', async ({ page }) => {
  // Start on dish cards, so the link has something to change.
  await page.goto('/')
  await setLayout(page, 'meals')
  await page.goto('/quick-meal?budget=20&time=30&sort=liked&layout=places')
  await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · top rated first')
  await expect(page.getByTestId('meal-card').first().locator('.meal-rating')).toBeVisible()
  await expect(page.getByTestId('meal-price')).toHaveCount(0)
  await page.goto('/quick-meal?budget=20&time=30&sort=liked')
  await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · top rated first')
  await page.goto('/?layout=meals')
  await page.goto('/quick-meal?budget=20&time=30&sort=rated')
  await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · most liked first')
  await expect(page.getByTestId('meal-price')).toHaveCount(6)
})

// Dish cards, set in the demo settings.
test.describe('dish cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setLayout(page, 'meals')
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

  test('the Paseo card shows its lead meal, all-in price and other fitting meals', async ({ page }) => {
    await page.goto('/quick-meal?budget=20&time=30')
    await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · fastest first')
    // Fastest first: Taylor St. Dumplings, then Santa Clara Taco Co.
    const first = page.getByTestId('meal-card').nth(0)
    await expect(first).toContainText('Soup Dumplings (8)')
    await expect(first).toContainText('Taylor St. Dumplings')
    await expect(first).toContainText('Est. 9–14 min · 0.4 mi · $18.44 all-in')
    await expect(page.getByTestId('meal-card').nth(1)).toContainText('Carne Asada Burrito')
    await expect(page.getByTestId('meal-card').nth(1)).toContainText('$19.05 all-in')
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

  test('without a budget the more line counts the rest of the menu', async ({ page }) => {
    await page.goto('/quick-meal?time=15')
    await waitForResults(page)
    const card = page.getByTestId('meal-card').filter({ hasText: 'Taylor St. Dumplings' })
    await expect(card.getByTestId('meal-more')).toHaveText(/^\+4 more on the menu\s›$/)
  })

  test('Most liked puts the best-liked lead meal first, and an old sort=rated link opens it', async ({ page }) => {
    await page.goto('/quick-meal?budget=20&time=30&sort=rated')
    await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · most liked first')
    const search = await (await page.request.get('/api/quick-meal/search?budget=20&time=30&sort=liked')).json()
    const names: string[] = search.exact.map((c: { item: { name: string } }) => c.item.name)
    await expect(page.getByTestId('meal-card').locator('.meal-name')).toHaveText(names)
    const likes: number[] = search.exact.map((c: { item: { likePct: number } }) => c.item.likePct)
    expect(likes).toEqual([...likes].sort((a, b) => b - a))
  })
})

// Restaurant cards: the default layout, set here too so these tests say what they need.
test.describe('restaurant cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setLayout(page, 'places')
  })

  test('AC-02: every card counts only meals that fit, and each menu breakdown adds up', async ({ page }) => {
    await page.goto('/quick-meal?budget=20')
    await waitForResults(page)
    const cards = page.getByTestId('meal-card')
    const search = await (await page.request.get('/api/quick-meal/search?budget=20')).json()
    await expect(cards).toHaveCount(search.exact.length)
    // The dish line counts the meals the menu puts under the budget, and every one of them is at most $20.
    for (const [i, card] of search.exact.entries()) {
      const id: string = card.restaurant.id
      const menu = await (await page.request.get(`/api/quick-meal/restaurants/${id}?budget=20`)).json()
      for (const row of menu.fits) expect(row.price.totalCents).toBeLessThanOrEqual(2000)
      for (const row of menu.over) expect(row.price.totalCents).toBeGreaterThan(2000)
      await expect(cards.nth(i)).toContainText(card.restaurant.name)
      await expect(cards.nth(i).getByTestId('meal-more')).toContainText(`${menu.fits.length} under $20: `)
    }

    // On a card's menu, every meal under the budget is at most $20 and its breakdown adds up to the cent.
    await cards.first().click()
    await waitForResults(page, 'menu-results')
    const rows = page.getByTestId('menu-fits').getByTestId('menu-row')
    await expect(rows.first()).toBeVisible()
    const sheet = page.getByTestId('breakdown-sheet')
    for (const row of await rows.all()) {
      const est = row.getByTestId('menu-est')
      const total = await cents(est)
      expect(total).toBeLessThanOrEqual(2000)
      await est.click()
      await expect(sheet).toBeVisible()
      let sum = 0
      for (const r of ROWS) sum += await cents(sheet.getByTestId(`breakdown-row-${r}`))
      expect(sum).toBe(await cents(sheet.getByTestId('breakdown-total')))
      expect(sum).toBe(total)
      // The small-order fee is only for an item under $12 (and not every place charges one).
      if ((await cents(sheet.getByTestId('breakdown-row-item'))) >= 1200) {
        await expect(sheet.getByTestId('breakdown-row-small')).toContainText('$0.00')
      }
      await page.keyboard.press('Escape')
      await expect(sheet).toHaveCount(0)
    }
  })

  test('a card shows the place, its stars, time and distance, and the meals that fit', async ({ page }) => {
    await page.goto('/quick-meal?budget=20&time=30')
    await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · fastest first')
    // Fastest first: Taylor St. Dumplings, then Santa Clara Taco Co.
    const first = page.getByTestId('meal-card').nth(0)
    await expect(first.locator('.meal-name')).toHaveText('Taylor St. Dumplings')
    await expect(first).toContainText('4.7 ★ (900+)')
    await expect(first.getByTestId('meal-meta')).toHaveText('Est. 9–14 min · 0.4 mi')
    await expect(first.getByTestId('meal-more')).toContainText('5 under $20: Soup Dumplings (8), Pork Dumplings (12)')
    await expect(first.locator('.tile')).toHaveAttribute('aria-label', 'dumplings')
    // A long dish line is cut with an ellipsis. It does not push the card or the rating off screen.
    await expect(first.locator('.meal-rating')).toBeInViewport({ ratio: 1 })
    const second = page.getByTestId('meal-card').nth(1)
    await expect(second.locator('.meal-name')).toHaveText('Santa Clara Taco Co.')
    await expect(second.getByTestId('meal-more')).toContainText('5 under $20: Carne Asada Burrito, Al Pastor Tacos (3)')
    const card = page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' })
    await expect(card.getByTestId('meal-more')).toContainText('3 under $20: Chicken Rice Bowl, Tofu Rice Bowl, Spam Musubi Plate')
    await expect(card.getByTestId('meal-more')).toContainText('›')
    await card.getByTestId('meal-more').click()
    await expect(page).toHaveURL(/\/quick-meal\/restaurants\/paseo-rice-bowl\?budget=20$/)
  })

  test('without a budget the dish line counts the whole menu', async ({ page }) => {
    await page.goto('/quick-meal?time=15')
    await waitForResults(page)
    const card = page.getByTestId('meal-card').filter({ hasText: 'Taylor St. Dumplings' })
    await expect(card.getByTestId('meal-more')).toHaveText(/^5 on the menu\s›$/)
  })

  test('an old sort=liked link opens Top rated: stars, then rating count', async ({ page }) => {
    await page.goto('/quick-meal?budget=20&time=30&sort=liked')
    await expect(page.getByTestId('count-line')).toHaveText('6 places have a meal that fits · top rated first')
    // Curry House and Santa Clara both have 4.5 stars; Curry House has more ratings.
    await expect(page.getByTestId('meal-card').locator('.meal-name')).toHaveText([
      'Taylor St. Dumplings',
      'Paseo Rice Bowl',
      'Willow Glen Curry House',
      'Santa Clara Taco Co.',
      '4th St. Noodle Bar',
      'Jackson St. Wok',
    ])
  })

  test('AC-08: times are estimated ranges and cards show no price', async ({ page }) => {
    await page.goto('/quick-meal?budget=20&time=30')
    await waitForResults(page)
    const cards = page.getByTestId('meal-card')
    await expect(cards.first()).toBeVisible()
    for (const card of await cards.all()) {
      const meta = card.getByTestId('meal-meta')
      const m = /^Est\. \d+–(\d+) min · [\d.]+ mi$/.exec(await meta.innerText())
      if (!m) throw new Error(`No time range in "${await meta.innerText()}"`)
      expect(Number(m[1])).toBeLessThanOrEqual(30)
      // Nothing bold in that line.
      await expect(meta.locator('b, strong')).toHaveCount(0)
      await expect(meta).toHaveCSS('font-weight', '400')
      const text = await card.innerText()
      expect(text).not.toContain('all-in')
      expect(text).not.toMatch(/\$\d+\.\d\d/)
    }
    await expect(page.getByTestId('meal-price')).toHaveCount(0)
    await page.getByTestId('chip-filters').click()
    await expect(page.getByTestId('sheet-filters')).toContainText('Not guaranteed.')
  })
})
