import { expect, test } from '@playwright/test'

test('quick meal is the first category and opens Quick Meal', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.cat').first()
  await expect(first).toHaveAttribute('data-testid', 'quick-meal-entry')
  await first.click()
  await expect(page).toHaveURL(/\/quick-meal$/)
  await expect(page.getByRole('heading', { name: 'Quick Meal' })).toBeVisible()
})

test('cuisine chips and Near campus cards show a toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chinese' }).click()
  await expect(page.getByTestId('toast')).toContainText('Not part of this demo.')
  await expect(page).toHaveURL(/\/$/)
  await page.locator('.near-card').first().click()
  await expect(page.getByTestId('toast')).toContainText('Not part of this demo.')
  await expect(page).toHaveURL(/\/$/)
})

test('search pill shows a toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Search DoorDash' }).click()
  await expect(page.getByTestId('toast')).toBeVisible()
})
