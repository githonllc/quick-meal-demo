import type { CSSProperties, ReactNode } from 'react'

// Native range input over the stop index, so it snaps to the stops.
// One more stop at the far right means "any", stored as null.
export function StepSlider<T extends number>({
  stops,
  value,
  label,
  any,
  show,
  say,
  testId,
  onChange,
}: {
  stops: readonly T[]
  value: T | null
  label: string // aria-label
  any: string // the header and aria-valuetext at the "Any" stop
  show: (v: T) => ReactNode // the header at a stop
  say: (v: T) => string // aria-valuetext at a stop
  testId: string
  onChange: (v: T | null) => void
}) {
  const i = value === null ? stops.length : stops.indexOf(value)
  const fill = `${(i / stops.length) * 100}%`
  return (
    <div className="slider">
      <p className="slider-val" data-testid={`${testId}-val`}>
        {value === null ? any : show(value)}
      </p>
      <input
        type="range"
        min={0}
        max={stops.length}
        step={1}
        value={i}
        aria-label={label}
        aria-valuetext={value === null ? any : say(value)}
        data-testid={testId}
        style={{ '--fill': fill, touchAction: 'pan-x' } as CSSProperties}
        onChange={(e) => onChange(stops[Number(e.target.value)] ?? null)}
      />
      <div className="slider-ticks">
        {stops.map((s) => (
          <span key={s}>{s}</span>
        ))}
        <span>Any</span>
      </div>
    </div>
  )
}
