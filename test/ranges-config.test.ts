import { describe, expect, it } from 'vitest'
import { DEFAULT_RANGES, isValidRange, stepsOf } from '../shared/ranges'
import { DEFAULT_CONFIG, applyLayoutParam, loadConfig, parseConfig, resetConfig, saveConfig } from '../src/state/config'
import type { Store } from '../src/state/savedDefault'
import { sortForLayout, sortIds } from '../src/state/sorts'

const KEY = 'quickMeal.config.v1'

// A stand-in for window.localStorage.
function fakeStore(init: Record<string, string> = {}): Store & { data: Record<string, string> } {
  const data = { ...init }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

// Like storage in some private modes: every call throws.
const broken: Store = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('ranges', () => {
  it('the default ranges give every minute from 15 to 45 and every half mile from 0.5 to 5', () => {
    expect(stepsOf(DEFAULT_RANGES.time)).toEqual(Array.from({ length: 31 }, (_, i) => 15 + i))
    expect(stepsOf(DEFAULT_RANGES.distance)).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
  })

  it('lists every stop from min to max, rounded to 2 decimals', () => {
    expect(stepsOf({ min: 10, max: 60, step: 5 })).toEqual([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
    expect(stepsOf({ min: 0.7, max: 2.7, step: 0.5 })).toEqual([0.7, 1.2, 1.7, 2.2, 2.7])
    expect(stepsOf({ min: 1, max: 10, step: 1 })).toHaveLength(10)
  })

  it('accepts the default ranges and other valid ones', () => {
    expect(isValidRange('time', DEFAULT_RANGES.time)).toBe(true)
    expect(isValidRange('distance', DEFAULT_RANGES.distance)).toBe(true)
    expect(isValidRange('time', { min: 5, max: 90, step: 5 })).toBe(true)
    expect(isValidRange('time', { min: 15, max: 60, step: 15 })).toBe(true)
    expect(isValidRange('distance', { min: 0.5, max: 10, step: 0.5 })).toBe(true)
    expect(isValidRange('distance', { min: 1, max: 10, step: 1 })).toBe(true)
  })

  it.each([
    ['time', { min: 4, max: 45, step: 1 }, 'min below 5'],
    ['time', { min: 15, max: 91, step: 1 }, 'max above 90'],
    ['time', { min: 45, max: 15, step: 1 }, 'min above max'],
    ['time', { min: 30, max: 30, step: 1 }, 'min equal to max'],
    ['time', { min: 15, max: 45, step: 2 }, 'step not allowed'],
    ['time', { min: 15, max: 40, step: 10 }, 'max not a whole number of steps'],
    ['time', { min: 15.5, max: 45.5, step: 1 }, 'not whole minutes'],
    ['time', { min: 10, max: 55, step: 15 }, 'min not on the step grid'],
    ['distance', { min: 0.7, max: 2.7, step: 1 }, 'min not on the step grid'],
    ['time', { min: '15', max: 45, step: 1 }, 'a string'],
    ['time', null, 'null'],
    ['distance', { min: 0.25, max: 5, step: 0.5 }, 'quarter miles'],
    ['distance', { min: 0.5, max: 5, step: 0.25 }, 'a 0.25 step'],
    ['distance', { min: 0.4, max: 5, step: 0.5 }, 'max not a whole number of steps'],
    ['distance', { min: 0, max: 5, step: 0.5 }, 'min below 0.5'],
    ['distance', { min: 0.5, max: 10.5, step: 0.5 }, 'max above 10'],
    ['distance', { min: 0.5, max: 5, step: 2 }, 'step not allowed'],
    ['distance', { min: 0.5, max: Infinity, step: 0.5 }, 'not finite'],
  ] as const)('rejects a %s range with %s (%s)', (kind, r, _why) => {
    expect(isValidRange(kind, r)).toBe(false)
  })
})

describe('demo config', () => {
  it('defaults to dish cards, saved filters on, study off, normal network', () => {
    expect(loadConfig(fakeStore())).toEqual({
      layout: 'meals',
      time: { min: 15, max: 45, step: 1 },
      distance: { min: 0.5, max: 5, step: 0.5 },
      saveFilters: true,
      study: false,
      network: { delayMs: 0, fail: false },
    })
  })

  it('round trips', () => {
    const store = fakeStore()
    const c = {
      layout: 'places' as const,
      time: { min: 10, max: 60, step: 5 },
      distance: { min: 1, max: 10, step: 1 },
      saveFilters: false,
      study: true,
      network: { delayMs: 1500 as const, fail: true },
    }
    saveConfig(c, store)
    expect(loadConfig(store)).toEqual(c)
  })

  it('gives each bad field its default and keeps the good ones', () => {
    const c = parseConfig(
      JSON.stringify({
        layout: 'grid',
        time: { min: 10, max: 60, step: 5 },
        distance: { min: 0.5, max: 5, step: 0.25 },
        saveFilters: 'no',
        study: true,
        network: { delayMs: 700, fail: true },
      }),
    )
    expect(c).toEqual({
      ...DEFAULT_CONFIG,
      time: { min: 10, max: 60, step: 5 },
      study: true,
      network: { delayMs: 0, fail: true },
    })
    // Only the layout, as a study link or the e2e helper saves it.
    expect(parseConfig('{"layout":"places"}')).toEqual({ ...DEFAULT_CONFIG, layout: 'places' })
    expect(parseConfig('{"network":7}').network).toEqual(DEFAULT_CONFIG.network)
  })

  it('returns the defaults for bad JSON, a non-object, or no storage', () => {
    expect(parseConfig('{oops')).toEqual(DEFAULT_CONFIG)
    expect(parseConfig('[1]')).toEqual(DEFAULT_CONFIG)
    expect(parseConfig('null')).toEqual(DEFAULT_CONFIG)
    expect(loadConfig(null)).toEqual(DEFAULT_CONFIG)
    expect(loadConfig(broken)).toEqual(DEFAULT_CONFIG)
    expect(() => saveConfig(DEFAULT_CONFIG, broken)).not.toThrow()
  })

  it('reset restores the defaults', () => {
    const store = fakeStore({ [KEY]: '{"layout":"places","study":true}' })
    resetConfig(store)
    expect(loadConfig(store)).toEqual(DEFAULT_CONFIG)
  })

  it('?layout= sets and saves the layout, and ignores other values', () => {
    const store = fakeStore({ [KEY]: '{"study":true}' })
    applyLayoutParam('?budget=20&layout=places', store)
    expect(loadConfig(store)).toEqual({ ...DEFAULT_CONFIG, layout: 'places', study: true })
    applyLayoutParam('?layout=grid', store)
    expect(loadConfig(store).layout).toBe('places')
    applyLayoutParam('', store)
    expect(loadConfig(store).layout).toBe('places')
    applyLayoutParam('layout=meals', store)
    expect(loadConfig(store).layout).toBe('meals')
  })
})

describe('sorts by layout', () => {
  it('each side and layout shows its default, Lowest price, and the layout sort', () => {
    expect(sortIds(false, 'meals')).toEqual(['fastest', 'price', 'liked'])
    expect(sortIds(true, 'meals')).toEqual(['nearest', 'price', 'liked'])
    expect(sortIds(false, 'places')).toEqual(['fastest', 'price', 'rated'])
    expect(sortIds(true, 'places')).toEqual(['nearest', 'price', 'rated'])
  })

  it('swaps Most liked and Top rated with the layout, and falls back to the side default', () => {
    expect(sortForLayout('rated', false, 'meals')).toBe('liked')
    expect(sortForLayout('liked', true, 'places')).toBe('rated')
    expect(sortForLayout('price', true, 'places')).toBe('price')
    expect(sortForLayout('fastest', true, 'meals')).toBe('nearest')
    expect(sortForLayout('nearest', false, 'places')).toBe('fastest')
    expect(sortForLayout('best', false, 'meals')).toBe('fastest')
    expect(sortForLayout(null, true, 'meals')).toBe('nearest')
  })
})
