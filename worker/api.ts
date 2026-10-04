import { BUDGET_MAX, BUDGET_MIN, CUISINES, DISTANCE_STEPS, SORTS, TIME_STEPS, sortFor } from '../shared/constants'
import { menuView } from '../shared/menu'
import { search } from '../shared/search'
import type { Filters } from '../shared/types'
import { homeData } from './data/home'
import { RESTAURANTS } from './data/restaurants'

type ParseResult<T> = T | { error: string }

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

function hasError<T extends object>(x: ParseResult<T>): x is { error: string } {
  return 'error' in x
}

// Budget in dollars. A missing value and the slider's top value both mean "any budget".
function parseBudget(raw: string | null): number | null | { error: string } {
  if (raw === null) return null
  const n = Number(raw)
  if (!/^\d+$/.test(raw) || n < BUDGET_MIN || n > BUDGET_MAX) return { error: 'Invalid budget' }
  return n === BUDGET_MAX ? null : n * 100
}

// Reads one value that must be one of the allowed steps. Missing means "no filter".
function parseStep<T extends number>(raw: string | null, steps: readonly T[]): T | null | undefined {
  if (raw === null) return null
  return steps.find((s) => s === Number(raw)) // undefined when not allowed
}

export function parseFilters(params: URLSearchParams): Filters | { error: string } {
  const budgetCents = parseBudget(params.get('budget'))
  if (budgetCents !== null && typeof budgetCents === 'object') return budgetCents

  const timeMin = parseStep(params.get('time'), TIME_STEPS)
  if (timeMin === undefined) return { error: 'Invalid time' }

  const distanceRaw = parseStep(params.get('distance'), DISTANCE_STEPS)
  if (distanceRaw === undefined) return { error: 'Invalid distance' }
  // Delivery or pickup, never both. An old link with both keeps the time (design P7).
  const distanceMi = timeMin === null ? distanceRaw : null

  const cuisineRaw = params.get('cuisine') || null
  const cuisine = cuisineRaw === null ? null : (CUISINES.find((c) => c.id === cuisineRaw)?.id ?? undefined)
  if (cuisine === undefined) return { error: 'Invalid cuisine' }

  // A missing sort, a sort the side does not have, or the removed sort=best becomes the side's default.
  const sortRaw = params.get('sort')
  if (sortRaw !== null && sortRaw !== 'best' && !SORTS.some((s) => s.id === sortRaw)) {
    return { error: 'Invalid sort' }
  }
  const sort = sortFor(sortRaw, distanceMi !== null)

  return { budgetCents, timeMin, distanceMi, cuisine, sort }
}

const MENU_PATH = /^\/api\/quick-meal\/restaurants\/([a-z0-9-]+)$/

export async function handleApi(request: Request, opts: { delayMs: number }): Promise<Response> {
  if (opts.delayMs > 0) await new Promise((r) => setTimeout(r, opts.delayMs))

  const url = new URL(request.url)
  if (url.searchParams.get('fail') === '1') return json({ error: 'Simulated failure' }, 500)
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const path = url.pathname
  if (path === '/api/health') return json({ ok: true })
  if (path === '/api/home') return json(homeData())

  if (path === '/api/quick-meal/search') {
    const filters = parseFilters(url.searchParams)
    if (hasError(filters)) return json(filters, 400)
    return json(search(RESTAURANTS, filters))
  }

  const match = MENU_PATH.exec(path)
  if (match) {
    // The menu page only uses budget, distance (pickup prices) and sort. Other params are ignored.
    // Time is read too, so a link with both time and distance keeps delivery prices, as in search.
    const { searchParams } = url
    const only = new URLSearchParams()
    for (const key of ['budget', 'time', 'distance', 'sort']) {
      const value = searchParams.get(key)
      if (value !== null) only.set(key, value)
    }
    const filters = parseFilters(only)
    if (hasError(filters)) return json(filters, 400)
    const restaurant = RESTAURANTS.find((r) => r.id === match[1])
    if (!restaurant) return json({ error: 'Restaurant not found' }, 404)
    return json(menuView(restaurant, filters.budgetCents, filters.sort, filters.distanceMi !== null))
  }

  return json({ error: 'Not found' }, 404)
}
