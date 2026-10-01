import { BUDGET_MAX, BUDGET_MIN, CUISINES, DISTANCE_STEPS, SORTS, TIME_STEPS } from '../../shared/constants'
import type { CuisineId, DistanceStep, SortId, TimeStep } from '../../shared/types'

// What the Quick Meal page shows. Budget is in whole dollars, null means "any".
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

export function parseUrl(search: string): UiFilters {
  const q = new URLSearchParams(search)
  return {
    budget: parseBudget(q.get('budget')),
    time: parseStep(q.get('time'), TIME_STEPS),
    distance: parseStep(q.get('distance'), DISTANCE_STEPS),
    cuisine: CUISINES.find((c) => c.id === q.get('cuisine'))?.id ?? null,
    sort: SORTS.find((s) => s.id === q.get('sort'))?.id ?? 'best',
  }
}

// Leaves out empty filters and the default sort, so URLs stay short.
export function toQuery(f: UiFilters): string {
  const q = new URLSearchParams()
  if (f.budget !== null) q.set('budget', String(f.budget))
  if (f.time !== null) q.set('time', String(f.time))
  if (f.distance !== null) q.set('distance', String(f.distance))
  if (f.cuisine !== null) q.set('cuisine', f.cuisine)
  if (f.sort !== 'best') q.set('sort', f.sort)
  return q.toString()
}

// The filters to start from when the page opens. #9 adds the saved default here.
export function initialFilters(search: string): UiFilters {
  return parseUrl(search)
}

// The Filters badge counts budget, time and distance. Tab and sort do not count.
export function activeCount(f: UiFilters): number {
  return [f.budget, f.time, f.distance].filter((v) => v !== null).length
}

export function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path
}
