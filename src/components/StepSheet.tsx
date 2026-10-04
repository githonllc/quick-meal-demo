import { useState } from 'react'
import { DISTANCE_STEPS, TIME_STEPS } from '../../shared/constants'
import { formatMiles } from '../../shared/format'
import { toSide } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { ApplyButton } from './FiltersSheet'
import { Sheet } from './Sheet'
import { StepSlider } from './StepSlider'

// The Delivery | Pickup switch and the slider of the selected side (design P7).
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
          <StepSlider
            stops={DISTANCE_STEPS}
            value={filters.distance}
            label="How far can you go?"
            any="Any distance"
            show={(m) => (
              <>
                Within <b>{formatMiles(m)}</b>
              </>
            )}
            say={(m) => (m === 1 ? '1 mile' : `${m} miles`)}
            testId="distance-slider"
            onChange={(distance) => onPick({ ...filters, time: null, distance })}
          />
        </>
      ) : (
        <>
          <p className="grp-q">How much time do you have?</p>
          <p className="grp-help">Estimated arrival within this window. Not guaranteed.</p>
          <StepSlider
            stops={TIME_STEPS}
            value={filters.time}
            label="How much time do you have?"
            any="Any time"
            show={(t) => (
              <>
                Up to <b>{t} min</b>
              </>
            )}
            say={(t) => `${t} minutes`}
            testId="time-slider"
            ends={[`${TIME_STEPS[0]} min`, 'Any']}
            onChange={(time) => onPick({ ...filters, distance: null, time })}
          />
        </>
      )}
    </>
  )
}

// Sheet behind the Time chip. The slider only moves the draft; the button applies it.
// After a flip the slider is at Any, on either side.
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
        <SpeedPicker pickup={pickup} filters={draft} onSide={switchSide} onPick={setDraft} />
      </div>
      <ApplyButton onClick={() => onApply(draft)} />
    </Sheet>
  )
}
