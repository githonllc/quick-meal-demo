import { CUISINES } from '../../shared/constants'
import { formatDollars, formatMiles } from '../../shared/format'
import type { UiFilters } from './filters'

// "a, b and c"
function joinParts(parts: string[]): string {
  if (parts.length < 2) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

// The body text of the no-match box.
export function describeFilters(f: UiFilters): string {
  const label = CUISINES.find((c) => c.id === f.cuisine)?.label
  const parts: string[] = []
  if (f.budget !== null) parts.push(`a ${formatDollars(f.budget)} budget`)
  if (f.time !== null) parts.push(`${f.time} min`)
  if (f.distance !== null) parts.push(formatMiles(f.distance))

  if (parts.length === 0) return label ? `No ${label} places are open nearby.` : 'Nothing is open right now.'
  const cuisine = label ? ` in ${label}` : ''
  return `Nothing fits ${joinParts(parts)}${cuisine}. Here are the closest meals.`
}
