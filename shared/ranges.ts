// The time and distance ranges the sliders offer. The client and the Worker use the same rules.
// This file imports nothing, so constants.ts can build its steps from it.

export interface Range {
  min: number
  max: number
  step: number
}
export type RangeKind = 'time' | 'distance'

export const DEFAULT_RANGES: Record<RangeKind, Range> = {
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

// min < max, both in the allowed span, an allowed step, and max reached from min in whole steps.
// The check uses whole numbers, never a float %.
export function isValidRange(kind: RangeKind, r: unknown): r is Range {
  if (typeof r !== 'object' || r === null) return false
  const { min, max, step } = r as Record<string, unknown>
  const { scale, low, high, steps } = RULES[kind]
  const lo = units(min, scale)
  const hi = units(max, scale)
  const st = units(step, scale)
  if (lo === null || hi === null || st === null) return false
  if (lo < low || hi > high || lo >= hi || !steps.includes(st)) return false
  return (hi - lo) % st === 0
}

// Every stop from min to max, rounded to 2 decimals so 0.5 steps stay exact.
export function stepsOf(r: Range): number[] {
  const count = Math.round((r.max - r.min) / r.step)
  return Array.from({ length: count + 1 }, (_, i) => Math.round((r.min + i * r.step) * 100) / 100)
}
