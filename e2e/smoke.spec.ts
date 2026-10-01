import { expect, test } from '@playwright/test'

test('home page and health route', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Quick Meal' })).toBeVisible()
  const res = await request.get('/api/health')
  expect(await res.json()).toEqual({ ok: true })
})
