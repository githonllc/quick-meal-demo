import { describe, expect, it } from 'vitest'
import {
  formatCents,
  formatCount,
  formatDollars,
  formatEtaRange,
  formatMiles,
  formatPercentBps,
  pluralize,
} from '../shared/format'

describe('format', () => {
  it('formatCents', () => {
    expect(formatCents(1873)).toBe('$18.73')
    expect(formatCents(5)).toBe('$0.05')
  })
  it('formatDollars', () => {
    expect(formatDollars(17)).toBe('$17')
  })
  it('formatMiles', () => {
    expect(formatMiles(0.5)).toBe('0.5 mi')
    expect(formatMiles(1)).toBe('1 mi')
  })
  it('formatEtaRange', () => {
    expect(formatEtaRange(14)).toBe('9–14 min')
    expect(formatEtaRange(3)).toBe('1–3 min')
  })
  it('formatPercentBps', () => {
    expect(formatPercentBps(950)).toBe('9.5%')
    expect(formatPercentBps(1500)).toBe('15%')
  })
  it('pluralize', () => {
    expect(pluralize(1, 'result', 'results')).toBe('1 result')
    expect(pluralize(2, 'result', 'results')).toBe('2 results')
  })
  it('formatCount', () => {
    expect(formatCount(812)).toBe('800+')
    expect(formatCount(1240)).toBe('1k+')
    expect(formatCount(95)).toBe('95')
  })
})
