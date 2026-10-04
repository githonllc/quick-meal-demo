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

// The scenario table. null means "any". Time is delivery, distance is pickup, never both.
const ROWS: Row[] = [
  { budget: null, time: null, distance: null, cuisine: null, total: 28 },
  { budget: 2000, time: null, distance: null, cuisine: null, total: 10 },
  { budget: 2500, time: null, distance: null, cuisine: null, total: 18 },
  { budget: 2000, time: 30, distance: null, cuisine: null, total: 6 },
  { budget: 2000, time: 20, distance: null, cuisine: null, total: 4 },
  { budget: 2000, time: 20, distance: null, cuisine: 'chinese', total: 2 },
  { budget: 2000, time: null, distance: null, cuisine: 'chinese', total: 3 },
  { budget: 1500, time: 15, distance: null, cuisine: null, total: 0 },
  { budget: 1700, time: 15, distance: null, cuisine: null, total: 1 },
  { budget: null, time: 15, distance: null, cuisine: null, total: 3 },
  { budget: null, time: 30, distance: null, cuisine: null, total: 17 },
  { budget: 2500, time: 30, distance: null, cuisine: null, total: 13 },
  // Pickup: prices have no delivery fee.
  { budget: 2000, time: null, distance: 1, cuisine: null, total: 7 },
  { budget: 1700, time: null, distance: 1, cuisine: null, total: 5 },
  { budget: 1500, time: null, distance: 0.5, cuisine: null, total: 2 },
  { budget: 1200, time: null, distance: 0.5, cuisine: null, total: 0 },
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

describe('no-match scenario: budget 1500, time 15', () => {
  const res = search(RESTAURANTS, filters({ budgetCents: 1500, timeMin: 15 }))

  it('shows 5 near cards with the Chicken Tacos first, 1 min slower', () => {
    expect(res.total).toBe(0)
    expect(res.near.length).toBe(5)
    const first = res.near[0]
    expect(first.restaurant.name).toBe('Santa Clara Taco Co.')
    expect(first.item.name).toBe('Chicken Tacos (2)')
    expect(first.miss).toEqual([{ filter: 'time', over: 1, label: '1 min slower' }])
    // The Chicken Tacos must win on score, not on a tie-break.
    expect(first.score).toBeLessThan(res.near[1].score)
  })

  it('offers exactly two relax chips: budget and time', () => {
    expect(res.relax).toEqual([
      { filter: 'budget', to: 17, count: 1, label: 'Budget up to $17 · 1 result' },
      { filter: 'time', to: 16, count: 1, label: 'Time up to 16 min · 1 result' },
    ])
  })
})

describe('pickup no-match scenario: budget 1200, distance 0.5', () => {
  it('offers budget and distance relax chips at pickup prices', () => {
    const res = search(RESTAURANTS, filters({ budgetCents: 1200, distanceMi: 0.5 }))
    expect(res.total).toBe(0)
    expect(res.relax).toEqual([
      { filter: 'budget', to: 14, count: 2, label: 'Budget up to $14 · 2 results' },
      { filter: 'distance', to: 1, count: 1, label: 'Distance up to 1 mi · 1 result' },
    ])
    // Near meals miss only on budget or distance.
    for (const card of res.near) expect(card.miss.every((m) => m.filter !== 'time')).toBe(true)
  })
})

describe('budget 2000, time 30, sorted fastest', () => {
  const res = search(RESTAURANTS, filters({ budgetCents: 2000, timeMin: 30 }))

  it('starts with Taylor St. Dumplings, then Santa Clara Taco Co.', () => {
    const [first, second] = res.exact
    expect([first.item.name, first.restaurant.name, first.price.totalCents]).toEqual([
      'Soup Dumplings (8)',
      'Taylor St. Dumplings',
      1844,
    ])
    expect(first.moreCount).toBe(4)
    expect([second.item.name, second.restaurant.name, second.price.totalCents]).toEqual([
      'Carne Asada Burrito',
      'Santa Clara Taco Co.',
      1905,
    ])
    expect(second.moreCount).toBe(4)
  })

  it('shows Paseo Rice Bowl with the chicken bowl as lead', () => {
    const card = res.exact.find((c) => c.restaurant.id === 'paseo-rice-bowl')
    expect(card).toBeDefined()
    expect(card?.item.id).toBe('chicken-bowl')
    expect(card?.moreCount).toBe(2)
    expect(card?.moreNames).toEqual(['Tofu Rice Bowl', 'Spam Musubi Plate'])
  })
})

describe('budget 2000, pickup 1 mi', () => {
  it('prices Paseo Rice Bowl without the delivery fee', () => {
    const res = search(RESTAURANTS, filters({ budgetCents: 2000, distanceMi: 1, sort: 'nearest' }))
    const card = res.exact.find((c) => c.restaurant.id === 'paseo-rice-bowl')
    expect(card?.item.id).toBe('chicken-bowl')
    expect(card?.price.deliveryFeeCents).toBe(0)
    expect(card?.price.totalCents).toBe(1674)
  })
})

describe('Paseo menu at $20', () => {
  it('matches the menu engine tests', () => {
    const v = menuView(find('paseo-rice-bowl'), 2000, 'rated')
    expect(v.fits.map((r) => r.item.id)).toEqual(['chicken-bowl', 'tofu-bowl', 'musubi-plate'])
    expect(v.over.map((r) => r.item.id)).toEqual(['veggie-bowl', 'salmon-poke'])
    expect(v.over.map((r) => r.overCents)).toEqual([54, 362])
  })
})
