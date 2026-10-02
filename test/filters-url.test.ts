import { describe, expect, it } from 'vitest'
import { activeCount, parseUrl, toQuery, toSide } from '../src/state/filters'
import type { UiFilters } from '../src/state/filters'

const NONE: UiFilters = { budget: null, time: null, distance: null, cuisine: null, sort: 'fastest' }

describe('filters in the URL', () => {
  it('budget=40 means any budget', () => {
    expect(parseUrl('?budget=40').budget).toBeNull()
  })

  it('reads budget and time', () => {
    expect(parseUrl('?budget=20&time=30')).toEqual({ ...NONE, budget: 20, time: 30 })
  })

  it('reads every field', () => {
    expect(parseUrl('budget=15&time=15&cuisine=fast-food&sort=price')).toEqual({
      budget: 15,
      time: 15,
      distance: null,
      cuisine: 'fast-food',
      sort: 'price',
    })
    expect(parseUrl('budget=15&distance=0.5&sort=liked')).toEqual({ ...NONE, budget: 15, distance: 0.5, sort: 'liked' })
  })

  it('keeps the time and drops the distance when a link has both', () => {
    expect(parseUrl('?time=20&distance=1')).toEqual({ ...NONE, time: 20 })
  })

  it('defaults the sort by side: Fastest for delivery, Nearest for pickup', () => {
    expect(parseUrl('?distance=1').sort).toBe('nearest')
    expect(parseUrl('?distance=1&sort=fastest').sort).toBe('nearest')
    expect(parseUrl('?time=30&sort=nearest').sort).toBe('nearest')
    // An old sort=best link opens with the side's default.
    expect(parseUrl('?sort=best').sort).toBe('fastest')
    expect(parseUrl('?distance=1&sort=best').sort).toBe('nearest')
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

  it("toQuery leaves out empty fields and the side's default sort", () => {
    expect(toQuery(NONE)).toBe('')
    expect(toQuery({ ...NONE, budget: 20 })).toBe('budget=20')
    expect(toQuery({ ...NONE, sort: 'nearest' })).toBe('sort=nearest')
    expect(toQuery({ ...NONE, distance: 1, sort: 'nearest' })).toBe('distance=1')
    expect(toQuery({ ...NONE, distance: 1, sort: 'price' })).toBe('distance=1&sort=price')
  })

  it('toQuery keeps the key order budget, time, distance, cuisine, sort', () => {
    const f: UiFilters = { budget: 20, time: 20, distance: null, cuisine: 'chinese', sort: 'price' }
    expect(toQuery(f)).toBe('budget=20&time=20&cuisine=chinese&sort=price')
    expect(toQuery({ ...f, time: null, distance: 1 })).toBe('budget=20&distance=1&cuisine=chinese&sort=price')
  })

  it('round trips', () => {
    const f: UiFilters = { budget: 17, time: 45, distance: null, cuisine: 'sushi', sort: 'price' }
    expect(parseUrl(toQuery(f))).toEqual(f)
    const pickup: UiFilters = { budget: 17, time: null, distance: 0.5, cuisine: null, sort: 'nearest' }
    expect(parseUrl(toQuery(pickup))).toEqual(pickup)
    expect(parseUrl(toQuery(NONE))).toEqual(NONE)
  })

  it('toSide clears the other side, and Fastest becomes Nearest in pickup', () => {
    expect(toSide({ ...NONE, time: 30 }, true)).toEqual({ ...NONE, sort: 'nearest' })
    expect(toSide({ ...NONE, time: 30, sort: 'price' }, true)).toEqual({ ...NONE, sort: 'price' })
    // Back to delivery keeps Nearest.
    expect(toSide({ ...NONE, distance: 1, sort: 'nearest' }, false)).toEqual({ ...NONE, sort: 'nearest' })
  })

  it('counts budget, and time or distance as one', () => {
    expect(activeCount(NONE)).toBe(0)
    expect(activeCount({ ...NONE, cuisine: 'chinese', sort: 'price' })).toBe(0)
    expect(activeCount({ ...NONE, budget: 20, time: 30 })).toBe(2)
    expect(activeCount({ ...NONE, budget: 20, distance: 1 })).toBe(2)
    expect(activeCount({ ...NONE, budget: 20, time: 30, distance: 1 })).toBe(2)
  })
})
