import { formatCents } from '../../shared/format'
import type { MenuRow as Row } from '../../shared/types'
import { FoodTile } from './FoodTile'

function ThumbsUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z" />
    </svg>
  )
}

// One dish. tag is "fits" or "over" with a budget, null without one.
// Tapping the row or the est. price opens the breakdown.
export function MenuRow({
  row,
  tag,
  onPrice,
}: {
  row: Row
  tag: 'fits' | 'over' | null
  onPrice: () => void
}) {
  const { item, price, overCents } = row
  return (
    <div className="menu-row" data-testid="menu-row" onClick={onPrice}>
      <FoodTile kind={item.photo} size="thumb" />
      <div className="menu-info">
        <b className="menu-dish">{item.name}</b>
        <span className="menu-like">
          <ThumbsUp />
          {item.likePct}%
        </span>
      </div>
      <div className="menu-right">
        <span className="menu-price">{formatCents(item.priceCents)}</span>
        <button
          className="menu-est"
          data-testid="menu-est"
          onClick={(e) => {
            e.stopPropagation()
            onPrice()
          }}
        >
          Est. <b>{formatCents(price.totalCents)}</b>
        </button>
        {tag === 'fits' && <span className="menu-tag fits">Fits</span>}
        {tag === 'over' && <span className="menu-tag over">{formatCents(overCents)} over</span>}
      </div>
    </div>
  )
}
