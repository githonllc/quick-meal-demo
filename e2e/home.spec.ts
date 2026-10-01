import { expect, test } from '@playwright/test'

test('quick meal is the first category and opens Quick Meal', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.cat').first()
  await expect(first).toHaveAttribute('data-testid', 'quick-meal-entry')
  await first.click()
  await expect(page).toHaveURL(/\/quick-meal$/)
  await expect(page.getByRole('heading', { name: 'Quick Meal' })).toBeVisible()
})

test('a cuisine chip opens Quick Meal with that cuisine', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chinese' }).click()
  await expect(page).toHaveURL(/\/quick-meal\?cuisine=chinese$/)
})

test('search pill shows a toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Search DoorDash' }).click()
  await expect(page.getByTestId('toast')).toBeVisible()
})
