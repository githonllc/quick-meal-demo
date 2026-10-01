import { expect, test } from '@playwright/test'

test('the app can be installed to the Home Screen', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Quick Meal Demo')
  await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', '/manifest.webmanifest')
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  )

  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.short_name).toBe('Quick Meal')
  expect(manifest.start_url).toBe('/')
  expect(manifest.icons).toHaveLength(3)
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)

  for (const path of ['/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon.svg']) {
    const r = await request.get(path)
    expect(r.ok(), path).toBe(true)
    expect(r.headers()['content-type'], path).toMatch(/^image\//)
  }
})
