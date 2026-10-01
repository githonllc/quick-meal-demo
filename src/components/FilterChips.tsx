import { formatDollars, formatMiles } from '../../shared/format'
import { activeCount } from '../state/filters'
import type { UiFilters } from '../state/filters'

export type SheetKind = 'filters' | 'budget' | 'time' | 'distance'

function SmallSliders() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    </svg>
  )
}

function Chip({ id, on, label, onClick }: { id: string; on: boolean; label: string; onClick: () => void }) {
  return (
    <button className={on ? 'fchip on' : 'fchip'} data-testid={id} onClick={onClick}>
      {label} ▾
    </button>
  )
}

export function FilterChips({ filters, onOpen }: { filters: UiFilters; onOpen: (kind: SheetKind) => void }) {
  const { budget, time, distance } = filters
  const count = activeCount(filters)
  return (
    <div className="fchips">
      <button className="fchip" data-testid="chip-filters" onClick={() => onOpen('filters')}>
        <SmallSliders />
        Filters
        {count > 0 && (
          <span className="fchip-badge" data-testid="chip-filters-badge">
            {count}
          </span>
        )}
      </button>
      <Chip
        id="chip-budget"
        on={budget !== null}
        label={budget === null ? 'Budget' : `Up to ${formatDollars(budget)}`}
        onClick={() => onOpen('budget')}
      />
      <Chip
        id="chip-time"
        on={time !== null}
        label={time === null ? 'Time' : `${time} min`}
        onClick={() => onOpen('time')}
      />
      <Chip
        id="chip-distance"
        on={distance !== null}
        label={distance === null ? 'Distance' : formatMiles(distance)}
        onClick={() => onOpen('distance')}
      />
    </div>
  )
}
