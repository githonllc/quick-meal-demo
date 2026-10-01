import { useState } from 'react'
import type { UiFilters } from '../state/filters'
import { BudgetSlider } from './BudgetSlider'
import { ApplyButton, useLiveCount } from './FiltersSheet'
import { Sheet } from './Sheet'

// The apply button with the live result count. Only the list page needs the count.
function CountedApply({ draft, total, onClick }: { draft: UiFilters; total: number | null; onClick: () => void }) {
  return <ApplyButton count={useLiveCount(draft, total)} onClick={onClick} />
}

// Sheet behind the Budget chip. A drag only moves the draft; the button applies it.
export function BudgetSheet({
  filters,
  total,
  applyText,
  onApply,
  onClose,
}: {
  filters: UiFilters
  total: number | null
  applyText?: string // a fixed button label; the sheet then skips the live count
  onApply: (f: UiFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
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
      {applyText ? (
        <button className="sheet-go" data-testid="sheet-apply" onClick={() => onApply(draft)}>
          {applyText}
        </button>
      ) : (
        <CountedApply draft={draft} total={total} onClick={() => onApply(draft)} />
      )}
    </Sheet>
  )
}
