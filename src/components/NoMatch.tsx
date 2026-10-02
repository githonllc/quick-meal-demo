import type { NearCard as Near, Relax } from '../../shared/types'
import type { UiFilters } from '../state/filters'
import { describeFilters } from '../state/noMatchCopy'
import { NearCard } from './NearCard'

// Shown when nothing fits: say why, offer one-tap relax chips, list the closest meals.
export function NoMatch({
  filters,
  pickup,
  near,
  relax,
  onRelax,
  onOpen,
  onPrice,
}: {
  filters: UiFilters
  pickup: boolean
  near: Near[]
  relax: Relax[]
  onRelax: (r: Relax) => void
  onOpen: (card: Near) => void
  onPrice: (card: Near) => void
}) {
  return (
    <>
      <div className="no-match" data-testid="no-match">
        <b>No exact matches</b>
        <p>{describeFilters(filters)}</p>
        <div className="relax-chips">
          {relax.map((r) => (
            <button key={r.filter} className="relax-chip" data-testid="relax-chip" onClick={() => onRelax(r)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {near.length > 0 && (
        <>
          <h2 className="near-head">Closest to your search</h2>
          {near.map((card) => (
            <NearCard
              key={card.restaurant.id}
              card={card}
              pickup={pickup}
              onOpen={() => onOpen(card)}
              onPrice={() => onPrice(card)}
            />
          ))}
        </>
      )}
    </>
  )
}
