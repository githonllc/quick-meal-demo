import type { CSSProperties } from 'react'
import { BUDGET_MAX, BUDGET_MIN } from '../../shared/constants'
import { formatDollars } from '../../shared/format'

// Native range input. The far right ($40) means "any budget", stored as null.
export function BudgetSlider({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const v = value ?? BUDGET_MAX
  const fill = `${((v - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`
  const text = value === null ? 'Any budget' : `Up to ${formatDollars(value)}`
  return (
    <div className="slider">
      <p className="slider-val">
        {value === null ? (
          'Any budget'
        ) : (
          <>
            Up to <b>{formatDollars(value)}</b>
          </>
        )}
      </p>
      <input
        type="range"
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={1}
        value={v}
        aria-label="Budget per meal"
        aria-valuetext={text}
        data-testid="budget-slider"
        style={{ '--fill': fill, touchAction: 'pan-x' } as CSSProperties}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(n >= BUDGET_MAX ? null : n)
        }}
      />
      <div className="slider-ends">
        <span>$10</span>
        <span>$40+ (any)</span>
      </div>
    </div>
  )
}
