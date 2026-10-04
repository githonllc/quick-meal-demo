import { describe, expect, it } from 'vitest'
import { SORTS } from '../shared/constants'
import { menuView } from '../shared/menu'
import { priceItem, toSummary } from '../shared/pricing'
import { search } from '../shared/search'
import type { SortId } from '../shared/types'
import {
  curryHouse,
  farBurger,
  filters,
  greenLeaf,
  item,
  makeRestaurant,
  paseo,
  restaurants,
  sakuraClosed,
  sliceHouse,
  sortList,
  tacoLoco,
} from './fixtures'

const ids = (cards: { restaurant: { id: string } }[]) => cards.map((c) => c.restaurant.id)
const sorts: SortId[] = SORTS.map((s) => s.id)

describe('search: exact', () => {
  it('builds one card per place with the lead meal and the rest as more', () => {
    const res = search(restaurants, filters({ budgetCents: 2000 }))
    const card = res.exact.find((c) => c.restaurant.id === 'paseo-rice-bowl')
    expect(card).toBeDefined()
    expect(card?.restaurant).toEqual(toSummary(paseo))
    expect(card?.item.id).toBe('chicken-bowl')
    expect(card?.price).toEqual(priceItem(paseo.menu[0], paseo))
    expect(card?.moreCount).toBe(2)
    expect(card?.moreNames).toEqual(['Tofu Rice Bowl', 'Spam Musubi Plate'])
  })

  it('leaves out places with no meal in budget', () => {
    // Far Burger's cheapest total is 4030.
    const res = search(restaurants, filters({ budgetCents: 2000 }))
    expect(ids(res.exact)).not.toContain('far-burger')
  })

  it('returns no near and no relax when there is an exact match', () => {
    const res = search(restaurants, filters({ budgetCents: 2000 }))
    expect(res.exact.length).toBeGreaterThan(0)
    expect(res.total).toBe(res.exact.length)
    expect(res.near).toEqual([])
    expect(res.relax).toEqual([])
    expect(res.filters).toEqual(filters({ budgetCents: 2000 }))
  })

  it('never shows a closed place', () => {
    const res = search(restaurants, filters({ sort: 'rated' }))
    // Ratings: paseo 4.6, green 4.4, taco 4.3, curry 4.2, slice 4.1, far 4.0.
    expect(ids(res.exact)).toEqual([
      'paseo-rice-bowl',
      'green-leaf',
      'taco-loco',
      'curry-house',
      'slice-house',
      'far-burger',
    ])
    expect(res.total).toBe(6)
    // Sakura (780 total) would fit $10 if it were open.
    const cheap = search(restaurants, filters({ budgetCents: 1000 }))
    expect(cheap.exact).toEqual([])
    expect(ids(cheap.near)).not.toContain('sakura-sushi')
  })

  it('applies time, distance and cuisine as place filters', () => {
    expect(ids(search(restaurants, filters({ timeMin: 20 })).exact).sort()).toEqual(
      ['green-leaf', 'paseo-rice-bowl', 'slice-house', 'taco-loco'],
    )
    expect(ids(search(restaurants, filters({ distanceMi: 0.5 })).exact).sort()).toEqual(
      ['paseo-rice-bowl', 'taco-loco'],
    )
    expect(ids(search(restaurants, filters({ cuisine: 'healthy' })).exact).sort()).toEqual(
      ['green-leaf', 'paseo-rice-bowl'],
    )
  })

  it('prices pickup without the delivery fee', () => {
    // Paseo is 0.4 mi away. Pickup: chicken 1873 - 199 = 1674.
    const res = search(restaurants, filters({ budgetCents: 2000, distanceMi: 1 }))
    const card = res.exact.find((c) => c.restaurant.id === 'paseo-rice-bowl')
    expect(card?.price).toEqual(priceItem(paseo.menu[0], paseo, true))
    expect(card?.price.totalCents).toBe(1674)
  })

  it('takes the lead meal from menuView fits[0] for every card, delivery and pickup', () => {
    // Pickup at 1 mi leaves out Slice House (2.5 mi); 3 mi keeps every place but Far Burger.
    for (const distanceMi of [null, 1, 3] as const) {
      for (const budgetCents of [1500, 2000, null]) {
        for (const sort of sorts) {
          const res = search(restaurants, filters({ budgetCents, distanceMi, sort }))
          for (const r of restaurants) {
            const v = menuView(r, budgetCents, sort, distanceMi !== null)
            const card = res.exact.find((c) => c.restaurant.id === r.id)
            const inRange = distanceMi === null || r.distanceMi <= distanceMi
            if (!r.isOpen || !inRange || v.fits.length === 0) {
              expect(card).toBeUndefined()
              continue
            }
            expect(card?.item).toEqual(v.fits[0].item)
            expect(card?.price).toEqual(v.fits[0].price)
            expect(card?.moreCount).toBe(v.fits.length - 1)
            expect(card?.moreNames).toEqual(v.fits.slice(1).map((x) => x.item.name))
          }
        }
      }
    }
  })
})

describe('search: card sort', () => {
  // See sortList in fixtures. Every tie pair is listed in reverse id order.
  it('liked: likes, then rating, then eta, then id', () => {
    // a 90 likes; b 4.8 rating; d and e eta 15 tie on id; c eta 20.
    expect(ids(search(sortList, filters({ sort: 'liked' })).exact)).toEqual([
      'r-a',
      'r-b',
      'r-d',
      'r-e',
      'r-c',
    ])
  })

  it('rated: rating, then rating count, then eta, then id', () => {
    // b 4.8; the rest 4.5 but a 4.0; c has 200 ratings; d and e eta 15 tie on id. Dish likes do not count.
    const list = sortList.map((r) => (r.id === 'r-c' ? { ...r, ratingCount: 200 } : r))
    expect(ids(search(list, filters({ sort: 'rated' })).exact)).toEqual([
      'r-b',
      'r-c',
      'r-d',
      'r-e',
      'r-a',
    ])
  })

  it('price: total, then id', () => {
    // e 1040, b 1170, a 1300 and c 1300 tie on id, d 1560.
    expect(ids(search(sortList, filters({ sort: 'price' })).exact)).toEqual([
      'r-e',
      'r-b',
      'r-a',
      'r-c',
      'r-d',
    ])
  })

  it('fastest: eta, then id', () => {
    // b 10, d 15 and e 15 tie on id, c 20, a 30.
    expect(ids(search(sortList, filters({ sort: 'fastest' })).exact)).toEqual([
      'r-b',
      'r-d',
      'r-e',
      'r-c',
      'r-a',
    ])
  })

  it('nearest: distance, then id', () => {
    // b 0.5, c 1 and d 1 tie on id, a 2, e 3.
    expect(ids(search(sortList, filters({ sort: 'nearest' })).exact)).toEqual([
      'r-b',
      'r-c',
      'r-d',
      'r-a',
      'r-e',
    ])
  })
})

describe('search: near', () => {
  it('scores misses and labels them for a hand-computed delivery case', () => {
    const res = search(restaurants, filters({ budgetCents: 1500, timeMin: 15, cuisine: 'healthy' }))
    expect(res.exact).toEqual([])
    expect(res.total).toBe(0)
    // Taco Loco would fit every limit but is Mexican, so it is not near.
    expect(ids(res.near)).toEqual(['green-leaf', 'paseo-rice-bowl'])

    const [g, p] = res.near
    // Green Leaf: kale 1430 fits. eta 19 - 15 = 4 min, score 4 / 10 = 0.4.
    // Grain bowl would add 190 / 500, so kale wins.
    expect(g.item.id).toBe('kale-salad')
    expect(g.price).toEqual(priceItem(greenLeaf.menu[0], greenLeaf))
    expect(g.miss).toEqual([{ filter: 'time', over: 4, label: '4 min slower' }])
    expect(g.score).toBeCloseTo(0.4, 10)

    // Paseo: musubi 1565 - 1500 = 65 cents, eta 18 - 15 = 3 min.
    // Score 65 / 500 + 3 / 10 = 0.13 + 0.3 = 0.43.
    expect(p.restaurant).toEqual(toSummary(paseo))
    expect(p.item.id).toBe('musubi-plate')
    expect(p.price).toEqual(priceItem(paseo.menu[2], paseo))
    expect(p.moreCount).toBe(0)
    expect(p.moreNames).toEqual([])
    expect(p.miss).toEqual([
      { filter: 'budget', over: 65, label: '$0.65 over budget' },
      { filter: 'time', over: 3, label: '3 min slower' },
    ])
    expect(p.score).toBeCloseTo(0.43, 10)
  })

  it('scores pickup misses at pickup prices', () => {
    const res = search(restaurants, filters({ budgetCents: 1300, distanceMi: 0.5, cuisine: 'healthy' }))
    expect(res.exact).toEqual([])
    expect(ids(res.near)).toEqual(['paseo-rice-bowl', 'green-leaf'])

    const [p, g] = res.near
    // Paseo pickup: musubi 1565 - 199 = 1366, 66 over. Score 66 / 500 = 0.132.
    expect(p.item.id).toBe('musubi-plate')
    expect(p.price).toEqual(priceItem(paseo.menu[2], paseo, true))
    expect(p.miss).toEqual([{ filter: 'budget', over: 66, label: '$0.66 over budget' }])
    expect(p.score).toBeCloseTo(0.132, 10)

    // Green Leaf: kale 1430, 130 over, and 0.9 - 0.5 = 0.4 mi. Score 0.26 + 0.4 = 0.66.
    expect(g.item.id).toBe('kale-salad')
    expect(g.miss).toEqual([
      { filter: 'budget', over: 130, label: '$1.30 over budget' },
      { filter: 'distance', over: 0.4, label: '0.4 mi farther' },
    ])
    expect(g.score).toBeCloseTo(0.66, 10)
  })

  it('caps near at 5, best score first, and skips closed places', () => {
    const res = search(restaurants, filters({ budgetCents: 1000 }))
    expect(res.exact).toEqual([])
    // Over $10: taco 40, slice 300, green 430, paseo 565, curry 640, far 3030 (cut).
    expect(ids(res.near)).toEqual([
      'taco-loco',
      'slice-house',
      'green-leaf',
      'paseo-rice-bowl',
      'curry-house',
    ])
    const expected = [0.08, 0.6, 0.86, 1.13, 1.28]
    res.near.forEach((c, i) => expect(c.score).toBeCloseTo(expected[i], 10))
    expect(res.near[0].miss).toEqual([{ filter: 'budget', over: 40, label: '$0.40 over budget' }])
  })

  it('breaks a score tie between items by lower total', () => {
    // Both Curry House items are only 10 min slow (score 1). Butter 1640 < paneer 1900.
    const res = search(restaurants, filters({ timeMin: 15, cuisine: 'indian' }))
    expect(res.near).toHaveLength(1)
    expect(res.near[0].item.id).toBe('butter-chicken')
    expect(res.near[0].price).toEqual(priceItem(curryHouse.menu[0], curryHouse))
    expect(res.near[0].miss).toEqual([{ filter: 'time', over: 10, label: '10 min slower' }])
    expect(res.near[0].score).toBeCloseTo(1, 10)
  })

  it('labels a whole-mile miss with one decimal', () => {
    // Slice House 2.5 - 0.5 = 2 mi, score 2.
    const res = search(restaurants, filters({ distanceMi: 0.5, cuisine: 'pizza' }))
    expect(ids(res.near)).toEqual(['slice-house'])
    expect(res.near[0].miss).toEqual([{ filter: 'distance', over: 2, label: '2.0 mi farther' }])
    expect(res.near[0].score).toBeCloseTo(2, 10)
  })

  it('never relaxes cuisine', () => {
    // Sushi has only a closed place. Other open places are not near.
    const res = search(restaurants, filters({ budgetCents: 1500, cuisine: 'sushi' }))
    expect(res.exact).toEqual([])
    expect(res.near).toEqual([])
  })
})

describe('search: relax', () => {
  it('rounds the budget up to whole dollars: 1640 -> $17', () => {
    const res = search(restaurants, filters({ budgetCents: 1500, cuisine: 'indian' }))
    expect(res.exact).toEqual([])
    // Butter 1640 - 1500 = 140, score 140 / 500 = 0.28.
    expect(ids(res.near)).toEqual(['curry-house'])
    expect(res.near[0].miss).toEqual([{ filter: 'budget', over: 140, label: '$1.40 over budget' }])
    expect(res.near[0].score).toBeCloseTo(0.28, 10)
    // Near is not empty, so no "All cuisines".
    expect(res.relax).toEqual([
      { filter: 'budget', to: 17, count: 1, label: 'Budget up to $17 · 1 result' },
    ])
  })

  it('rounds up from the cheapest total of all places', () => {
    // Cheapest open total is taco 1040 -> $11. At $11 only Taco Loco fits.
    const res = search(restaurants, filters({ budgetCents: 1000 }))
    expect(res.relax).toEqual([
      { filter: 'budget', to: 11, count: 1, label: 'Budget up to $11 · 1 result' },
    ])
  })

  it('offers "Remove budget" when the cheapest meal is $40 or more', () => {
    // Double burger 4030 -> ceil 40.30 = 41, not below 40.
    const res = search(restaurants, filters({ budgetCents: 2000, cuisine: 'burgers' }))
    expect(res.near[0].item.id).toBe('double-burger')
    expect(res.relax).toEqual([
      { filter: 'budget', to: null, count: 1, label: 'Remove budget · 1 result' },
    ])
    expect(search([farBurger], filters({ budgetCents: 2000 })).relax[0].to).toBeNull()
  })

  it('picks the first time step that has a result', () => {
    // Curry House eta 25: 24 min gives 0, 25 min gives 1.
    const res = search(restaurants, filters({ timeMin: 15, cuisine: 'indian' }))
    expect(res.relax).toEqual([
      { filter: 'time', to: 25, count: 1, label: 'Time up to 25 min · 1 result' },
    ])
  })

  it('offers "Remove time" when no step has a result', () => {
    // Far Burger eta 50: 45 min gives 0.
    const res = search(restaurants, filters({ timeMin: 30, cuisine: 'burgers' }))
    expect(res.relax).toEqual([
      { filter: 'time', to: null, count: 1, label: 'Remove time · 1 result' },
    ])
  })

  it('picks the first distance step that has a result', () => {
    // Slice House 2.5 mi: 1 to 2 mi give 0, 2.5 mi gives 1.
    const res = search(restaurants, filters({ distanceMi: 0.5, cuisine: 'pizza' }))
    expect(res.relax).toEqual([
      { filter: 'distance', to: 2.5, count: 1, label: 'Distance up to 2.5 mi · 1 result' },
    ])
    expect(search([sliceHouse], filters({ distanceMi: 2 })).relax[0].to).toBe(2.5)
    // Far Burger 3.6 mi: the next half mile that reaches it is 4.
    expect(search([farBurger], filters({ distanceMi: 1 })).relax[0].to).toBe(4)
  })

  it('offers "Remove distance" when no step has a result', () => {
    // A burger place 5.4 mi away: no step up to 5 mi gives a result.
    const res = search([{ ...farBurger, distanceMi: 5.4 }], filters({ distanceMi: 1 }))
    expect(res.relax).toEqual([
      { filter: 'distance', to: null, count: 1, label: 'Remove distance · 1 result' },
    ])
  })

  it('lists the budget option first, then time or distance', () => {
    // Taco Loco (0.3 mi, eta 12) is 1040, over $10. The cheap place (910) is slow and far.
    const cheap = makeRestaurant({ id: 'cheap', etaMin: 25, distanceMi: 1.5, menu: [item('rice', 'Rice', 700, 70)] })
    const delivery = search([tacoLoco, cheap], filters({ budgetCents: 1000, timeMin: 15 }))
    expect(delivery.relax).toEqual([
      { filter: 'budget', to: 11, count: 1, label: 'Budget up to $11 · 1 result' },
      { filter: 'time', to: 25, count: 1, label: 'Time up to 25 min · 1 result' },
    ])
    const pickup = search([tacoLoco, cheap], filters({ budgetCents: 1000, distanceMi: 0.5 }))
    expect(pickup.relax).toEqual([
      { filter: 'budget', to: 11, count: 1, label: 'Budget up to $11 · 1 result' },
      { filter: 'distance', to: 1.5, count: 1, label: 'Distance up to 1.5 mi · 1 result' },
    ])
  })

  it('drops options whose count is 0', () => {
    // No healthy place is that fast, and no step brings a healthy meal under $10.
    const res = search(restaurants, filters({ budgetCents: 1000, timeMin: 15, cuisine: 'healthy' }))
    expect(res.near.length).toBeGreaterThan(0)
    expect(res.relax).toEqual([])
  })

  it('offers "All cuisines" only when cuisine is set and near is empty', () => {
    // No open sushi place, so the budget option is skipped too.
    // At $15 with any cuisine: taco 1040, slice 1300, green 1430.
    const res = search(restaurants, filters({ budgetCents: 1500, cuisine: 'sushi' }))
    expect(res.relax).toEqual([
      { filter: 'cuisine', to: null, count: 3, label: 'All cuisines · 3 results' },
    ])
    // No cuisine set: near is empty here too, but there is no "All cuisines".
    const noCuisine = search([sakuraClosed], filters({ budgetCents: 1000 }))
    expect(noCuisine.near).toEqual([])
    expect(noCuisine.relax).toEqual([])
  })
})
