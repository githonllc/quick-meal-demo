import { useState } from 'react'
import { DISTANCE_STEPS, SORTS, TIME_STEPS } from '../../shared/constants'
import type { UiFilters } from '../state/filters'
import { BudgetSlider } from './BudgetSlider'
import { Sheet } from './Sheet'
import { Steps } from './StepSheet'

export function ApplyButton({ onClick, text = 'Show results' }: { onClick: () => void; text?: string }) {
  return (
    <button className="sheet-go" data-testid="sheet-apply" onClick={onClick}>
      {text}
    </button>
  )
}

// The full sheet. It edits a draft; nothing changes on the list until "Show results".
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
  const set = (patch: Partial<UiFilters>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Sheet title="Filters" testId="sheet-filters" onClose={onClose}>
      <div className="grp">
        <h3>How much time do you have?</h3>
        <p className="grp-help">Estimated arrival within this window. Not guaranteed.</p>
        <Steps name="time" steps={TIME_STEPS} value={draft.time} onPick={(time) => set({ time })} />
      </div>
      <div className="grp">
        <h3>Distance</h3>
        <p className="grp-help">For pickup</p>
        <Steps name="distance" steps={DISTANCE_STEPS} value={draft.distance} onPick={(distance) => set({ distance })} />
      </div>
      <div className="grp">
        <h3>Budget per meal</h3>
        <p className="grp-help">Estimated all-in: food, fees, tax and tip</p>
        <BudgetSlider value={draft.budget} onChange={(budget) => set({ budget })} />
      </div>
      <div className="grp">
        <h3>Sort by</h3>
        <div className="opts two">
          {SORTS.map((s) => (
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
          onClick={() => set({ budget: null, time: null, distance: null, sort: 'best' })}
        >
          Clear all
        </button>
        <ApplyButton onClick={() => onApply(draft)} />
      </div>
    </Sheet>
  )
}
