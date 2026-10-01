import { expect, test } from '@playwright/test'

test('search returns the matching meals', async ({ request }) => {
  const res = await request.get('/api/quick-meal/search?budget=20&time=30')
  expect(res.status()).toBe(200)
  expect((await res.json()).total).toBe(6)
})

test('fail=1 simulates a server error', async ({ request }) => {
  const res = await request.get('/api/quick-meal/search?fail=1')
  expect(res.status()).toBe(500)
})
