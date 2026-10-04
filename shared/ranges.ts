// The time and distance ranges the sliders offer. The client and the Worker use the same rules.
// This file imports nothing.

export interface Range {
  min: number
  max: number
  step: number
}
export type RangeKind = 'time' | 'distance'
export type Ranges = Record<RangeKind, Range>

export const DEFAULT_RANGES: Ranges = {
  time: { min: 15, max: 45, step: 1 }, // minutes
  distance: { min: 0.5, max: 5, step: 0.5 }, // miles
}

// Allowed values, in whole units: minutes for time, tenths of a mile for distance.
// Miles stop at tenths because formatMiles and the search round to 0.1.
const RULES: Record<RangeKind, { scale: number; low: number; high: number; steps: number[] }> = {
  time: { scale: 1, low: 5, high: 90, steps: [1, 5, 10, 15] },
  distance: { scale: 10, low: 5, high: 100, steps: [5, 10] },
}

// A value in whole units, or null when it is not on the grid (for example 0.75 mi).
function units(x: unknown, scale: number): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null
  const n = Math.round(x * scale)
  return n / scale === x ? n : null
}

// min < max, both in the allowed span, an allowed step, and both on the step's grid
// (so every stop is a value the settings page can show). The check uses whole numbers, never a float %.
export function isValidRange(kind: RangeKind, r: unknown): r is Range {
  if (typeof r !== 'object' || r === null) return false
  const { min, max, step } = r as Record<string, unknown>
  const { scale, low, high, steps } = RULES[kind]
  const lo = units(min, scale)
  const hi = units(max, scale)
  const st = units(step, scale)
  if (lo === null || hi === null || st === null) return false
  if (lo < low || hi > high || lo >= hi || !steps.includes(st)) return false
  return lo % st === 0 && hi % st === 0
}

// Every stop from min to max, rounded to 2 decimals so 0.5 steps stay exact.
export function stepsOf(r: Range): number[] {
  const count = Math.round((r.max - r.min) / r.step)
  return Array.from({ length: count + 1 }, (_, i) => Math.round((r.min + i * r.step) * 100) / 100)
}

// The query value for a range: "min,max,step", e.g. trange=10,60,5.
export function rangeParam(r: Range): string {
  return `${r.min},${r.max},${r.step}`
}

// A missing value is the default range. A bad one is undefined.
export function parseRangeParam(kind: RangeKind, raw: string | null): Range | undefined {
  if (raw === null) return DEFAULT_RANGES[kind]
  const parts = raw.split(',')
  if (parts.length !== 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return undefined
  const [min, max, step] = parts.map(Number)
  const r = { min, max, step }
  return isValidRange(kind, r) ? r : undefined
}
