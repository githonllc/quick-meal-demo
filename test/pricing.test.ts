import { describe, expect, it } from 'vitest'
import { lineCents, priceItem } from '../shared/pricing'

const restaurant = {
  deliveryFeeCents: 199,
  smallOrderFeeCents: 250,
  taxRateBps: 950,
}

const rows = [
  { priceCents: 1200, small: 0, service: 180, tax: 114, tip: 180, total: 1873 },
  { priceCents: 1075, small: 250, service: 161, tax: 102, tip: 161, total: 1948 },
  { priceCents: 800, small: 250, service: 120, tax: 76, tip: 120, total: 1565 },
  { priceCents: 1150, small: 250, service: 173, tax: 109, tip: 173, total: 2054 },
  { priceCents: 1550, small: 0, service: 233, tax: 147, tip: 233, total: 2362 },
]

describe('priceItem', () => {
  it.each(rows)('breaks down $priceCents cents', (row) => {
    expect(priceItem({ priceCents: row.priceCents }, restaurant)).toEqual({
      itemCents: row.priceCents,
      deliveryFeeCents: 199,
      smallOrderFeeCents: row.small,
      serviceFeeCents: row.service,
      taxCents: row.tax,
      tipCents: row.tip,
      totalCents: row.total,
      taxRateBps: 950,
    })
  })
})

describe('priceItem for pickup', () => {
  it('drops the delivery fee and keeps the rest', () => {
    // Chicken Rice Bowl 1873 for delivery; tofu keeps its small-order fee.
    expect(priceItem({ priceCents: 1200 }, restaurant, true)).toMatchObject({ deliveryFeeCents: 0, totalCents: 1674 })
    expect(priceItem({ priceCents: 1075 }, restaurant, true)).toMatchObject({
      deliveryFeeCents: 0,
      smallOrderFeeCents: 250,
      totalCents: 1749,
    })
  })
})

describe('lineCents', () => {
  it('rounds half-cent ties up', () => {
    expect(lineCents(1150, 1500)).toBe(173)
    expect(lineCents(1550, 1500)).toBe(233)
  })
})
