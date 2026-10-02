import { priceItem, toSummary } from './pricing'
import type { MenuRow, MenuView, Restaurant, SortId } from './types'

// Plain code-unit order, so results are the same in every runtime and locale.
export function compareIds(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function byId(a: MenuRow, b: MenuRow): number {
  return compareIds(a.item.id, b.item.id)
}

// Lowest price sorts by total. Every other sort shows the most liked first.
function compareItems(sort: SortId) {
  return (a: MenuRow, b: MenuRow): number => {
    if (sort === 'price') return a.price.totalCents - b.price.totalCents || byId(a, b)
    return b.item.likePct - a.item.likePct || byId(a, b)
  }
}

// pickup prices every row without the delivery fee.
export function menuView(r: Restaurant, budgetCents: number | null, sort: SortId, pickup = false): MenuView {
  const rows: MenuRow[] = r.menu.map((item) => ({ item, price: priceItem(item, r, pickup), overCents: 0 }))
  rows.sort(compareItems(sort))

  if (budgetCents === null) {
    return { restaurant: toSummary(r), budgetCents, sort, pickup, fits: rows, over: [] }
  }

  // A meal fits when its total is at or under the budget.
  const fits = rows.filter((row) => row.price.totalCents <= budgetCents)
  const over = rows
    .filter((row) => row.price.totalCents > budgetCents)
    .map((row) => ({ ...row, overCents: row.price.totalCents - budgetCents }))
    .sort((a, b) => a.overCents - b.overCents || byId(a, b))

  return { restaurant: toSummary(r), budgetCents, sort, pickup, fits, over }
}
