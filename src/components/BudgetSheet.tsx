import { useState } from 'react'
import type { UiFilters } from '../state/filters'
import { BudgetSlider } from './BudgetSlider'
import { ApplyButton, useLiveCount } from './FiltersSheet'
import { Sheet } from './Sheet'

// Sheet behind the Budget chip. A drag only moves the draft; the button applies it.
export function BudgetSheet({
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
  return (
    <Sheet
      title="Budget per meal"
      subtitle="Estimated all-in: food, fees, tax and tip"
      testId="sheet-budget"
      onClose={onClose}
    >
      <div className="grp">
        <BudgetSlider value={draft.budget} onChange={(budget) => setDraft((d) => ({ ...d, budget }))} />
      </div>
      <ApplyButton count={count} onClick={() => onApply(draft)} />
    </Sheet>
  )
}
