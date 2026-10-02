import { formatCents, formatEtaRange, formatMiles } from '../../shared/format'
import type { NearCard as Near } from '../../shared/types'
import { FoodTile } from './FoodTile'

// A close meal that misses one or more filters. The miss tag says by how much.
export function NearCard({
  card,
  pickup,
  onOpen,
  onPrice,
}: {
  card: Near
  pickup: boolean
  onOpen: () => void
  onPrice: () => void
}) {
  const { restaurant: r, item, price, miss } = card
  return (
    <article className="near" data-testid="near-card" onClick={onOpen}>
      <FoodTile kind={item.photo} size="thumb" />
      <div className="near-body">
        <button className="meal-name">{item.name}</button>
        <div className="near-line">{r.name}</div>
        <div className="near-line near-est">
          {pickup ? `${formatMiles(r.distanceMi)} · Est.` : `Est. ${formatEtaRange(r.etaMin)} · ${formatMiles(r.distanceMi)} ·`}{' '}
          <button
            className="meal-price"
            onClick={(e) => {
              e.stopPropagation()
              onPrice()
            }}
          >
            {formatCents(price.totalCents)} all-in
          </button>
        </div>
        <span className="miss-tag" data-testid="miss-tag">
          {miss.map((m) => m.label).join(' · ')}
        </span>
      </div>
    </article>
  )
}
