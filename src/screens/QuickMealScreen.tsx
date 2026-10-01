import { useEffect, useState } from 'react'
import { DISTANCE_STEPS, SORTS, TIME_STEPS } from '../../shared/constants'
import { pluralize } from '../../shared/format'
import type { DistanceStep, MealCard as Meal, Relax, SearchResponse, TimeStep } from '../../shared/types'
import { searchMeals } from '../api'
import { BreakdownSheet } from '../components/BreakdownSheet'
import { BudgetSheet } from '../components/BudgetSheet'
import { CuisineTabs } from '../components/CuisineTabs'
import { FilterChips } from '../components/FilterChips'
import { FiltersSheet } from '../components/FiltersSheet'
import type { SheetKind } from '../components/FilterChips'
import { MealCard } from '../components/MealCard'
import { NoMatch } from '../components/NoMatch'
import { Skeleton } from '../components/Skeleton'
import { StepSheet } from '../components/StepSheet'
import { useToast } from '../components/Toast'
import { SlidersIcon, TopBar } from '../components/TopBar'
import { navigate, useRoute } from '../router'
import { initialFilters, parseUrl, toQuery, withQuery } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { firstSave, saveDefault } from '../state/savedDefault'
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
  const [open, setOpen] = useState<SheetKind | null>(null)
  const { show } = useToast()

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

  const onOpen = (kind: SheetKind) => setOpen(kind)
  const close = () => setOpen(null)

  // Every way a user applies filters also saves them as the default (design P8).
  const apply = (f: UiFilters) => {
    setFilters(f)
    saveDefault(f)
    if (firstSave()) show('Saved. Quick Meal will open with these filters.')
    close()
  }

  // A relax chip changes this view only. It does not save a new default.
  const relaxTo = (r: Relax) => {
    if (r.filter === 'cuisine') setFilters({ ...filters, cuisine: null })
    else if (r.filter === 'budget') setFilters({ ...filters, budget: r.to })
    else if (r.filter === 'time') setFilters({ ...filters, time: r.to as TimeStep | null })
    else setFilters({ ...filters, distance: r.to as DistanceStep | null })
  }

  const openMenu = (id: string) =>
    navigate(
      withQuery(
        `/quick-meal/restaurants/${id}`,
        toQuery({ ...filters, time: null, distance: null, cuisine: null }),
      ),
    )

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

      {!failed && data && data.exact.length === 0 && (
        <NoMatch
          filters={filters}
          near={data.near}
          relax={data.relax}
          onRelax={relaxTo}
          onOpen={(card) => openMenu(card.restaurant.id)}
          onPrice={setPriced}
        />
      )}

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
              onOpen={() => openMenu(card.restaurant.id)}
              onPrice={() => setPriced(card)}
            />
          ))}
        </>
      )}

      {open === 'filters' && (
        <FiltersSheet filters={filters} total={data?.total ?? null} onApply={apply} onClose={close} />
      )}
      {open === 'budget' && (
        <BudgetSheet filters={filters} total={data?.total ?? null} onApply={apply} onClose={close} />
      )}
      {open === 'time' && (
        <StepSheet
          kind="time"
          steps={TIME_STEPS}
          value={filters.time}
          onPick={(time) => apply({ ...filters, time })}
          onClose={close}
        />
      )}
      {open === 'distance' && (
        <StepSheet
          kind="distance"
          steps={DISTANCE_STEPS}
          value={filters.distance}
          onPick={(distance) => apply({ ...filters, distance })}
          onClose={close}
        />
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
