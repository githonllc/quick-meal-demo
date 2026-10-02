import { useState } from 'react'
import { DISTANCE_STEPS, TIME_STEPS } from '../../shared/constants'
import { formatMiles } from '../../shared/format'
import { toSide } from '../state/filters'
import type { UiFilters } from '../state/filters'
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

// The Delivery | Pickup switch and the steps of the selected side (design P7).
// Delivery asks for time, Pickup for distance, so only one of the two can be on.
export function SpeedPicker({
  pickup,
  filters,
  onSide,
  onPick,
}: {
  pickup: boolean
  filters: UiFilters
  onSide: (pickup: boolean) => void
  onPick: (f: UiFilters) => void
}) {
  const sides = [
    { pickup: false, label: 'Delivery' },
    { pickup: true, label: 'Pickup' },
  ]
  return (
    <>
      <div className="seg" role="radiogroup" aria-label="Delivery or pickup">
        {sides.map((s) => (
          <button
            key={s.label}
            role="radio"
            aria-checked={s.pickup === pickup}
            className={s.pickup === pickup ? 'seg-opt on' : 'seg-opt'}
            data-testid={`side-${s.label.toLowerCase()}`}
            onClick={() => onSide(s.pickup)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {pickup ? (
        <>
          <p className="grp-q">How far can you go?</p>
          <Steps
            name="distance"
            steps={DISTANCE_STEPS}
            value={filters.distance}
            onPick={(distance) => onPick({ ...filters, time: null, distance })}
          />
        </>
      ) : (
        <>
          <p className="grp-q">How much time do you have?</p>
          <p className="grp-help">Estimated arrival within this window. Not guaranteed.</p>
          <Steps
            name="time"
            steps={TIME_STEPS}
            value={filters.time}
            onPick={(time) => onPick({ ...filters, distance: null, time })}
          />
        </>
      )}
    </>
  )
}

// Sheet behind the Time chip. A step applies at once, so there is no button.
// Flipping the switch alone applies nothing: Pickup with no distance is no filter.
// After a flip no step is picked, on either side (design: "Switching back shows the time steps with none picked").
export function StepSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: UiFilters
  onApply: (f: UiFilters) => void
  onClose: () => void
}) {
  const [pickup, setPickup] = useState(filters.distance !== null)
  const [draft, setDraft] = useState(filters)
  const switchSide = (p: boolean) => {
    if (p === pickup) return
    setPickup(p)
    setDraft((d) => ({ ...toSide(d, p), time: null, distance: null }))
  }
  return (
    <Sheet title="Get it by" testId="sheet-time" onClose={onClose}>
      <div className="grp">
        <SpeedPicker pickup={pickup} filters={draft} onSide={switchSide} onPick={onApply} />
      </div>
    </Sheet>
  )
}
