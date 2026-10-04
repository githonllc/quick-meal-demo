import { LAYOUTS } from './config'
import type { Layout } from './config'
import { browserStorage } from './savedDefault'
import type { Store } from './savedDefault'

// The study timer of the demo settings. A trial runs from opening Quick Meal to the first
// "Add to cart" tap. The trial lives in session storage (one per tab), the results in local storage.
const TRIAL_KEY = 'quickMeal.trial.v1'
const RESULTS_KEY = 'quickMeal.study.v1'
const MAX_RESULTS = 200

export type StudyPath = 'list' | 'near' | 'menu'

export interface Trial {
  id: string
  startedAt: number
  layout: Layout
  // The filters on screen when the trial started, as a query string.
  startFilters: string
  // When the user first opened a menu or a price breakdown, or null.
  firstOpenAt: number | null
}

// What the user tapped "Add to cart" on, fixed when the sheet opened.
export interface Tapped {
  path: StudyPath
  restaurant: string
  item: string
  totalCents: number
}

export interface StudyResult extends Tapped {
  id: string
  at: string
  layout: Layout
  ms: number
  firstOpenMs: number | null
  startFilters: string
}

// Read through globalThis, like browserStorage, so this file also type-checks for the Node unit tests.
export function sessionStore(): Store | null {
  try {
    return (globalThis as { sessionStorage?: Store }).sessionStorage ?? null
  } catch {
    return null
  }
}

function read<T>(store: Store | null, key: string): T | null {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

// True when the value was saved.
function write(store: Store | null, key: string, value: unknown): boolean {
  try {
    if (!store) return false
    store.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // No storage: the study timer does nothing.
    return false
  }
}

function remove(store: Store | null, key: string): void {
  try {
    store?.removeItem?.(key)
  } catch {
    // No storage: nothing to remove.
  }
}

export function activeTrial(session = sessionStore()): Trial | null {
  return read<Trial>(session, TRIAL_KEY)
}

// Starts a trial unless one is running, so going back from a menu keeps the same trial.
// A running trial of the other layout is replaced: its result would name the wrong layout.
export function startTrial(layout: Layout, startFilters: string, now = Date.now(), session = sessionStore()): void {
  if (activeTrial(session)?.layout === layout) return
  const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  write(session, TRIAL_KEY, { id, startedAt: now, layout, startFilters, firstOpenAt: null } satisfies Trial)
}

export function cancelTrial(session = sessionStore()): void {
  remove(session, TRIAL_KEY)
}

// The first menu or price breakdown the user opens in this trial.
export function markFirstOpen(now = Date.now(), session = sessionStore()): void {
  const trial = activeTrial(session)
  if (trial && trial.firstOpenAt === null) write(session, TRIAL_KEY, { ...trial, firstOpenAt: now })
}

// The first "Add to cart" ends the trial and records one result. Later taps find no trial
// and record nothing until the next trial starts. When the result cannot be saved it returns null.
export function endTrial(
  tapped: Tapped,
  now = Date.now(),
  session = sessionStore(),
  local = browserStorage(),
): StudyResult | null {
  const trial = activeTrial(session)
  if (!trial) return null
  cancelTrial(session)
  const result: StudyResult = {
    id: trial.id,
    at: new Date(now).toISOString(),
    layout: trial.layout,
    ms: now - trial.startedAt,
    firstOpenMs: trial.firstOpenAt === null ? null : trial.firstOpenAt - trial.startedAt,
    ...tapped,
    startFilters: trial.startFilters,
  }
  // Keep the newest results only.
  return write(local, RESULTS_KEY, [...loadResults(local), result].slice(-MAX_RESULTS)) ? result : null
}

const PATHS: readonly StudyPath[] = ['list', 'near', 'menu']
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// A stored row with every field of the right type.
function isResult(v: unknown): v is StudyResult {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.at === 'string' &&
    LAYOUTS.some((l) => l === r.layout) &&
    isNumber(r.ms) &&
    (r.firstOpenMs === null || isNumber(r.firstOpenMs)) &&
    PATHS.some((p) => p === r.path) &&
    typeof r.restaurant === 'string' &&
    typeof r.item === 'string' &&
    isNumber(r.totalCents) &&
    typeof r.startFilters === 'string'
  )
}

// Bad rows and repeated ids are dropped, so the list and the CSV only show good results.
export function loadResults(local = browserStorage()): StudyResult[] {
  const rows = read<unknown>(local, RESULTS_KEY)
  if (!Array.isArray(rows)) return []
  const ids = new Set<string>()
  return rows.filter((r): r is StudyResult => {
    if (!isResult(r) || ids.has(r.id)) return false
    ids.add(r.id)
    return true
  })
}

export function clearResults(local = browserStorage()): void {
  remove(local, RESULTS_KEY)
}

// "23.4 s"
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

const COLUMNS = [
  'id',
  'at',
  'layout',
  'ms',
  'firstOpenMs',
  'path',
  'restaurant',
  'item',
  'totalCents',
  'startFilters',
] as const satisfies readonly (keyof StudyResult)[]

// A value with a comma, quote or line break goes in quotes, and its quotes are doubled.
function cell(v: string | number | null): string {
  const s = v === null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: readonly StudyResult[]): string {
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n')
}
