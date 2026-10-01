import { describe, expect, it } from 'vitest'
import { menuView } from '../shared/menu'
import { search } from '../shared/search'
import type { CuisineId, DistanceStep, Restaurant, TimeStep } from '../shared/types'
import { RESTAURANTS } from '../worker/data/restaurants'
import { filters } from './fixtures'

interface Row {
  budget: number | null // cents
  time: TimeStep | null
  distance: DistanceStep | null
  cuisine: CuisineId | null
  total: number
}

// The scenario table. null means "any".
const ROWS: Row[] = [
  { budget: null, time: null, distance: null, cuisine: null, total: 28 },
  { budget: 2000, time: null, distance: null, cuisine: null, total: 10 },
  { budget: 2500, time: null, distance: null, cuisine: null, total: 18 },
  { budget: 2000, time: 30, distance: null, cuisine: null, total: 6 },
  { budget: 2000, time: 20, distance: 1, cuisine: null, total: 4 },
  { budget: 2000, time: 20, distance: 1, cuisine: 'chinese', total: 2 },
  { budget: 2000, time: null, distance: null, cuisine: 'chinese', total: 3 },
  { budget: 1500, time: 15, distance: 0.5, cuisine: null, total: 0 },
  { budget: 1700, time: 15, distance: 0.5, cuisine: null, total: 1 },
  { budget: null, time: 15, distance: null, cuisine: null, total: 3 },
]

function find(id: string): Restaurant {
  const r = RESTAURANTS.find((x) => x.id === id)
  if (!r) throw new Error(`missing restaurant ${id}`)
  return r
}

describe('scenario table', () => {
  it.each(ROWS)(
    'budget $budget, time $time, distance $distance, cuisine $cuisine -> $total',
    ({ budget, time, distance, cuisine, total }) => {
      const res = search(
        RESTAURANTS,
        filters({ budgetCents: budget, timeMin: time, distanceMi: distance, cuisine }),
      )
      expect(res.total).toBe(total)
    },
  )
})

describe('no-match scenario: budget 1500, time 15, distance 0.5', () => {
  const res = search(RESTAURANTS, filters({ budgetCents: 1500, timeMin: 15, distanceMi: 0.5 }))

  it('shows 5 near cards with Taylor St. Dumplings first', () => {
    expect(res.total).toBe(0)
    expect(res.near.length).toBe(5)
    const first = res.near[0]
    expect(first.restaurant.id).toBe('taylor-st-dumplings')
    expect(first.item.name).toBe('Pork Dumplings (12)')
    expect(first.miss.length).toBe(1)
    expect(first.miss[0].filter).toBe('budget')
    // Taylor St. Dumplings must win on score, not on a tie-break.
    expect(first.score).toBeLessThan(res.near[1].score)
  })

  it('offers exactly two relax chips: budget and time', () => {
    expect(res.relax).toEqual([
      { filter: 'budget', to: 17, count: 1, label: 'Budget up to $17 · 1 result' },
      { filter: 'time', to: 20, count: 1, label: 'Time up to 20 min · 1 result' },
    ])
  })
})

describe('budget 1700, time 15, distance 0.5', () => {
  it('has a single card: Taylor St. Dumplings', () => {
    const res = search(RESTAURANTS, filters({ budgetCents: 1700, timeMin: 15, distanceMi: 0.5 }))
    expect(res.total).toBe(1)
    expect(res.exact[0].restaurant.id).toBe('taylor-st-dumplings')
    expect(res.exact[0].item.name).toBe('Pork Dumplings (12)')
  })
})

describe('budget 2000, time 30', () => {
  it('shows Paseo Rice Bowl with the chicken bowl as lead', () => {
    const res = search(RESTAURANTS, filters({ budgetCents: 2000, timeMin: 30 }))
    const card = res.exact.find((c) => c.restaurant.id === 'paseo-rice-bowl')
    expect(card).toBeDefined()
    expect(card?.item.id).toBe('chicken-bowl')
    expect(card?.moreCount).toBe(2)
    expect(card?.moreNames).toEqual(['Tofu Rice Bowl', 'Spam Musubi Plate'])
  })
})

describe('Paseo menu at $20', () => {
  it('matches the menu engine tests', () => {
    const v = menuView(find('paseo-rice-bowl'), 2000, 'best')
    expect(v.fits.map((r) => r.item.id)).toEqual(['chicken-bowl', 'tofu-bowl', 'musubi-plate'])
    expect(v.over.map((r) => r.item.id)).toEqual(['veggie-bowl', 'salmon-poke'])
    expect(v.over.map((r) => r.overCents)).toEqual([54, 362])
  })
})
