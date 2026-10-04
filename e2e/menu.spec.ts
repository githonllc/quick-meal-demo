import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { waitForResults } from './helpers'

const MENU = '/quick-meal/restaurants/paseo-rice-bowl'

// Start every test with no saved default and no "Saved" toast flag.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

const names = (page: Page, section: string) =>
  page.getByTestId(section).getByTestId('menu-row').locator('.menu-dish').allTextContents()

test('AC-06: the menu shows what fits first, then what is just over', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  const card = page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' })
  await card.getByTestId('meal-more').click()
  await expect(page).toHaveURL(new RegExp(`${MENU}\\?budget=20$`))
  await waitForResults(page, 'menu-results')

  await expect(page.getByTestId('menu-fits-title')).toHaveText('Under your budget (3)')
  expect(await names(page, 'menu-fits')).toEqual(['Chicken Rice Bowl', 'Tofu Rice Bowl', 'Spam Musubi Plate'])
  await expect(page.getByTestId('menu-over-title')).toHaveText('Over your budget (2)')
  expect(await names(page, 'menu-over')).toEqual(['Veggie Bowl', 'Salmon Poke Bowl'])
  const over = page.getByTestId('menu-over').getByTestId('menu-row')
  await expect(over.nth(0)).toContainText('$0.54 over')
  await expect(over.nth(1)).toContainText('$3.62 over')
})

test('the est. price opens the price breakdown', async ({ page }) => {
  await page.goto(`${MENU}?budget=20`)
  const tofu = page.getByTestId('menu-row').filter({ hasText: 'Tofu Rice Bowl' })
  await tofu.getByTestId('menu-est').click()
  await expect(page.getByTestId('breakdown-row-small')).toContainText('$2.50')
  await expect(page.getByTestId('breakdown-total')).toContainText('Est. all-in$19.48')
})

test('the sort from the list carries over', async ({ page }) => {
  await page.goto(`${MENU}?budget=20&sort=price`)
  await waitForResults(page, 'menu-results')
  await expect(page.getByTestId('menu-fits-title')).toBeVisible()
  expect(await names(page, 'menu-fits')).toEqual(['Spam Musubi Plate', 'Chicken Rice Bowl', 'Tofu Rice Bowl'])
})

test('without a budget the menu is one plain list', async ({ page }) => {
  await page.goto(MENU)
  await expect(page.getByTestId('menu-row')).toHaveCount(5)
  await expect(page.getByTestId('menu-budget-bar')).toHaveCount(0)
})

test('Change sets a new budget and saves it as the default', async ({ page }) => {
  await page.goto(`${MENU}?budget=20`)
  await page.getByRole('button', { name: 'Change' }).click()
  await page.getByTestId('budget-slider').fill('25')
  await expect(page.getByTestId('sheet-apply')).toHaveText('Apply')
  await page.getByTestId('sheet-apply').click()

  await expect(page).toHaveURL(new RegExp(`${MENU}\\?budget=25$`))
  await waitForResults(page, 'menu-results')
  await expect(page.getByTestId('menu-fits-title')).toHaveText('Under your budget (5)')
  await expect(page.getByTestId('menu-fits').getByTestId('menu-row')).toHaveCount(5)
  await expect(page.getByTestId('menu-over')).toHaveCount(0)

  await page.goto('/')
  await page.getByTestId('quick-meal-entry').click()
  await expect(page.getByTestId('chip-budget')).toHaveText('Up to $25 ▾')
})

test('a pickup card opens the menu at pickup prices with no time', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&distance=1')
  const card = page.getByTestId('meal-card').filter({ hasText: 'Paseo Rice Bowl' })
  await card.getByTestId('meal-more').click()
  await expect(page).toHaveURL(new RegExp(`${MENU}\\?budget=20&distance=1$`))
  await waitForResults(page, 'menu-results')
  await expect(page.locator('.menu-meta')).toHaveText('4.6 ★ (800+) · 0.4 mi')
  const first = page.getByTestId('menu-fits').getByTestId('menu-row').first()
  await expect(first).toContainText('Chicken Rice Bowl')
  await expect(first.getByTestId('menu-est')).toHaveText('Est. $16.74')
  await first.getByTestId('menu-est').click()
  await expect(page.getByTestId('breakdown-row-delivery')).toHaveCount(0)
  await expect(page.getByTestId('breakdown-total')).toContainText('$16.74')
})
