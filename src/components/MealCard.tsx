import { formatCents, formatCount, formatDollars, formatMiles } from '../../shared/format'
import type { MealCard as Meal } from '../../shared/types'
import { FoodTile } from './FoodTile'

function ThumbsUp() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z" />
    </svg>
  )
}

// One meal per place. Tapping the card opens the menu; tapping the price opens the breakdown.
export function MealCard({
  card,
  budget,
  onOpen,
  onPrice,
}: {
  card: Meal
  budget: number | null
  onOpen: () => void
  onPrice: () => void
}) {
  const { restaurant: r, item, price, moreCount, moreNames } = card
  const more =
    budget === null
      ? `+${moreCount} more on the menu ›`
      : `+${moreCount} more under ${formatDollars(budget)}: ${moreNames.join(', ')} ›`

  return (
    <article className="meal" data-testid="meal-card" onClick={onOpen}>
      <FoodTile kind={item.photo} size="card" />
      <div className="meal-row">
        {/* A real button so the card can be opened with the keyboard. The click bubbles up. */}
        <button className="meal-name">{item.name}</button>
        <span className="meal-like">
          <ThumbsUp />
          {item.likePct}% ({item.likeCount})
        </span>
      </div>
      <div className="meal-rest">
        {r.name}{' '}
        <span>
          · {r.rating.toFixed(1)} ★ ({formatCount(r.ratingCount)})
        </span>
      </div>
      <div className="meal-row">
        <span className="meal-meta">
          <button
            className="meal-price"
            data-testid="meal-price"
            onClick={(e) => {
              e.stopPropagation()
              onPrice()
            }}
          >
            Est. <b>{formatCents(price.totalCents)}</b> all-in
          </button>{' '}
          · {r.etaMin} min · {formatMiles(r.distanceMi)}
        </span>
        {budget !== null && <span className="fits">Fits</span>}
      </div>
      {moreCount > 0 && (
        <button className="meal-more" data-testid="meal-more">
          {more}
        </button>
      )}
    </article>
  )
}
