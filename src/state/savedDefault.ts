import { BUDGET_MAX, BUDGET_MIN, DISTANCE_STEPS, SORTS, TIME_STEPS } from '../../shared/constants'
import type { UiFilters } from './filters'

// The saved default lives in local storage (design D5). Cuisine is never saved (P8).
const KEY = 'quickMeal.filters.v1'
const TOAST_KEY = 'quickMeal.savedToastShown'

// The part of localStorage we use. Tests pass a fake one.
export interface Store {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

// Some private modes throw when the page touches localStorage.
// Read through globalThis so this file also type-checks for the Node unit tests.
export function browserStorage(): Store | null {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null
  } catch {
    return null
  }
}

// Steps are in ascending order, so a tie keeps the smaller step.
function nearest<T extends number>(raw: unknown, steps: readonly T[]): T | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return steps.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best))
}

function budget(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw >= BUDGET_MAX) return null
  return Math.max(raw, BUDGET_MIN)
}

// A saved value outside the current range moves to the nearest valid one (P8).
export function loadDefault(store = browserStorage()): Partial<UiFilters> | null {
  try {
    const raw = store?.getItem(KEY)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
    const saved = v as Record<string, unknown>
    return {
      budget: budget(saved.budget),
      time: nearest(saved.time, TIME_STEPS),
      distance: nearest(saved.distance, DISTANCE_STEPS),
      sort: SORTS.find((s) => s.id === saved.sort)?.id ?? 'best',
    }
  } catch {
    return null
  }
}

export function saveDefault(f: UiFilters, store = browserStorage()): void {
  try {
    const { budget, time, distance, sort } = f
    store?.setItem(KEY, JSON.stringify({ budget, time, distance, sort }))
  } catch {
    // No storage: the filters still apply, they are just not remembered.
  }
}

// True only the first time filters are saved, so the "Saved" toast shows once.
export function firstSave(store = browserStorage()): boolean {
  try {
    if (!store || store.getItem(TOAST_KEY)) return false
    store.setItem(TOAST_KEY, '1')
    return true
  } catch {
    return false
  }
}
