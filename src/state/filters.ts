import { BUDGET_MAX, BUDGET_MIN, CUISINES, DISTANCE_STEPS, TIME_STEPS, sortFor } from '../../shared/constants'
import type { CuisineId, DistanceStep, SortId, TimeStep } from '../../shared/types'
import type { Layout } from './config'
import { browserStorage, loadDefault } from './savedDefault'
import { sortForLayout } from './sorts'

// What the Quick Meal page shows. Budget is in whole dollars, null means "any".
// At most one of time and distance is set: distance means Pickup, anything else Delivery (design P7).
export interface UiFilters {
  budget: number | null
  time: TimeStep | null
  distance: DistanceStep | null
  cuisine: CuisineId | null
  sort: SortId
}

// Same rules as the API parser, but a bad value is dropped instead of being an error.
function parseBudget(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  if (n < BUDGET_MIN || n >= BUDGET_MAX) return null // BUDGET_MAX is the slider's "any"
  return n
}

function parseStep<T extends number>(raw: string | null, steps: readonly T[]): T | null {
  if (raw === null) return null
  return steps.find((s) => s === Number(raw)) ?? null
}

// An old link with both time and distance keeps the time and drops the distance.
// The sort is one the layout shows: Most liked and Top rated swap with the layout.
export function parseUrl(search: string, layout: Layout = 'meals'): UiFilters {
  const q = new URLSearchParams(search)
  const time = parseStep(q.get('time'), TIME_STEPS)
  const distance = time === null ? parseStep(q.get('distance'), DISTANCE_STEPS) : null
  return {
    budget: parseBudget(q.get('budget')),
    time,
    distance,
    cuisine: CUISINES.find((c) => c.id === q.get('cuisine'))?.id ?? null,
    sort: sortForLayout(q.get('sort'), distance !== null, layout),
  }
}

// Switches to the other side: clears the other side's value and swaps the two defaults.
// Fastest becomes Nearest in Pickup, and Nearest becomes Fastest in Delivery. Other sorts stay.
export function toSide(f: UiFilters, pickup: boolean, layout: Layout = 'meals'): UiFilters {
  return { ...f, ...(pickup ? { time: null } : { distance: null }), sort: sortForLayout(f.sort, pickup, layout) }
}

// Leaves out empty filters and the side's default sort, so URLs stay short.
// The default is Fastest or Nearest in both layouts.
export function toQuery(f: UiFilters): string {
  const q = new URLSearchParams()
  if (f.budget !== null) q.set('budget', String(f.budget))
  if (f.time !== null) q.set('time', String(f.time))
  if (f.distance !== null) q.set('distance', String(f.distance))
  if (f.cuisine !== null) q.set('cuisine', f.cuisine)
  if (f.sort !== sortFor(null, f.distance !== null)) q.set('sort', f.sort)
  return q.toString()
}

// The filters to start from when the page opens. Any of the four filter keys in the URL
// (even budget=40, "any") means the URL wins; otherwise the saved default fills them.
// Cuisine always comes from the URL (design P8).
export function initialFilters(search: string, store = browserStorage(), layout: Layout = 'meals'): UiFilters {
  const url = parseUrl(search, layout)
  const q = new URLSearchParams(search)
  if (['budget', 'time', 'distance', 'sort'].some((k) => q.has(k))) return url
  return { ...url, ...loadDefault(store, layout), cuisine: url.cuisine }
}

// The Filters badge counts budget, and time or distance as one. Tab and sort do not count.
export function activeCount(f: UiFilters): number {
  return [f.budget, f.time ?? f.distance].filter((v) => v !== null).length
}

export function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path
}
