import { expect, test } from '@playwright/test'

test('home page and health route', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByText('What can we get you?')).toBeVisible()
  const res = await request.get('/api/health')
  expect(await res.json()).toEqual({ ok: true })
})
