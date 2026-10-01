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

// Sheet behind the Time or Distance chip. A tap applies at once, so there is no button.
export function StepSheet<T extends number>({
  kind,
  steps,
  value,
  onPick,
  onClose,
}: {
  kind: 'time' | 'distance'
  steps: readonly T[]
  value: T | null
  onPick: (v: T | null) => void
  onClose: () => void
}) {
  return (
    <Sheet title={kind === 'time' ? 'Delivery time' : 'Distance'} testId={`sheet-${kind}`} onClose={onClose}>
      <div className="grp">
        <Steps name={kind} steps={steps} value={value} onPick={onPick} />
      </div>
    </Sheet>
  )
}
