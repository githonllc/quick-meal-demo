import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setConfig, setLayout, setStop, waitForResults } from './helpers'

const CONFIG = 'quickMeal.config.v1'
const FILTERS = 'quickMeal.filters.v1'
const TOAST_FLAG = 'quickMeal.savedToastShown'
const RESULTS = 'quickMeal.study.v1'
const TRIAL = 'quickMeal.trial.v1'
const MENU = '/quick-meal/restaurants/paseo-rice-bowl'

// Start every test with the default settings, no saved default and no study results.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

const local = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)
const trialId = (page: Page) =>
  page.evaluate<string | null>(`JSON.parse(sessionStorage.getItem('${TRIAL}') ?? 'null')?.id ?? null`)
const results = async (page: Page) => JSON.parse((await local(page, RESULTS)) ?? '[]') as Record<string, unknown>[]

async function addToCart(page: Page) {
  await page.getByTestId('breakdown-sheet').getByRole('button', { name: /^Add to cart/ }).click()
}

test('the sliders button opens the demo settings, and Back returns to the same list', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await page.getByRole('button', { name: 'Demo settings' }).click()
  await expect(page).toHaveURL(/\/demo-settings$/)
  await expect(page.getByTestId('settings-banner')).toHaveText('For the research team. Not part of the student app.')
  for (const name of ['Layout', 'Time range', 'Distance range', 'Save filters', 'Study timer', 'Network', 'Reset demo state', 'Restore default settings'])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await page.getByLabel('Back').click()
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
})

test('Layout switches between restaurant cards and dish cards', async ({ page }) => {
  await page.goto('/demo-settings')
  // Two radio rows, Restaurant first on top and checked.
  await expect(page.getByRole('radiogroup', { name: 'Layout' }).getByRole('radio')).toHaveCount(2)
  await expect(page.locator('.set-radio')).toHaveText([/^Restaurant first/, /^Dish first/])
  await expect(page.getByTestId('layout-places')).toBeChecked()
  await page.goto('/quick-meal')
  await waitForResults(page)
  // Restaurant cards have no price button.
  await expect(page.getByTestId('meal-card').first()).toBeVisible()
  await expect(page.getByTestId('meal-price')).toHaveCount(0)

  await page.goto('/demo-settings')
  await page.getByText('Dish first').click()
  await expect(page.getByTestId('layout-meals')).toBeChecked()
  await expect(page.getByTestId('layout-places')).not.toBeChecked()
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}').layout).toBe('meals')
  await page.goto('/quick-meal')
  await waitForResults(page)
  await expect(page.getByTestId('meal-price').first()).toBeVisible()
})

test('Save filters off: no load, no save, no "Saved" toast, on the list and on the menu', async ({ page }) => {
  // A default saved earlier must not come back.
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ budget: 15, time: 20 })), FILTERS)
  await page.goto('/demo-settings')
  await page.getByRole('switch', { name: 'Save filters' }).click()
  await expect(page.getByRole('switch', { name: 'Save filters' })).toHaveAttribute('aria-checked', 'false')
  await page.evaluate((k) => localStorage.removeItem(k), FILTERS)

  await page.goto('/quick-meal')
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal$/)
  await page.getByTestId('chip-budget').click()
  await page.getByTestId('budget-slider').fill('20')
  await page.getByTestId('sheet-apply').click()
  await expect(page).toHaveURL(/budget=20/)
  // The toast would show in the same click that applied the filters.
  expect(await page.getByTestId('toast').count()).toBe(0)
  expect(await local(page, FILTERS)).toBeNull()

  // The menu's Change sheet obeys the same switch.
  await page.goto(`${MENU}?budget=20`)
  await waitForResults(page, 'menu-results')
  await page.getByRole('button', { name: 'Change' }).click()
  await page.getByTestId('budget-slider').fill('15')
  await page.getByTestId('sheet-apply').click()
  await expect(page).toHaveURL(/budget=15/)
  expect(await page.getByTestId('toast').count()).toBe(0)
  expect(await local(page, FILTERS)).toBeNull()
  expect(await local(page, TOAST_FLAG)).toBeNull()
})

test('Reset demo state clears saved filters and results, and keeps the settings', async ({ page }) => {
  const config = JSON.stringify({ layout: 'meals', study: true })
  await page.evaluate(
    ([c, f, t, r]) => {
      localStorage.setItem(c, JSON.stringify({ layout: 'meals', study: true }))
      localStorage.setItem(f, '{"budget":20}')
      localStorage.setItem(t, '1')
      localStorage.setItem(r, '[]')
    },
    [CONFIG, FILTERS, TOAST_FLAG, RESULTS],
  )
  await page.goto('/demo-settings')
  await page.getByRole('button', { name: 'Reset demo state' }).click()
  await expect(page.getByTestId('toast')).toHaveText('Demo state reset.')
  for (const key of [FILTERS, TOAST_FLAG, RESULTS]) expect(await local(page, key)).toBeNull()
  expect(await local(page, CONFIG)).toBe(config)
  await expect(page.getByTestId('layout-meals')).toBeChecked()
})

test('a time range of 10 to 60 min by 5: slider, URL, menu and relax chip use its steps', async ({ page }) => {
  // A default saved before the change: a new range clears it.
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ budget: 15, time: 17 })), FILTERS)
  await page.goto('/demo-settings')
  await expect(page.getByTestId('range-note')).toHaveText('Changing a range clears the saved filters.')
  await expect(page.getByTestId('time-step').locator('option')).toHaveText(['1 min', '5 min', '10 min', '15 min'])
  await expect(page.getByTestId('time-apply')).toBeDisabled()
  await page.getByTestId('time-from').fill('10')
  await page.getByTestId('time-to').fill('60')
  await page.getByTestId('time-step').selectOption('5')
  // Nothing is saved until Apply.
  expect(await local(page, CONFIG)).toBeNull()
  await page.getByTestId('time-apply').click()
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}').time).toEqual({ min: 10, max: 60, step: 5 })
  expect(await local(page, FILTERS)).toBeNull()
  await expect(page.getByTestId('time-apply')).toBeDisabled()

  await page.goto('/quick-meal')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await expect(sheet.locator('.slider-ends span')).toHaveText(['10 min', 'Any'])
  await setStop(sheet.getByTestId('time-slider'), '25')
  await expect(sheet.getByTestId('time-slider-val')).toHaveText('Up to 25 min')
  await sheet.getByTestId('sheet-apply').click()
  await expect(page).toHaveURL(/\/quick-meal\?time=25$/)
  await waitForResults(page)
  await expect(page.getByTestId('chip-time')).toHaveText('25 min ▾')

  // The menu request carries the range and loads.
  const menu = page.waitForResponse((r) => r.url().includes('/api/quick-meal/restaurants/'))
  await page.getByTestId('meal-card').first().click()
  expect((await menu).status()).toBe(200)
  await waitForResults(page, 'menu-results')
  await expect(page.getByTestId('retry')).toHaveCount(0)

  // The relax chip moves by 5 min: 20, not 16.
  await page.goto('/quick-meal?budget=15&time=15')
  await expect(page.getByTestId('relax-chip').nth(1)).toHaveText('Time up to 20 min · 2 results')
})

test('a distance range of 1 to 10 mi by 1: pickup at 7 mi opens a menu with pickup prices', async ({ page }) => {
  await page.goto('/demo-settings')
  await page.getByTestId('distance-from').fill('1')
  await page.getByTestId('distance-to').fill('10')
  await page.getByTestId('distance-step').selectOption('1')
  // Enter in a box applies.
  await page.getByTestId('distance-to').press('Enter')
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}').distance).toEqual({ min: 1, max: 10, step: 1 })

  await page.goto('/quick-meal')
  await waitForResults(page)
  await page.getByTestId('chip-time').click()
  const sheet = page.getByTestId('sheet-time')
  await sheet.getByTestId('side-pickup').click()
  await expect(sheet.locator('.slider-ends span')).toHaveText(['1 mi', 'Any'])
  await setStop(sheet.getByTestId('distance-slider'), '7')
  await sheet.getByTestId('sheet-apply').click()
  await expect(page).toHaveURL(/\/quick-meal\?distance=7$/)
  await waitForResults(page)
  await expect(page.getByTestId('chip-time')).toHaveText('Pickup · 7 mi ▾')

  const menu = page.waitForResponse((r) => r.url().includes('/api/quick-meal/restaurants/'))
  await page.getByTestId('meal-card').first().click()
  const res = await menu
  expect(res.status()).toBe(200)
  expect(new URL(res.url()).searchParams.get('drange')).toBe('1,10,1')
  expect(((await res.json()) as { pickup: boolean }).pickup).toBe(true)
})

test('an invalid range says why and cannot be applied', async ({ page }) => {
  await page.goto('/demo-settings')
  const from = page.getByTestId('time-from')
  await expect(page.getByTestId('time-error')).toHaveText('')
  await expect(from).toHaveAttribute('aria-invalid', 'false')
  await from.fill('60')
  await expect(page.getByTestId('time-error')).toHaveText('To must be more than From')
  await expect(page.getByTestId('time-apply')).toBeDisabled()
  await expect(from).toHaveAttribute('aria-invalid', 'true')
  await expect(from).toHaveAttribute('aria-describedby', 'time-error')
  // Enter does not apply an invalid range.
  await from.press('Enter')
  expect(await local(page, CONFIG)).toBeNull()

  await page.getByTestId('distance-from').fill('1.3')
  await expect(page.getByTestId('distance-error')).toHaveText('Use half miles, like 1.5')
  await expect(page.getByTestId('distance-apply')).toBeDisabled()
  await page.getByTestId('distance-from').fill('1.5')
  await expect(page.getByTestId('distance-error')).toHaveText('')
  await expect(page.getByTestId('distance-apply')).toBeEnabled()

  // No sideways scroll on a 390 px phone.
  expect(await page.evaluate<number>('document.documentElement.scrollWidth')).toBeLessThanOrEqual(390)
})

test('the start-up URL is cleaned: an off-step time, a sort of the other layout, a layout param', async ({ page }) => {
  await setConfig(page, { time: { min: 10, max: 60, step: 5 } })
  await page.goto('/quick-meal?time=22')
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal$/)

  await page.goto('/quick-meal?layout=places&sort=liked')
  await waitForResults(page)
  await expect(page).toHaveURL(/\/quick-meal\?sort=rated$/)

  // The error-state demo link keeps its fail=1.
  await page.goto('/quick-meal?fail=1&sort=fastest')
  await expect(page.getByTestId('retry')).toBeVisible()
  await expect(page).toHaveURL(/\/quick-meal\?fail=1$/)
})

test('Restore default settings sets every switch back', async ({ page }) => {
  await setConfig(page, {
    layout: 'meals',
    time: { min: 10, max: 60, step: 5 },
    distance: { min: 1, max: 10, step: 1 },
    saveFilters: false,
    study: true,
    network: { delayMs: 500, fail: true },
  })
  await page.goto('/demo-settings')
  await expect(page.getByRole('switch', { name: 'Study timer' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('time-from')).toHaveValue('10')
  // A typed range that was not applied goes back too.
  await page.getByTestId('time-from').fill('20')
  await page.getByRole('button', { name: 'Restore default settings' }).click()
  await expect(page.getByTestId('layout-places')).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Save filters' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('switch', { name: 'Study timer' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('switch', { name: 'Fail every request' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('delay-0')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('time-from')).toHaveValue('15')
  await expect(page.getByTestId('time-to')).toHaveValue('45')
  await expect(page.getByTestId('distance-from')).toHaveValue('0.5')
  await expect(page.getByTestId('distance-step')).toHaveValue('0.5')
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}')).toMatchObject({
    layout: 'places',
    study: false,
    time: { min: 15, max: 45, step: 1 },
    distance: { min: 0.5, max: 5, step: 0.5 },
  })
})

test('study off: Add to cart records nothing', async ({ page }) => {
  await setLayout(page, 'meals')
  await page.goto('/quick-meal?budget=20&time=30')
  await page.getByTestId('meal-price').first().click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText('Cart is not part of this demo.')
  expect(await trialId(page)).toBeNull()
  expect(await local(page, RESULTS)).toBeNull()
})

test('study on: the first Add to cart records one result, a second tap records nothing', async ({ page, context }) => {
  await setConfig(page, { study: true, layout: 'meals' })
  await page.goto('/')
  await page.getByTestId('quick-meal-entry').click()
  await waitForResults(page)
  expect(await trialId(page)).not.toBeNull()

  const card = page.getByTestId('meal-card').first()
  const item = (await card.locator('.meal-name').innerText()).trim()
  await card.getByTestId('meal-price').click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText(/^Time to first Add to cart: \d+\.\d s$/)
  expect(await trialId(page)).toBeNull()

  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText('Cart is not part of this demo.')
  const rows = await results(page)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ layout: 'meals', path: 'list', item })
  expect(typeof rows[0].firstOpenMs).toBe('number')

  // The settings list it and copy it as CSV.
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Demo settings' }).click()
  await expect(page.getByTestId('study-row')).toHaveCount(1)
  await expect(page.getByTestId('study-row')).toContainText(item)
  await page.getByRole('button', { name: 'Copy CSV' }).click()
  await expect(page.getByTestId('toast')).toHaveText('Copied 1 result as CSV.')
  await page.getByRole('button', { name: 'Clear results' }).click()
  await expect(page.getByTestId('study-row')).toHaveCount(0)
  expect(await local(page, RESULTS)).toBeNull()
})

test('study on: back from a menu keeps the trial, and the menu is the path', async ({ page }) => {
  await setConfig(page, { study: true })
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  const id = await trialId(page)
  expect(id).not.toBeNull()

  await page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' }).click()
  await waitForResults(page, 'menu-results')
  await page.getByLabel('Back').click()
  await waitForResults(page)
  expect(await trialId(page)).toBe(id)

  await page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' }).click()
  await page.getByTestId('menu-row').filter({ hasText: 'Tofu Rice Bowl' }).click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText(/^Time to first Add to cart/)
  const rows = await results(page)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    id,
    path: 'menu',
    restaurant: 'Paseo Rice Bowl',
    item: 'Tofu Rice Bowl',
    startFilters: 'budget=20&time=30',
  })
  expect(rows[0].firstOpenMs as number).toBeLessThanOrEqual(rows[0].ms as number)

  // Back from the menu after the trial ended does not start a new one.
  await page.keyboard.press('Escape')
  await page.getByLabel('Back').click()
  await waitForResults(page)
  expect(await trialId(page)).toBeNull()
})

test('study on: Home cancels the trial, and Quick Meal starts a new one', async ({ page }) => {
  await setConfig(page, { study: true })
  await page.goto('/quick-meal')
  await waitForResults(page)
  const id = await trialId(page)
  expect(id).not.toBeNull()
  await page.getByLabel('Back').click()
  await expect(page).toHaveURL(/\/$/)
  expect(await trialId(page)).toBeNull()
  await page.getByTestId('quick-meal-entry').click()
  await waitForResults(page)
  const next = await trialId(page)
  expect(next).not.toBeNull()
  expect(next).not.toBe(id)
})

test('study on: a reload starts a new trial, so the time counts from the reload', async ({ page }) => {
  await setConfig(page, { study: true, layout: 'meals' })
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  const id = await trialId(page)
  expect(id).not.toBeNull()
  // Make the old trial look 10 minutes old.
  await page.evaluate((k) => {
    const t = JSON.parse(sessionStorage.getItem(k) ?? '{}')
    sessionStorage.setItem(k, JSON.stringify({ ...t, startedAt: t.startedAt - 600_000 }))
  }, TRIAL)

  await page.reload()
  await waitForResults(page)
  const next = await trialId(page)
  expect(next).not.toBeNull()
  expect(next).not.toBe(id)
  await page.getByTestId('meal-price').first().click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText(/^Time to first Add to cart/)
  const rows = await results(page)
  expect(rows).toHaveLength(1)
  expect(rows[0].id).toBe(next)
  expect(rows[0].ms as number).toBeLessThan(60_000)
})

test('study on: a ?layout= link after an abandoned trial records the new layout', async ({ page }) => {
  await setConfig(page, { study: true, layout: 'meals' })
  await page.goto('/quick-meal')
  await waitForResults(page)
  expect(await trialId(page)).not.toBeNull()

  await page.goto('/quick-meal?layout=places')
  await waitForResults(page)
  await page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' }).click()
  await page.getByTestId('menu-row').filter({ hasText: 'Tofu Rice Bowl' }).click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText(/^Time to first Add to cart/)
  const rows = await results(page)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ layout: 'places', path: 'menu' })
})

test('study on: a result that cannot be saved says so', async ({ page }) => {
  await setConfig(page, { study: true, layout: 'meals' })
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  // Storage that is full for the results only.
  await page.evaluate((k) => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === k) throw new Error('full')
      setItem.call(this, key, value)
    }
  }, RESULTS)
  await page.getByTestId('meal-price').first().click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText('Study result not saved')
  expect(await local(page, RESULTS)).toBeNull()
})

test('network delay: a repeated search shows the loading bar, even when cached', async ({ page }) => {
  await setConfig(page, { network: { delayMs: 500, fail: false } })
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  await page.getByTestId('cuisine-tab-chinese').click()
  await waitForResults(page)
  // This search was answered before, so only the delay keeps it loading.
  await page.getByTestId('cuisine-tab-all').click()
  await expect(page.getByTestId('loading-bar')).toBeVisible()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
})

test('network fail: every request fails until it is turned off', async ({ page }) => {
  await setConfig(page, { network: { delayMs: 0, fail: true } })
  const failed: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('fail=1')) failed.push(req.url())
  })
  await page.goto('/quick-meal')
  await expect(page.getByTestId('retry')).toBeVisible()
  expect(failed.length).toBeGreaterThan(0)
  await setConfig(page, {})
  await page.getByTestId('retry').click()
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(28)
})

test('Restore default settings clears typed ranges even when the saved ranges are the defaults', async ({ page }) => {
  await page.goto('/demo-settings')
  await page.getByTestId('time-from').fill('60')
  await page.getByTestId('distance-to').fill('1.3')
  await expect(page.getByTestId('time-error')).toBeVisible()
  await page.getByRole('button', { name: 'Restore default settings' }).click()
  await expect(page.getByTestId('time-from')).toHaveValue('15')
  await expect(page.getByTestId('distance-to')).toHaveValue('5')
  // The error line is a live region that stays in the page; it is empty when the range is valid.
  await expect(page.getByTestId('time-error')).toHaveText('')
  await expect(page.getByTestId('distance-error')).toHaveText('')
})
