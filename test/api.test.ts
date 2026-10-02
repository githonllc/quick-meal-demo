import { describe, expect, it } from 'vitest'
import { handleApi } from '../worker/api'

async function get(path: string, init?: RequestInit) {
  const res = await handleApi(new Request(`http://x${path}`, init), { delayMs: 0 })
  return { res, body: (await res.json()) as any }
}

describe('handleApi', () => {
  it('health', async () => {
    const { res, body } = await get('/api/health')
    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
  })

  it('home', async () => {
    const { res, body } = await get('/api/home')
    expect(res.status).toBe(200)
    expect(body.cuisines).toHaveLength(8)
    expect(body.nearCampus).toHaveLength(4)
  })

  it('search budget=20 time=30', async () => {
    const { res, body } = await get('/api/quick-meal/search?budget=20&time=30')
    expect(res.status).toBe(200)
    expect(body.total).toBe(6)
  })

  it('search budget=40 means any budget', async () => {
    const { res, body } = await get('/api/quick-meal/search?budget=40')
    expect(res.status).toBe(200)
    expect(body.filters.budgetCents).toBeNull()
    expect(body.total).toBe(28)
  })

  it('search with no exact result returns near and relax', async () => {
    const { res, body } = await get('/api/quick-meal/search?budget=15&time=15')
    expect(res.status).toBe(200)
    expect(body.filters.sort).toBe('fastest')
    expect(body.exact).toHaveLength(0)
    expect(body.near).toHaveLength(5)
    expect(body.relax.map((r: { label: string }) => r.label)).toEqual([
      'Budget up to $17 · 1 result',
      'Time up to 20 min · 2 results',
    ])
  })

  it('search with time and distance keeps the time and drops the distance', async () => {
    const { res, body } = await get('/api/quick-meal/search?budget=15&time=15&distance=0.5')
    expect(res.status).toBe(200)
    expect(body.filters.timeMin).toBe(15)
    expect(body.filters.distanceMi).toBeNull()
    expect(body.total).toBe(0)
  })

  it('search with distance is pickup: no delivery fee, Nearest by default', async () => {
    const { res, body } = await get('/api/quick-meal/search?budget=20&distance=1')
    expect(res.status).toBe(200)
    expect(body.total).toBe(7)
    expect(body.filters.sort).toBe('nearest')
    const paseo = body.exact.find((c: { restaurant: { id: string } }) => c.restaurant.id === 'paseo-rice-bowl')
    expect(paseo.price.deliveryFeeCents).toBe(0)
    expect(paseo.price.totalCents).toBe(1674)
    // Pickup has no Fastest.
    const fastest = await get('/api/quick-meal/search?distance=1&sort=fastest')
    expect(fastest.body.filters.sort).toBe('nearest')
  })

  it.each([
    ['budget=9', 'Invalid budget'],
    ['budget=abc', 'Invalid budget'],
    ['time=25', 'Invalid time'],
    ['distance=0.7', 'Invalid distance'],
    ['cuisine=thai', 'Invalid cuisine'],
    ['sort=rating', 'Invalid sort'],
  ])('search?%s is 400', async (query, error) => {
    const { res, body } = await get(`/api/quick-meal/search?${query}`)
    expect(res.status).toBe(400)
    expect(body).toEqual({ error })
  })

  it('menu view with budget', async () => {
    const { res, body } = await get('/api/quick-meal/restaurants/paseo-rice-bowl?budget=20')
    expect(res.status).toBe(200)
    expect(body.fits).toHaveLength(3)
    expect(body.over).toHaveLength(2)
  })

  it('menu view with distance uses pickup prices', async () => {
    const { res, body } = await get('/api/quick-meal/restaurants/paseo-rice-bowl?budget=20&distance=1')
    expect(res.status).toBe(200)
    expect(body.pickup).toBe(true)
    expect(body.fits[0].item.id).toBe('chicken-bowl')
    expect(body.fits[0].price.totalCents).toBe(1674)
    expect(body.fits).toHaveLength(4)
    expect(body.over).toHaveLength(1)
  })

  it('menu view with time and distance keeps delivery prices, like search', async () => {
    const { res, body } = await get('/api/quick-meal/restaurants/paseo-rice-bowl?budget=20&time=20&distance=1')
    expect(res.status).toBe(200)
    expect(body.pickup).toBe(false)
    expect(body.fits[0].price.totalCents).toBe(1873)
  })

  it("search?sort=best opens with the side's default sort", async () => {
    const delivery = await get('/api/quick-meal/search?sort=best')
    expect(delivery.res.status).toBe(200)
    expect(delivery.body.filters.sort).toBe('fastest')
    const pickup = await get('/api/quick-meal/search?distance=1&sort=best')
    expect(pickup.res.status).toBe(200)
    expect(pickup.body.filters.sort).toBe('nearest')
  })

  it('menu view of unknown restaurant is 404', async () => {
    const { res, body } = await get('/api/quick-meal/restaurants/nope')
    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Restaurant not found' })
  })

  it('menu view with bad budget is 400', async () => {
    const { res, body } = await get('/api/quick-meal/restaurants/paseo-rice-bowl?budget=99')
    expect(res.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid budget' })
  })

  it.each(['/api/quick-meal/search?fail=1', '/api/nope?fail=1'])('%s fails on demand', async (p) => {
    const { res, body } = await get(p)
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Simulated failure' })
  })

  it('unknown path is 404', async () => {
    const { res, body } = await get('/api/nope')
    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Not found' })
  })

  it('POST is 405', async () => {
    const { res, body } = await get('/api/home', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(body).toEqual({ error: 'Method not allowed' })
  })
})
