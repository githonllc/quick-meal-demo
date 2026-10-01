import { useEffect, useState } from 'react'
import { DISTANCE_STEPS, SORTS, TIME_STEPS } from '../../shared/constants'
import { pluralize } from '../../shared/format'
import { searchMeals } from '../api'
import { toQuery } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { BudgetSlider } from './BudgetSlider'
import { Sheet } from './Sheet'
import { Steps } from './StepSheet'

// The result count for a draft, so "Show N results" matches the cards the user will see.
// Waits 150 ms after the last change and aborts older requests.
// Keeps the last number while a request is pending or when it fails.
export function useLiveCount(draft: UiFilters, seed: number | null): number | null {
  const [count, setCount] = useState(seed)
  const key = toQuery(draft)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchMeals(new URLSearchParams(key), controller.signal)
        .then((res) => setCount(res.total))
        .catch(() => {})
    }, 150)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [key])
  return count
}

export function ApplyButton({ count, onClick }: { count: number | null; onClick: () => void }) {
  return (
    <button className="sheet-go" data-testid="sheet-apply" onClick={onClick}>
      {count === null ? 'Show results' : `Show ${pluralize(count, 'result', 'results')}`}
    </button>
  )
}

// The full sheet. It edits a draft; nothing changes on the list until "Show N results".
export function FiltersSheet({
  filters,
  total,
  onApply,
  onClose,
}: {
  filters: UiFilters
  total: number | null
  onApply: (f: UiFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
  const count = useLiveCount(draft, total)
  const set = (patch: Partial<UiFilters>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Sheet title="Filters" testId="sheet-filters" onClose={onClose}>
      <div className="grp">
        <h3>Budget per meal</h3>
        <p className="grp-help">Estimated all-in: food, fees, tax and tip</p>
        <BudgetSlider value={draft.budget} onChange={(budget) => set({ budget })} />
      </div>
      <div className="grp">
        <h3>Delivery time</h3>
        <Steps name="time" steps={TIME_STEPS} value={draft.time} onPick={(time) => set({ time })} />
      </div>
      <div className="grp">
        <h3>Distance</h3>
        <Steps name="distance" steps={DISTANCE_STEPS} value={draft.distance} onPick={(distance) => set({ distance })} />
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
        <ApplyButton count={count} onClick={() => onApply(draft)} />
      </div>
    </Sheet>
  )
}
