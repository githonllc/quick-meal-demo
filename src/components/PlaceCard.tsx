import { formatCount, formatDollars, formatEtaRange, formatMiles } from '../../shared/format'
import type { MealCard as Meal } from '../../shared/types'
import { FoodTile } from './FoodTile'

// One restaurant per card, with no price: the menu has the prices. Tapping anywhere opens the menu.
// The restaurant-cards layout of the demo settings.
export function PlaceCard({
  card,
  budget,
  pickup,
  onOpen,
}: {
  card: Meal
  budget: number | null
  pickup: boolean
  onOpen: () => void
}) {
  const { restaurant: r, item, moreCount, moreNames } = card
  // Every dish that fits, the lead meal first, in the sort order. Without a budget, all of them fit.
  const count = moreCount + 1
  const dishes =
    budget === null
      ? `${count} on the menu`
      : `${count} under ${formatDollars(budget)}: ${[item.name, ...moreNames].join(', ')}`

  return (
    <article className="meal" data-testid="meal-card" onClick={onOpen}>
      <FoodTile kind={r.heroPhoto} size="card" />
      <div className="meal-row">
        {/* A real button so the card can be opened with the keyboard. The click bubbles up. */}
        <button className="meal-name">{r.name}</button>
        <span className="meal-rating">
          {r.rating.toFixed(1)} ★ ({formatCount(r.ratingCount)})
        </span>
      </div>
      {/* Pickup drops the time: it is a delivery time (design P5). */}
      <p className="meal-meta" data-testid="meal-meta">
        {pickup ? formatMiles(r.distanceMi) : `Est. ${formatEtaRange(r.etaMin)} · ${formatMiles(r.distanceMi)}`}
      </p>
      <button className="meal-more" data-testid="meal-more">
        <span>{dishes}</span>
        {' ›'}
      </button>
    </article>
  )
}
