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
      'Time up to 16 min · 1 result',
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
    ['time=14', 'Invalid time'],
    ['time=46', 'Invalid time'],
    ['time=20.5', 'Invalid time'],
    ['distance=0.7', 'Invalid distance'],
    ['cuisine=thai', 'Invalid cuisine'],
    ['sort=rating', 'Invalid sort'],
  ])('search?%s is 400', async (query, error) => {
    const { res, body } = await get(`/api/quick-meal/search?${query}`)
    expect(res.status).toBe(400)
    expect(body).toEqual({ error })
  })

  it('search takes the time and distance stops of trange and drange', async () => {
    const time = await get('/api/quick-meal/search?trange=10,60,5&time=50')
    expect(time.res.status).toBe(200)
    expect(time.body.filters.timeMin).toBe(50)
    const distance = await get('/api/quick-meal/search?drange=1,10,1&distance=7')
    expect(distance.res.status).toBe(200)
    expect(distance.body.filters.distanceMi).toBe(7)
    // The relax option moves by the range's steps: 20 min, not 16.
    const relax = await get('/api/quick-meal/search?budget=15&time=15&trange=10,60,5')
    expect(relax.body.relax.map((r: { label: string }) => r.label)).toEqual([
      'Budget up to $17 · 1 result',
      'Time up to 20 min · 2 results',
    ])
  })

  it.each([
    ['trange=10,60,5&time=22', 'Invalid time'],
    ['trange=10,60,5&time=12', 'Invalid time'],
    ['drange=1,10,1&distance=1.5', 'Invalid distance'],
    ['trange=10,60,7', 'Invalid range'],
    ['trange=60,10,5', 'Invalid range'],
    ['trange=0,60,5', 'Invalid range'],
    ['trange=10,95,5', 'Invalid range'],
    ['trange=10,60', 'Invalid range'],
    ['trange=10,60,5,5', 'Invalid range'],
    ['trange=a,b,c', 'Invalid range'],
    ['trange=', 'Invalid range'],
    ['drange=0.5,10,0.25', 'Invalid range'],
    ['drange=0.5,10,1', 'Invalid range'],
    ['drange=0.25,5,0.5', 'Invalid range'],
  ])('search?%s is 400', async (query, error) => {
    const { res, body } = await get(`/api/quick-meal/search?${query}`)
    expect(res.status).toBe(400)
    expect(body).toEqual({ error })
  })

  it('the menu reads trange and drange too', async () => {
    const pickup = await get('/api/quick-meal/restaurants/paseo-rice-bowl?budget=20&distance=7&drange=1,10,1')
    expect(pickup.res.status).toBe(200)
    expect(pickup.body.pickup).toBe(true)
    const time = await get('/api/quick-meal/restaurants/paseo-rice-bowl?time=50&trange=10,60,5')
    expect(time.res.status).toBe(200)
    expect(time.body.pickup).toBe(false)
    // Without its range, 7 mi is not a stop.
    const noRange = await get('/api/quick-meal/restaurants/paseo-rice-bowl?distance=7')
    expect(noRange.res.status).toBe(400)
    expect(noRange.body).toEqual({ error: 'Invalid distance' })
    for (const bad of ['trange=10,60,7', 'drange=x']) {
      const { res, body } = await get(`/api/quick-meal/restaurants/paseo-rice-bowl?${bad}`)
      expect(res.status).toBe(400)
      expect(body).toEqual({ error: 'Invalid range' })
    }
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

  it("a sort the side does not have gets the side's default sort", async () => {
    const delivery = await get('/api/quick-meal/search?time=30&sort=nearest')
    expect(delivery.res.status).toBe(200)
    expect(delivery.body.filters.sort).toBe('fastest')
    const noSide = await get('/api/quick-meal/search?sort=nearest')
    expect(noSide.res.status).toBe(200)
    expect(noSide.body.filters.sort).toBe('fastest')
  })

  it("search?sort=best opens with the side's default sort", async () => {
    const delivery = await get('/api/quick-meal/search?sort=best')
    expect(delivery.res.status).toBe(200)
    expect(delivery.body.filters.sort).toBe('fastest')
    const pickup = await get('/api/quick-meal/search?distance=1&sort=best')
    expect(pickup.res.status).toBe(200)
    expect(pickup.body.filters.sort).toBe('nearest')
  })

  it('search takes both Most liked and Top rated, on both sides', async () => {
    for (const sort of ['liked', 'rated']) {
      const delivery = await get(`/api/quick-meal/search?sort=${sort}`)
      expect(delivery.res.status).toBe(200)
      expect(delivery.body.filters.sort).toBe(sort)
      const pickup = await get(`/api/quick-meal/search?distance=1&sort=${sort}`)
      expect(pickup.res.status).toBe(200)
      expect(pickup.body.filters.sort).toBe(sort)
      const menu = await get(`/api/quick-meal/restaurants/paseo-rice-bowl?sort=${sort}`)
      expect(menu.body.sort).toBe(sort)
    }
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
