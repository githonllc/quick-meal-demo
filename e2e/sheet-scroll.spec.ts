import { expect, test } from '@playwright/test'

// An open sheet must not scroll the page underneath it.
test('open sheet locks page scroll and close restores it', async ({ page }) => {
  await page.goto('/quick-meal')
  await expect(page.getByTestId('meal-card').first()).toBeVisible()
  await page.evaluate('window.scrollTo(0, 300)')
  await expect.poll(() => page.evaluate<number>('window.scrollY')).toBe(300)

  // dispatchEvent: a real click would scroll the off-screen chip back into view.
  await page.getByTestId('chip-filters').dispatchEvent('click')
  const sheet = page.getByTestId('sheet-filters')
  await expect(sheet).toBeVisible()
  expect(await page.evaluate('document.documentElement.style.overflow')).toBe('hidden')

  const box = (await sheet.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 2000)
  await page.waitForTimeout(200)
  expect(await page.evaluate<number>('window.scrollY')).toBe(300)

  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()
  const styles = await page.evaluate('[document.documentElement.style.overflow, document.body.style.overflow]')
  expect(styles).toEqual(['', ''])
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate<number>('window.scrollY')).toBeGreaterThan(300)
})
