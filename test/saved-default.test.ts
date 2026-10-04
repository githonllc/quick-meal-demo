import { describe, expect, it } from 'vitest'
import { initialFilters } from '../src/state/filters'
import type { UiFilters } from '../src/state/filters'
import { firstSave, loadDefault, saveDefault } from '../src/state/savedDefault'
import type { Store } from '../src/state/savedDefault'

const KEY = 'quickMeal.filters.v1'
const NONE: UiFilters = { budget: null, time: null, distance: null, cuisine: null, sort: 'fastest' }

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

const stored = (v: unknown) => fakeStore({ [KEY]: JSON.stringify(v) })

describe('saved default', () => {
  it('round trips budget, time or distance, and sort', () => {
    const store = fakeStore()
    saveDefault({ budget: 20, time: 30, distance: null, cuisine: null, sort: 'price' }, store)
    expect(loadDefault(store)).toEqual({ budget: 20, time: 30, distance: null, sort: 'price' })
    saveDefault({ budget: 20, time: null, distance: 1, cuisine: null, sort: 'nearest' }, store)
    expect(loadDefault(store)).toEqual({ budget: 20, time: null, distance: 1, sort: 'nearest' })
  })

  it('never stores or restores both time and distance', () => {
    const store = fakeStore()
    saveDefault({ budget: 20, time: 30, distance: 1, cuisine: null, sort: 'fastest' }, store)
    expect(JSON.parse(store.data[KEY])).toEqual({ budget: 20, time: 30, distance: null, sort: 'fastest' })
    expect(loadDefault(stored({ time: 20, distance: 1 }))).toMatchObject({ time: 20, distance: null })
  })

  it('never stores the cuisine', () => {
    const store = fakeStore()
    saveDefault({ ...NONE, budget: 20, cuisine: 'chinese' }, store)
    expect(JSON.parse(store.data[KEY])).toEqual({ budget: 20, time: null, distance: null, sort: 'fastest' })
  })

  it('returns null when nothing is saved', () => {
    expect(loadDefault(fakeStore())).toBeNull()
  })

  it('clamps the budget', () => {
    expect(loadDefault(stored({ budget: 5 }))?.budget).toBe(10)
    expect(loadDefault(stored({ budget: 10 }))?.budget).toBe(10)
    expect(loadDefault(stored({ budget: 39 }))?.budget).toBe(39)
    expect(loadDefault(stored({ budget: 40 }))?.budget).toBeNull()
    expect(loadDefault(stored({ budget: 55 }))?.budget).toBeNull()
    expect(loadDefault(stored({ budget: 20.5 }))?.budget).toBeNull()
    expect(loadDefault(stored({ budget: '20' }))?.budget).toBeNull()
  })

  it('moves time and distance to the nearest step, ties to the smaller one', () => {
    expect(loadDefault(stored({ time: 25 }))?.time).toBe(25)
    expect(loadDefault(stored({ time: 25.5 }))?.time).toBe(25)
    expect(loadDefault(stored({ time: 90 }))?.time).toBe(45)
    expect(loadDefault(stored({ time: 1 }))?.time).toBe(15)
    expect(loadDefault(stored({ distance: 2.5 }))?.distance).toBe(2.5)
    expect(loadDefault(stored({ distance: 2.3 }))?.distance).toBe(2.5)
    expect(loadDefault(stored({ distance: 9 }))?.distance).toBe(5)
    expect(loadDefault(stored({ distance: 2.5 }))?.sort).toBe('nearest')
    expect(loadDefault(stored({ distance: 0.7 }))?.distance).toBe(0.5)
    expect(loadDefault(stored({ distance: 5 }))?.distance).toBe(5)
    expect(loadDefault(stored({ time: null, distance: 'far' }))).toMatchObject({ time: null, distance: null })
  })

  it("turns an unknown sort into the side's default", () => {
    expect(loadDefault(stored({ sort: 'cheap' }))?.sort).toBe('fastest')
    expect(loadDefault(stored({ sort: 'best' }))?.sort).toBe('fastest')
    expect(loadDefault(stored({ sort: 'liked' }))?.sort).toBe('rated')
    expect(loadDefault(stored({ distance: 1, sort: 'liked' }))?.sort).toBe('rated')
    expect(loadDefault(stored({ distance: 1, sort: 'fastest' }))?.sort).toBe('nearest')
    expect(loadDefault(stored({ time: 30, sort: 'nearest' }))?.sort).toBe('fastest')
  })

  it('returns null for bad JSON or a value that is not an object', () => {
    expect(loadDefault(fakeStore({ [KEY]: '{oops' }))).toBeNull()
    expect(loadDefault(stored(null))).toBeNull()
    expect(loadDefault(stored([20, 30]))).toBeNull()
    expect(loadDefault(stored('budget'))).toBeNull()
  })

  it('treats storage that throws as "no saved default"', () => {
    expect(loadDefault(broken)).toBeNull()
    expect(() => saveDefault({ ...NONE, budget: 20 }, broken)).not.toThrow()
    expect(firstSave(broken)).toBe(false)
    expect(loadDefault(null)).toBeNull()
  })

  it('says "first save" only once', () => {
    const store = fakeStore()
    expect(firstSave(store)).toBe(true)
    expect(firstSave(store)).toBe(false)
  })
})

describe('initial filters', () => {
  const saved = () => stored({ budget: 20, time: 30, distance: null, sort: 'fastest' })

  it('uses the saved default when the URL has no filters', () => {
    expect(initialFilters('', saved())).toEqual({ ...NONE, budget: 20, time: 30 })
  })

  it('keeps the cuisine from the URL and the rest from the saved default', () => {
    expect(initialFilters('?cuisine=chinese', saved())).toEqual({ ...NONE, budget: 20, time: 30, cuisine: 'chinese' })
  })

  it('lets any filter in the URL win over the saved default', () => {
    expect(initialFilters('?time=15', saved())).toEqual({ ...NONE, time: 15 })
    expect(initialFilters('?budget=40', saved())).toEqual(NONE)
    expect(initialFilters('?sort=price', saved())).toEqual({ ...NONE, sort: 'price' })
  })

  it('reads only the URL when there is no saved default or no storage', () => {
    expect(initialFilters('?cuisine=sushi', fakeStore())).toEqual({ ...NONE, cuisine: 'sushi' })
    expect(initialFilters('', broken)).toEqual(NONE)
  })
})
