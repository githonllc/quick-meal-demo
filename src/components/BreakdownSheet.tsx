import { formatCents, formatPercentBps } from '../../shared/format'
import type { MenuItem, PriceBreakdown } from '../../shared/types'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

// Shows how the estimated all-in price adds up, line by line.
// Pickup has no delivery fee, so it has no delivery fee line (design P4).
export function BreakdownSheet({
  item,
  restaurantName,
  price,
  pickup,
  onClose,
}: {
  item: MenuItem
  restaurantName: string
  price: PriceBreakdown
  pickup: boolean
  onClose: () => void
}) {
  const { show } = useToast()
  const rows = [
    { id: 'item', label: item.name, cents: price.itemCents },
    { id: 'delivery', label: 'Delivery fee', cents: price.deliveryFeeCents },
    { id: 'small', label: 'Small-order fee (food under $12)', cents: price.smallOrderFeeCents },
    { id: 'service', label: 'Service fee (15%)', cents: price.serviceFeeCents },
    { id: 'tax', label: `Tax (${formatPercentBps(price.taxRateBps)})`, cents: price.taxCents },
    { id: 'tip', label: 'Tip (15%)', cents: price.tipCents },
  ].filter((row) => !(pickup && row.id === 'delivery'))

  return (
    <Sheet title={item.name} subtitle={restaurantName} testId="breakdown-sheet" onClose={onClose}>
      <h3 className="bd-head">Estimated all-in price</h3>
      <div className="bd-rows">
        {rows.map((row) => (
          <div
            key={row.id}
            className={row.id === 'small' && row.cents > 0 ? 'bd-row hot' : 'bd-row'}
            data-testid={`breakdown-row-${row.id}`}
          >
            <span>{row.label}</span>
            <span>{formatCents(row.cents)}</span>
          </div>
        ))}
        <div className="bd-row bd-total" data-testid="breakdown-total">
          <span>Est. all-in</span>
          <span>{formatCents(price.totalCents)}</span>
        </div>
      </div>
      <p className="bd-note">Tip is 15% by default. The final price is shown at checkout.</p>
      <button className="sheet-go" onClick={() => show('Cart is not part of this demo.')}>
        Add to cart · Est. {formatCents(price.totalCents)}
      </button>
    </Sheet>
  )
}
