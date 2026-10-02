import { useState } from 'react'
import { PICKUP_SORT_IDS, SORTS } from '../../shared/constants'
import { toSide } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { BudgetSlider } from './BudgetSlider'
import { Sheet } from './Sheet'
import { SpeedPicker } from './StepSheet'

// Delivery shows every sort. Pickup cards show no time, so Pickup has no Fastest (design P2).
const PICKUP_SORTS = PICKUP_SORT_IDS.map((id) => SORTS.find((s) => s.id === id)!)

export function ApplyButton({ onClick, text = 'Show results' }: { onClick: () => void; text?: string }) {
  return (
    <button className="sheet-go" data-testid="sheet-apply" onClick={onClick}>
      {text}
    </button>
  )
}

// The full sheet. It edits a draft; nothing changes on the list until "Show results".
// The Delivery | Pickup switch is sheet state only: an applied distance means Pickup.
export function FiltersSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: UiFilters
  onApply: (f: UiFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
  const [pickup, setPickup] = useState(filters.distance !== null)
  const set = (patch: Partial<UiFilters>) => setDraft((d) => ({ ...d, ...patch }))
  // Switching sides clears the other side's step in the draft.
  const switchSide = (p: boolean) => {
    setPickup(p)
    setDraft((d) => toSide(d, p))
  }

  return (
    <Sheet title="Filters" testId="sheet-filters" onClose={onClose}>
      <div className="grp">
        <h3>Get it by</h3>
        <SpeedPicker pickup={pickup} filters={draft} onSide={switchSide} onPick={setDraft} />
      </div>
      <div className="grp">
        <h3>Budget per meal</h3>
        <p className="grp-help">Estimated all-in: food, fees, tax and tip</p>
        <BudgetSlider value={draft.budget} onChange={(budget) => set({ budget })} />
      </div>
      <div className="grp">
        <h3>Sort by</h3>
        <div className="opts two">
          {(pickup ? PICKUP_SORTS : SORTS).map((s) => (
            <button
              key={s.id}
              className={s.id === draft.sort ? 'opt on' : 'opt'}
              aria-pressed={s.id === draft.sort}
              data-testid={`sort-${s.id}`}
              onClick={() => set({ sort: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="sheet-foot">
        <button
          className="sheet-clear"
          data-testid="sheet-clear"
          onClick={() => {
            setPickup(false)
            set({ budget: null, time: null, distance: null, sort: 'fastest' })
          }}
        >
          Clear all
        </button>
        <ApplyButton onClick={() => onApply(draft)} />
      </div>
    </Sheet>
  )
}
