import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setConfig, waitForResults } from './helpers'

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

test('the gear opens the demo settings, and Back returns to the same list', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await page.getByRole('button', { name: 'Demo settings' }).click()
  await expect(page).toHaveURL(/\/demo-settings$/)
  await expect(page.getByTestId('settings-banner')).toHaveText('For the research team. Not part of the student app.')
  for (const name of ['Layout', 'Save filters', 'Study timer', 'Network', 'Reset demo state', 'Restore default settings'])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await page.getByLabel('Back').click()
  await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
})

test('Layout switches between dish cards and restaurant cards', async ({ page }) => {
  await page.goto('/demo-settings')
  await expect(page.getByTestId('layout-meals')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('layout-places').click()
  await expect(page.getByTestId('layout-places')).toHaveAttribute('aria-checked', 'true')
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}').layout).toBe('places')
  await page.goto('/quick-meal')
  await waitForResults(page)
  // Restaurant cards have no price button.
  await expect(page.getByTestId('meal-card').first()).toBeVisible()
  await expect(page.getByTestId('meal-price')).toHaveCount(0)
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
  const config = JSON.stringify({ layout: 'places', study: true })
  await page.evaluate(
    ([c, f, t, r]) => {
      localStorage.setItem(c, JSON.stringify({ layout: 'places', study: true }))
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
  await expect(page.getByTestId('layout-places')).toHaveAttribute('aria-checked', 'true')
})

test('Restore default settings sets every switch back', async ({ page }) => {
  await setConfig(page, { layout: 'places', saveFilters: false, study: true, network: { delayMs: 500, fail: true } })
  await page.goto('/demo-settings')
  await expect(page.getByRole('switch', { name: 'Study timer' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Restore default settings' }).click()
  await expect(page.getByTestId('layout-meals')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('switch', { name: 'Save filters' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('switch', { name: 'Study timer' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('switch', { name: 'Fail every request' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('delay-0')).toHaveAttribute('aria-checked', 'true')
  expect(JSON.parse((await local(page, CONFIG)) ?? '{}')).toMatchObject({ layout: 'meals', study: false })
})

test('study off: Add to cart records nothing', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await page.getByTestId('meal-price').first().click()
  await addToCart(page)
  await expect(page.getByTestId('toast')).toHaveText('Cart is not part of this demo.')
  expect(await trialId(page)).toBeNull()
  expect(await local(page, RESULTS)).toBeNull()
})

test('study on: the first Add to cart records one result, a second tap records nothing', async ({ page, context }) => {
  await setConfig(page, { study: true })
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
