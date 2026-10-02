import {
  BUDGET_MAX,
  DISTANCE_STEPS,
  NEAR_LIMIT,
  SCORE_BUDGET_CENTS,
  SCORE_DISTANCE_MI,
  SCORE_TIME_MIN,
  TIME_STEPS,
} from './constants'
import { formatCents, formatDollars, formatMiles, pluralize } from './format'
import { compareIds, menuView } from './menu'
import { priceItem, toSummary } from './pricing'
import type {
  Filters,
  MealCard,
  MenuItem,
  Miss,
  NearCard,
  PriceBreakdown,
  Relax,
  Restaurant,
  SearchResponse,
  SortId,
} from './types'

export function search(restaurants: Restaurant[], f: Filters): SearchResponse {
  const exact = exactCards(restaurants, f)
  // Near and relax are only for the "no results" screen.
  if (exact.length > 0) {
    return { filters: f, total: exact.length, exact, near: [], relax: [] }
  }
  const near = nearCards(restaurants, f)
  const relax = relaxOptions(restaurants, f, near)
  return { filters: f, total: 0, exact, near, relax }
}

// ---------- Exact ----------

// A distance filter means pickup: prices have no delivery fee (design P7).
function isPickup(f: Filters): boolean {
  return f.distanceMi !== null
}

// Time, distance and cuisine are about the place. Budget is about the meal.
function passesPlace(r: Restaurant, f: Filters): boolean {
  return (
    r.isOpen &&
    (f.timeMin === null || r.etaMin <= f.timeMin) &&
    (f.distanceMi === null || r.distanceMi <= f.distanceMi) &&
    (f.cuisine === null || r.cuisines.includes(f.cuisine))
  )
}

function exactCards(restaurants: Restaurant[], f: Filters): MealCard[] {
  const cards: MealCard[] = []
  for (const r of restaurants) {
    if (!passesPlace(r, f)) continue
    // The lead meal is the top meal of the menu page, so both screens agree.
    const v = menuView(r, f.budgetCents, f.sort, isPickup(f))
    if (v.fits.length === 0) continue
    cards.push({
      restaurant: v.restaurant,
      item: v.fits[0].item,
      price: v.fits[0].price,
      moreCount: v.fits.length - 1,
      moreNames: v.fits.slice(1).map((row) => row.item.name),
    })
  }
  return cards.sort(compareCards(f.sort))
}

function compareCards(sort: SortId) {
  return (a: MealCard, b: MealCard): number => {
    const ra = a.restaurant
    const rb = b.restaurant
    const byId = compareIds(ra.id, rb.id)
    switch (sort) {
      case 'rated':
        return (
          rb.rating - ra.rating ||
          rb.ratingCount - ra.ratingCount ||
          ra.etaMin - rb.etaMin ||
          byId
        )
      case 'price':
        return a.price.totalCents - b.price.totalCents || byId
      case 'fastest':
        return ra.etaMin - rb.etaMin || byId
      case 'nearest':
        return ra.distanceMi - rb.distanceMi || byId
    }
  }
}

// ---------- Near ----------

function round1(x: number): number {
  return Math.round(x * 10) / 10
}

// What one meal misses, in the order budget, time, distance.
function missesFor(r: Restaurant, price: PriceBreakdown, f: Filters): Miss[] {
  const misses: Miss[] = []
  if (f.budgetCents !== null) {
    const over = price.totalCents - f.budgetCents
    if (over > 0) misses.push({ filter: 'budget', over, label: `${formatCents(over)} over budget` })
  }
  if (f.timeMin !== null) {
    const over = r.etaMin - f.timeMin
    if (over > 0) misses.push({ filter: 'time', over, label: `${over} min slower` })
  }
  if (f.distanceMi !== null) {
    const over = round1(r.distanceMi - f.distanceMi)
    if (over > 0) misses.push({ filter: 'distance', over, label: `${over.toFixed(1)} mi farther` })
  }
  return misses
}

// One point per $5 over, per 10 min slower, or per 1 mi farther.
const SCORE_UNIT = { budget: SCORE_BUDGET_CENTS, time: SCORE_TIME_MIN, distance: SCORE_DISTANCE_MI }

function scoreOf(misses: Miss[]): number {
  let score = 0
  for (const m of misses) score += m.over / SCORE_UNIT[m.filter]
  return score
}

// Lower score first, then the cheaper meal, then item id.
function isCloser(a: NearCard, b: NearCard): boolean {
  if (a.score !== b.score) return a.score < b.score
  if (a.price.totalCents !== b.price.totalCents) return a.price.totalCents < b.price.totalCents
  return compareIds(a.item.id, b.item.id) < 0
}

function nearCardFor(r: Restaurant, item: MenuItem, f: Filters): NearCard {
  const price = priceItem(item, r, isPickup(f))
  const miss = missesFor(r, price, f)
  return { restaurant: toSummary(r), item, price, moreCount: 0, moreNames: [], miss, score: scoreOf(miss) }
}

// The closest meal of one restaurant, or null if it has no menu.
function bestNearCard(r: Restaurant, f: Filters): NearCard | null {
  let best: NearCard | null = null
  for (const item of r.menu) {
    const card = nearCardFor(r, item, f)
    if (best === null || isCloser(card, best)) best = card
  }
  return best
}

function nearCards(restaurants: Restaurant[], f: Filters): NearCard[] {
  const cards: NearCard[] = []
  for (const r of restaurants) {
    // Cuisine is never relaxed: a near meal must still be the cuisine asked for.
    if (!r.isOpen) continue
    if (f.cuisine !== null && !r.cuisines.includes(f.cuisine)) continue
    const best = bestNearCard(r, f)
    // A score of 0 would be an exact match; guard it anyway.
    if (best !== null && best.score > 0) cards.push(best)
  }
  cards.sort((a, b) => a.score - b.score || compareIds(a.restaurant.id, b.restaurant.id))
  return cards.slice(0, NEAR_LIMIT)
}

// ---------- Relax ----------

function countExact(restaurants: Restaurant[], f: Filters): number {
  return exactCards(restaurants, f).length
}

function results(count: number): string {
  return pluralize(count, 'result', 'results')
}

function relaxOptions(restaurants: Restaurant[], f: Filters, near: NearCard[]): Relax[] {
  const options = [
    relaxBudget(restaurants, f),
    relaxTime(restaurants, f),
    relaxDistance(restaurants, f),
    near.length === 0 ? relaxCuisine(restaurants, f) : null,
  ]
  // Only offer a change that gives at least one result.
  return options.filter((o): o is Relax => o !== null && o.count >= 1)
}

// The new budget is the cheapest meal that passes the other filters, rounded up to whole dollars.
function relaxBudget(restaurants: Restaurant[], f: Filters): Relax | null {
  if (f.budgetCents === null) return null
  let cheapest = Infinity
  for (const r of restaurants) {
    if (!passesPlace(r, f)) continue
    for (const item of r.menu) cheapest = Math.min(cheapest, priceItem(item, r, isPickup(f)).totalCents)
  }
  if (cheapest === Infinity) return null

  const to = Math.ceil(cheapest / 100)
  // The slider's top value means "any budget", so from there up we offer to remove it.
  if (to >= BUDGET_MAX) {
    const count = countExact(restaurants, { ...f, budgetCents: null })
    return { filter: 'budget', to: null, count, label: `Remove budget · ${results(count)}` }
  }
  const count = countExact(restaurants, { ...f, budgetCents: to * 100 })
  return { filter: 'budget', to, count, label: `Budget up to ${formatDollars(to)} · ${results(count)}` }
}

// The first step above the current value that gives a result.
// If no step helps, step is null: remove the filter.
function firstStep<T extends number>(
  steps: readonly T[],
  current: number,
  countAt: (step: T | null) => number,
): { to: T | null; count: number } {
  for (const step of steps) {
    if (step <= current) continue
    const count = countAt(step)
    if (count >= 1) return { to: step, count }
  }
  return { to: null, count: countAt(null) }
}

function relaxTime(restaurants: Restaurant[], f: Filters): Relax | null {
  if (f.timeMin === null) return null
  const { to, count } = firstStep(TIME_STEPS, f.timeMin, (timeMin) =>
    countExact(restaurants, { ...f, timeMin }),
  )
  const text = to === null ? 'Remove time' : `Time up to ${to} min`
  return { filter: 'time', to, count, label: `${text} · ${results(count)}` }
}

function relaxDistance(restaurants: Restaurant[], f: Filters): Relax | null {
  if (f.distanceMi === null) return null
  const { to, count } = firstStep(DISTANCE_STEPS, f.distanceMi, (distanceMi) =>
    countExact(restaurants, { ...f, distanceMi }),
  )
  const text = to === null ? 'Remove distance' : `Distance up to ${formatMiles(to)}`
  return { filter: 'distance', to, count, label: `${text} · ${results(count)}` }
}

function relaxCuisine(restaurants: Restaurant[], f: Filters): Relax | null {
  if (f.cuisine === null) return null
  const count = countExact(restaurants, { ...f, cuisine: null })
  return { filter: 'cuisine', to: null, count, label: `All cuisines · ${results(count)}` }
}
