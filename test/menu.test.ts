import { describe, expect, it } from 'vitest'
import { menuView } from '../shared/menu'
import { priceItem, toSummary } from '../shared/pricing'
import { item, makeRestaurant, paseo } from './fixtures'

const ids = (rows: { item: { id: string } }[]) => rows.map((r) => r.item.id)

describe('menuView', () => {
  it('splits Paseo at $20 by most liked', () => {
    const v = menuView(paseo, 2000, 'liked')
    expect(v.restaurant).toEqual(toSummary(paseo))
    expect(v.budgetCents).toBe(2000)
    expect(v.sort).toBe('liked')
    // likePct 88, 82, 79
    expect(ids(v.fits)).toEqual(['chicken-bowl', 'tofu-bowl', 'musubi-plate'])
    expect(v.fits.map((r) => r.overCents)).toEqual([0, 0, 0])
    // veggie 2054 - 2000 = 54, salmon 2362 - 2000 = 362
    expect(ids(v.over)).toEqual(['veggie-bowl', 'salmon-poke'])
    expect(v.over.map((r) => r.overCents)).toEqual([54, 362])
  })

  it('attaches the full price to each row', () => {
    const v = menuView(paseo, 2000, 'liked')
    for (const row of [...v.fits, ...v.over]) {
      expect(row.price).toEqual(priceItem(row.item, paseo))
    }
    expect(v.fits[0].price.totalCents).toBe(1873)
  })

  it('uses pickup prices for pickup', () => {
    const v = menuView(paseo, 2000, 'nearest', true)
    expect(v.pickup).toBe(true)
    for (const row of [...v.fits, ...v.over]) {
      expect(row.price).toEqual(priceItem(row.item, paseo, true))
    }
    // Without the 199 delivery fee: chicken 1674, tofu 1749, musubi 1366, veggie 1855 fit; salmon 2163 is over.
    expect(ids(v.fits)).toEqual(['chicken-bowl', 'veggie-bowl', 'tofu-bowl', 'musubi-plate'])
    expect(v.over.map((r) => [r.item.id, r.overCents])).toEqual([['salmon-poke', 163]])
  })

  it('sorts Paseo at $20 by lowest price', () => {
    const v = menuView(paseo, 2000, 'price')
    // 1565, 1873, 1948
    expect(ids(v.fits)).toEqual(['musubi-plate', 'chicken-bowl', 'tofu-bowl'])
    expect(ids(v.over)).toEqual(['veggie-bowl', 'salmon-poke'])
  })

  it('puts every item in fits when there is no budget', () => {
    const v = menuView(paseo, null, 'liked')
    expect(v.budgetCents).toBeNull()
    // likePct 91, 88, 85, 82, 79
    expect(ids(v.fits)).toEqual([
      'salmon-poke',
      'chicken-bowl',
      'veggie-bowl',
      'tofu-bowl',
      'musubi-plate',
    ])
    expect(v.fits.map((r) => r.overCents)).toEqual([0, 0, 0, 0, 0])
    expect(v.over).toEqual([])
  })

  it('counts a total equal to the budget as a fit', () => {
    const v = menuView(paseo, 1873, 'price')
    expect(ids(v.fits)).toEqual(['musubi-plate', 'chicken-bowl'])
    // tofu 1948 - 1873 = 75
    expect(v.over.map((r) => [r.item.id, r.overCents])).toEqual([
      ['tofu-bowl', 75],
      ['veggie-bowl', 181],
      ['salmon-poke', 489],
    ])
  })

  it('uses id order for ties in every list', () => {
    // Same price and likes. Each total is 1300.
    const r = makeRestaurant({
      id: 'twins',
      menu: [item('z-item', 'Z', 1000, 80), item('y-item', 'Y', 1000, 80)],
    })
    expect(ids(menuView(r, null, 'liked').fits)).toEqual(['y-item', 'z-item'])
    expect(ids(menuView(r, null, 'price').fits)).toEqual(['y-item', 'z-item'])
    const v = menuView(r, 1000, 'liked')
    expect(v.fits).toEqual([])
    expect(v.over.map((x) => [x.item.id, x.overCents])).toEqual([
      ['y-item', 300],
      ['z-item', 300],
    ])
  })
})
