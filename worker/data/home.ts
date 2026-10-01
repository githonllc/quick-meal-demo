import { CUISINES } from '../../shared/constants'
import { compareIds } from '../../shared/menu'
import { toSummary } from '../../shared/pricing'
import type { HomeData } from '../../shared/types'
import { RESTAURANTS } from './restaurants'

const NEAR_CAMPUS_COUNT = 4

// Home screen: every cuisine, and the 4 nearest open places (tie -> id).
export function homeData(): HomeData {
  const nearCampus = RESTAURANTS.filter((r) => r.isOpen)
    .sort((a, b) => a.distanceMi - b.distanceMi || compareIds(a.id, b.id))
    .slice(0, NEAR_CAMPUS_COUNT)
    .map(toSummary)
  return { cuisines: CUISINES.map(({ id, label }) => ({ id, label })), nearCampus }
}
