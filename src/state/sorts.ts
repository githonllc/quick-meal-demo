import { sortFor } from '../../shared/constants'
import type { SortId } from '../../shared/types'
import type { Layout } from './config'

// Each layout sorts by a number its cards show (design P2): dish cards show dish likes,
// restaurant cards show stars. The API takes both, so the app picks one by layout.
function ownSort(layout: Layout): SortId {
  return layout === 'meals' ? 'liked' : 'rated'
}

// The 3 sorts the sheet shows: the side's default, Lowest price, and the layout's own sort.
export function sortIds(pickup: boolean, layout: Layout): SortId[] {
  return [sortFor(null, pickup), 'price', ownSort(layout)]
}

// The asked sort if this side and layout show it, otherwise the side's default.
// Most liked and Top rated swap with the layout, so a link or a saved sort keeps its meaning.
export function sortForLayout(raw: string | null | undefined, pickup: boolean, layout: Layout): SortId {
  const asked = raw === 'liked' || raw === 'rated' ? ownSort(layout) : raw
  return sortIds(pickup, layout).find((id) => id === asked) ?? sortFor(null, pickup)
}
