import { useEffect, useState } from 'react'
import { SORTS } from '../../shared/constants'
import { pluralize } from '../../shared/format'
import type { MealCard as Meal, SearchResponse } from '../../shared/types'
import { searchMeals } from '../api'
import { BreakdownSheet } from '../components/BreakdownSheet'
import { CuisineTabs } from '../components/CuisineTabs'
import { FilterChips } from '../components/FilterChips'
import type { SheetKind } from '../components/FilterChips'
import { MealCard } from '../components/MealCard'
import { Skeleton } from '../components/Skeleton'
import { SlidersIcon, TopBar } from '../components/TopBar'
import { navigate, useRoute } from '../router'
import { initialFilters, parseUrl, toQuery, withQuery } from '../state/filters'
import type { UiFilters } from '../state/filters'
import './quick-meal.css'

// The URL holds the filters. Every change rewrites it, and the fetch follows the URL.
function setFilters(f: UiFilters) {
  navigate(withQuery('/quick-meal', toQuery(f)), { replace: true })
}

function countLine(res: SearchResponse, f: UiFilters): string {
  const sort = SORTS.find((s) => s.id === f.sort)?.label
  const places =
    f.budget === null
      ? `${pluralize(res.total, 'place', 'places')} open now`
      : `${pluralize(res.total, 'place has', 'places have')} a meal that fits`
  return `${places} · ${sort}`
}

export function QuickMealScreen() {
  const { query } = useRoute()
  const filters = parseUrl(query.toString())
  const key = toQuery(filters)

  const [attempt, setAttempt] = useState(0)
  // The answer to one request. data is null when the request failed.
  const [result, setResult] = useState<{ req: string; data: SearchResponse | null } | null>(null)
  const [priced, setPriced] = useState<Meal | null>(null)

  // Only rewrites the URL when the start filters differ from it (#9: saved default).
  useEffect(() => {
    const start = initialFilters(window.location.search)
    if (toQuery(start) !== toQuery(parseUrl(window.location.search))) setFilters(start)
  }, [])

  // One request at a time: a new filter aborts the request still in flight.
  const req = `${key}#${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    searchMeals(new URLSearchParams(key), controller.signal)
      .then((data) => setResult({ req, data }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ req, data: null })
      })
    return () => controller.abort()
  }, [key, req])

  // #9 opens the filter sheets from here.
  const onOpen = (kind: SheetKind) => void kind

  // Until the current request answers, show skeletons (not the old list).
  const done = result?.req === req
  const failed = done && result.data === null
  const data = done ? result.data : null

  return (
    <>
      <TopBar
        title="Quick Meal"
        right={
          <button className="icon-btn" aria-label="Open filters" onClick={() => onOpen('filters')}>
            <SlidersIcon />
          </button>
        }
      />
      <p className="qm-sub">Deliver to SJSU · Now</p>
      <FilterChips filters={filters} onOpen={onOpen} />
      <CuisineTabs value={filters.cuisine} onChange={(cuisine) => setFilters({ ...filters, cuisine })} />

      {failed && (
        <div className="error">
          <p>Could not load meals. Check your connection and try again.</p>
          <button className="retry" data-testid="retry" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}

      {!failed && !data && (
        <div aria-busy="true">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}

      {!failed && data && data.exact.length === 0 && <div data-testid="no-match">No exact matches</div>}

      {!failed && data && data.exact.length > 0 && (
        <>
          <p className="count-line" data-testid="count-line">
            {countLine(data, filters)}
          </p>
          {filters.budget === null && <p className="qm-hint">Set a budget to see what fits.</p>}
          {data.exact.map((card) => (
            <MealCard
              key={card.restaurant.id}
              card={card}
              budget={filters.budget}
              onOpen={() =>
                navigate(
                  withQuery(
                    `/quick-meal/restaurants/${card.restaurant.id}`,
                    toQuery({ ...filters, time: null, distance: null, cuisine: null }),
                  ),
                )
              }
              onPrice={() => setPriced(card)}
            />
          ))}
        </>
      )}

      {priced && (
        <BreakdownSheet
          item={priced.item}
          restaurantName={priced.restaurant.name}
          price={priced.price}
          onClose={() => setPriced(null)}
        />
      )}
    </>
  )
}
