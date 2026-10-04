import { describe, expect, it } from 'vitest'
import type { Store } from '../src/state/savedDefault'
import {
  activeTrial,
  cancelTrial,
  clearResults,
  endTrial,
  formatSeconds,
  loadResults,
  markFirstOpen,
  startTrial,
  toCsv,
} from '../src/state/study'
import type { StudyResult, Tapped } from '../src/state/study'

// A stand-in for sessionStorage or localStorage.
function fakeStore(): Store & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
}

const broken: Store = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

const TAP: Tapped = { path: 'list', restaurant: 'Thai Basil', item: 'Pad Thai', totalCents: 1420 }

describe('study trial', () => {
  it('records the time from start to the first Add to cart, and what was tapped', () => {
    const session = fakeStore()
    const local = fakeStore()
    startTrial('meals', 'budget=20&time=30', 1000, session)
    const row = endTrial(TAP, 24_400, session, local)
    expect(row).toMatchObject({
      layout: 'meals',
      ms: 23_400,
      firstOpenMs: null,
      path: 'list',
      restaurant: 'Thai Basil',
      item: 'Pad Thai',
      totalCents: 1420,
      startFilters: 'budget=20&time=30',
      at: new Date(24_400).toISOString(),
    })
    expect(loadResults(local)).toEqual([row])
  })

  it('does not restart a running trial (back from a menu)', () => {
    const session = fakeStore()
    startTrial('meals', '', 1000, session)
    const first = activeTrial(session)
    startTrial('places', 'budget=10', 5000, session)
    expect(activeTrial(session)).toEqual(first)
  })

  it('ends at the first tap only: a second tap records nothing', () => {
    const session = fakeStore()
    const local = fakeStore()
    startTrial('meals', '', 0, session)
    expect(endTrial(TAP, 100, session, local)).not.toBeNull()
    expect(endTrial(TAP, 200, session, local)).toBeNull()
    expect(loadResults(local)).toHaveLength(1)
  })

  it('records nothing without a trial or after a cancel', () => {
    const session = fakeStore()
    const local = fakeStore()
    expect(endTrial(TAP, 100, session, local)).toBeNull()
    startTrial('meals', '', 0, session)
    cancelTrial(session)
    expect(endTrial(TAP, 100, session, local)).toBeNull()
    expect(loadResults(local)).toEqual([])
  })

  it('keeps the first open only', () => {
    const session = fakeStore()
    const local = fakeStore()
    markFirstOpen(50, session) // no trial: nothing happens
    startTrial('places', '', 100, session)
    markFirstOpen(1100, session)
    markFirstOpen(2100, session)
    expect(endTrial({ ...TAP, path: 'menu' }, 3100, session, local)?.firstOpenMs).toBe(1000)
  })

  it('keeps the newest 200 results', () => {
    const session = fakeStore()
    const local = fakeStore()
    for (let i = 0; i < 205; i++) {
      startTrial('meals', '', i, session)
      endTrial(TAP, i + 10, session, local)
    }
    const rows = loadResults(local)
    expect(rows).toHaveLength(200)
    expect(rows[0].at).toBe(new Date(15).toISOString())
    clearResults(local)
    expect(loadResults(local)).toEqual([])
  })

  it('does nothing when storage throws', () => {
    expect(() => startTrial('meals', '', 0, broken)).not.toThrow()
    expect(endTrial(TAP, 10, broken, broken)).toBeNull()
    expect(loadResults(broken)).toEqual([])
    expect(() => cancelTrial(broken)).not.toThrow()
    expect(() => clearResults(broken)).not.toThrow()
  })

  it('reads bad stored results as none', () => {
    const local = fakeStore()
    local.setItem('quickMeal.study.v1', '{"not":"a list"}')
    expect(loadResults(local)).toEqual([])
    local.setItem('quickMeal.study.v1', 'not json')
    expect(loadResults(local)).toEqual([])
  })
})

describe('study output', () => {
  it('says seconds with one decimal', () => {
    expect(formatSeconds(23_400)).toBe('23.4 s')
    expect(formatSeconds(500)).toBe('0.5 s')
  })

  it('writes CSV with a header and quotes values that need it', () => {
    const row: StudyResult = {
      id: 'a1',
      at: '2026-10-04T12:00:00.000Z',
      layout: 'places',
      ms: 23_400,
      firstOpenMs: null,
      path: 'menu',
      restaurant: 'Joe\'s "Best", Tacos',
      item: 'Taco',
      totalCents: 899,
      startFilters: 'budget=10&sort=price',
    }
    expect(toCsv([row]).split('\n')).toEqual([
      'id,at,layout,ms,firstOpenMs,path,restaurant,item,totalCents,startFilters',
      'a1,2026-10-04T12:00:00.000Z,places,23400,,menu,"Joe\'s ""Best"", Tacos",Taco,899,budget=10&sort=price',
    ])
    expect(toCsv([])).toBe('id,at,layout,ms,firstOpenMs,path,restaurant,item,totalCents,startFilters')
  })
})
