import { useEffect, useRef } from 'react'
import { CUISINES } from '../../shared/constants'
import type { CuisineId } from '../../shared/types'

const TABS: { id: CuisineId | null; label: string }[] = [{ id: null, label: 'All' }, ...CUISINES]

export function CuisineTabs({ value, onChange }: { value: CuisineId | null; onChange: (id: CuisineId | null) => void }) {
  const selected = useRef<HTMLButtonElement>(null)

  // A link like ?cuisine=sushi selects a tab that may be off screen.
  useEffect(() => {
    selected.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [])

  return (
    <div className="ctabs" role="tablist" aria-label="Cuisine">
      {TABS.map((t) => (
        <button
          key={t.label}
          ref={t.id === value ? selected : undefined}
          className="ctab"
          role="tab"
          aria-selected={t.id === value}
          data-testid={`cuisine-tab-${t.id ?? 'all'}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
