import { useState } from 'react'
import { SORTS } from '../../shared/constants'
import { useConfig } from '../state/config'
import { toSide } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { sortIds } from '../state/sorts'
import { BudgetSlider } from './BudgetSlider'
import { Sheet } from './Sheet'
import { SpeedPicker } from './StepSheet'

// Every filter sheet ends with Clear and Show results. Clear only resets the draft;
// nothing changes on the list until the user applies.
export function SheetFoot({
  clearText = 'Clear',
  applyText = 'Show results',
  onClear,
  onApply,
}: {
  clearText?: string
  applyText?: string
  onClear: () => void
  onApply: () => void
}) {
  return (
    <div className="sheet-foot">
      <button className="sheet-clear" data-testid="sheet-clear" onClick={onClear}>
        {clearText}
      </button>
      <button className="sheet-go" data-testid="sheet-apply" onClick={onApply}>
        {applyText}
      </button>
    </div>
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
  const { layout } = useConfig()
  const [draft, setDraft] = useState(filters)
  const [pickup, setPickup] = useState(filters.distance !== null)
  const set = (patch: Partial<UiFilters>) => setDraft((d) => ({ ...d, ...patch }))
  // Switching sides clears the other side's step in the draft.
  const switchSide = (p: boolean) => {
    if (p === pickup) return
    setPickup(p)
    setDraft((d) => toSide(d, p, layout))
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
        <div className="opts three">
          {/* Each side and layout shows the 3 sorts its cards have numbers for (design P2). */}
          {sortIds(pickup, layout).map((id) => (
            <button
              key={id}
              className={id === draft.sort ? 'opt on' : 'opt'}
              aria-pressed={id === draft.sort}
              data-testid={`sort-${id}`}
              onClick={() => set({ sort: id })}
            >
              {SORTS.find((s) => s.id === id)?.label}
            </button>
          ))}
        </div>
      </div>
      <SheetFoot
        clearText="Clear all"
        onClear={() => {
          setPickup(false)
          set({ budget: null, time: null, distance: null, sort: 'fastest' })
        }}
        onApply={() => onApply(draft)}
      />
    </Sheet>
  )
}
