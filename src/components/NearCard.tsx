import { formatCents, formatMiles } from '../../shared/format'
import type { NearCard as Near } from '../../shared/types'
import { FoodTile } from './FoodTile'

// A close meal that misses one or more filters. The miss tag says by how much.
export function NearCard({ card, onOpen, onPrice }: { card: Near; onOpen: () => void; onPrice: () => void }) {
  const { restaurant: r, item, price, miss } = card
  return (
    <article className="near" data-testid="near-card" onClick={onOpen}>
      <FoodTile kind={item.photo} size="thumb" />
      <div className="near-body">
        <button className="meal-name">{item.name}</button>
        <div className="near-line">
          {r.name} · {r.etaMin} min · {formatMiles(r.distanceMi)}
        </div>
        <button
          className="meal-price"
          onClick={(e) => {
            e.stopPropagation()
            onPrice()
          }}
        >
          Est. <b>{formatCents(price.totalCents)}</b> all-in
        </button>
        <span className="miss-tag" data-testid="miss-tag">
          {miss.map((m) => m.label).join(' · ')}
        </span>
      </div>
    </article>
  )
}
