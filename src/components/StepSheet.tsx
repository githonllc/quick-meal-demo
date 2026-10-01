import { formatMiles } from '../../shared/format'
import { Sheet } from './Sheet'

// A row of step buttons. Tapping the selected step clears it (null).
export function Steps<T extends number>({
  name,
  steps,
  value,
  onPick,
}: {
  name: 'time' | 'distance'
  steps: readonly T[]
  value: T | null
  onPick: (v: T | null) => void
}) {
  return (
    <div className="opts">
      {steps.map((s) => (
        <button
          key={s}
          className={s === value ? 'opt on' : 'opt'}
          aria-pressed={s === value}
          data-testid={`step-${name}-${s}`}
          onClick={() => onPick(s === value ? null : s)}
        >
          {name === 'time' ? `${s} min` : formatMiles(s)}
        </button>
      ))}
    </div>
  )
}

// Sheet behind the Time chip. A tap applies at once, so there is no button.
export function StepSheet<T extends number>({
  steps,
  value,
  onPick,
  onClose,
}: {
  steps: readonly T[]
  value: T | null
  onPick: (v: T | null) => void
  onClose: () => void
}) {
  return (
    <Sheet title="How much time do you have?" testId="sheet-time" onClose={onClose}>
      <div className="grp">
        <p className="grp-help">Estimated arrival within this window. Not guaranteed.</p>
        <Steps name="time" steps={steps} value={value} onPick={onPick} />
      </div>
    </Sheet>
  )
}
