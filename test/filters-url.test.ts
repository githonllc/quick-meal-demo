import { describe, expect, it } from 'vitest'
import { activeCount, parseUrl, toQuery } from '../src/state/filters'
import type { UiFilters } from '../src/state/filters'

const NONE: UiFilters = { budget: null, time: null, distance: null, cuisine: null, sort: 'best' }

describe('filters in the URL', () => {
  it('budget=40 means any budget', () => {
    expect(parseUrl('?budget=40').budget).toBeNull()
  })

  it('reads budget and time', () => {
    expect(parseUrl('?budget=20&time=30')).toEqual({ ...NONE, budget: 20, time: 30 })
  })

  it('reads every field', () => {
    expect(parseUrl('budget=15&time=15&distance=0.5&cuisine=fast-food&sort=price')).toEqual({
      budget: 15,
      time: 15,
      distance: 0.5,
      cuisine: 'fast-food',
      sort: 'price',
    })
  })

  it('ignores invalid values and never throws', () => {
    expect(parseUrl('?budget=9&time=25&distance=4&cuisine=thai&sort=cheap')).toEqual(NONE)
    expect(parseUrl('?budget=20.5').budget).toBeNull()
    expect(parseUrl('?budget=abc&time=&cuisine=').budget).toBeNull()
    expect(parseUrl('?budget=41').budget).toBeNull()
    expect(parseUrl('?budget=10').budget).toBe(10)
    expect(parseUrl('?budget=39').budget).toBe(39)
    expect(parseUrl('')).toEqual(NONE)
    expect(parseUrl('?%%%')).toEqual(NONE)
  })

  it('toQuery leaves out empty fields and sort=best', () => {
    expect(toQuery(NONE)).toBe('')
    expect(toQuery({ ...NONE, budget: 20 })).toBe('budget=20')
    expect(toQuery({ ...NONE, sort: 'nearest' })).toBe('sort=nearest')
  })

  it('toQuery keeps the key order budget, time, distance, cuisine, sort', () => {
    const f: UiFilters = { budget: 20, time: 20, distance: 1, cuisine: 'chinese', sort: 'fastest' }
    expect(toQuery(f)).toBe('budget=20&time=20&distance=1&cuisine=chinese&sort=fastest')
  })

  it('round trips', () => {
    const f: UiFilters = { budget: 17, time: 45, distance: 0.5, cuisine: 'sushi', sort: 'price' }
    expect(parseUrl(toQuery(f))).toEqual(f)
    expect(parseUrl(toQuery(NONE))).toEqual(NONE)
  })

  it('counts only budget, time and distance as active', () => {
    expect(activeCount(NONE)).toBe(0)
    expect(activeCount({ ...NONE, cuisine: 'chinese', sort: 'price' })).toBe(0)
    expect(activeCount({ ...NONE, budget: 20, time: 30 })).toBe(2)
  })
})
