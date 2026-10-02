import { SERVICE_FEE_BPS, SMALL_ORDER_THRESHOLD_CENTS, TIP_BPS } from './constants'
import type { MenuItem, PriceBreakdown, Restaurant, RestaurantSummary } from './types'

// Half-up rounding in integer math. Never use floats for money.
export function lineCents(baseCents: number, bps: number): number {
  return Math.floor((baseCents * bps + 5000) / 10000)
}

export function priceItem(
  item: Pick<MenuItem, 'priceCents'>,
  r: Pick<Restaurant, 'deliveryFeeCents' | 'smallOrderFeeCents' | 'taxRateBps'>,
  pickup = false, // pickup has no delivery fee (design P4)
): PriceBreakdown {
  const itemCents = item.priceCents
  const deliveryFeeCents = pickup ? 0 : r.deliveryFeeCents
  const smallOrderFeeCents = itemCents < SMALL_ORDER_THRESHOLD_CENTS ? r.smallOrderFeeCents : 0
  const serviceFeeCents = lineCents(itemCents, SERVICE_FEE_BPS)
  const taxCents = lineCents(itemCents, r.taxRateBps)
  const tipCents = lineCents(itemCents, TIP_BPS)
  return {
    itemCents,
    deliveryFeeCents,
    smallOrderFeeCents,
    serviceFeeCents,
    taxCents,
    tipCents,
    totalCents:
      itemCents + deliveryFeeCents + smallOrderFeeCents + serviceFeeCents + taxCents + tipCents,
    taxRateBps: r.taxRateBps,
  }
}

export function toSummary(r: Restaurant): RestaurantSummary {
  const { menu: _menu, deliveryFeeCents: _d, smallOrderFeeCents: _s, taxRateBps: _t, ...summary } = r
  return summary
}
