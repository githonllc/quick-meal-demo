import { useEffect, useState } from 'react'
import { SORTS } from '../../shared/constants'
import { pluralize } from '../../shared/format'
import type { DistanceStep, MealCard as Meal, Relax, SearchResponse, TimeStep } from '../../shared/types'
import { searchMeals } from '../api'
import { BreakdownSheet } from '../components/BreakdownSheet'
import { BudgetSheet } from '../components/BudgetSheet'
import { CuisineTabs } from '../components/CuisineTabs'
import { FilterChips } from '../components/FilterChips'
import { FiltersSheet } from '../components/FiltersSheet'
import type { SheetKind } from '../components/FilterChips'
import { LoadingBar } from '../components/LoadingBar'
import { MealCard } from '../components/MealCard'
import { NoMatch } from '../components/NoMatch'
import { Skeleton } from '../components/Skeleton'
import { StepSheet } from '../components/StepSheet'
import { useToast } from '../components/Toast'
import { SlidersIcon, TopBar } from '../components/TopBar'
import { navigate, useRoute } from '../router'
import { activeCount, initialFilters, parseUrl, toQuery, withQuery } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { firstSave, saveDefault } from '../state/savedDefault'
import './quick-meal.css'

// The URL holds the filters. Every change rewrites it, and the fetch follows the URL.
function setFilters(f: UiFilters) {
  navigate(withQuery('/quick-meal', toQuery(f)), { replace: true })
}

// "6 places have a meal that fits · fastest first"
function countLine(res: SearchResponse, f: UiFilters): string {
  const sort = SORTS.find((s) => s.id === f.sort)?.label.toLowerCase()
  const places =
    f.budget === null
      ? `${pluralize(res.total, 'place', 'places')} open now`
      : `${pluralize(res.total, 'place has', 'places have')} a meal that fits`
  return `${places} · ${sort} first`
}

export function QuickMealScreen() {
  const { query } = useRoute()
  const filters = parseUrl(query.toString())
  const key = toQuery(filters)

  const [attempt, setAttempt] = useState(0)
  // The answer to one request. data is null when the request failed.
  const [result, setResult] = useState<{ req: string; data: SearchResponse | null } | null>(null)
  // The last successful answer. It stays on screen while the next request loads.
  const [shown, setShown] = useState<SearchResponse | null>(null)
  // The tapped card and whether it was priced for pickup, fixed at tap time.
  const [priced, setPriced] = useState<{ card: Meal; pickup: boolean } | null>(null)
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
      // A cached answer can arrive after the abort, so check it here too.
      .then((data) => {
        if (controller.signal.aborted) return
        setResult({ req, data })
        setShown(data)
      })
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

  // The menu keeps budget and sort, and distance for pickup prices (design P6).
  // It uses the filters of the answer on screen, so a card tapped while the next answer loads
  // opens the menu at the prices that card showed.
  const openMenu = (id: string) => {
    if (!shown) return
    const { budgetCents, distanceMi, sort } = shown.filters
    const budget = budgetCents === null ? null : budgetCents / 100
    const query = toQuery({ budget, time: null, distance: distanceMi, cuisine: null, sort })
    navigate(withQuery(`/quick-meal/restaurants/${id}`, query))
  }

  // Derived in the same render as the URL change, so old results never look final.
  const done = result?.req === req
  const pending = !done
  const failed = done && result.data === null
  // Cards follow the filters of the answer on screen, so old cards never show pickup prices as delivery.
  const pickup = shown !== null && shown.filters.distanceMi !== null

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

      {!failed && (
        <section data-testid="results" aria-busy={pending ? 'true' : 'false'}>
          {/* Skeletons only on the first load, when there is nothing to show yet. */}
          {pending && !shown && (
            <>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </>
          )}
          {pending && shown && <LoadingBar />}

          {shown && (
            <div className={pending ? 'dim' : undefined}>
              {shown.exact.length === 0 && (
                <NoMatch
                  filters={filters}
                  pickup={pickup}
                  near={shown.near}
                  relax={shown.relax}
                  onRelax={relaxTo}
                  onOpen={(card) => openMenu(card.restaurant.id)}
                  onPrice={(card) => setPriced({ card, pickup })}
                />
              )}

              {shown.exact.length > 0 && (
                <>
                  <p className="count-line" data-testid="count-line">
                    {countLine(shown, filters)}
                  </p>
                  {activeCount(filters) === 0 && (
                    <p className="qm-hint">Short on time? Pick a time and a budget to see meals that fit.</p>
                  )}
                  {shown.exact.map((card) => (
                    <MealCard
                      key={card.restaurant.id}
                      card={card}
                      budget={filters.budget}
                      pickup={pickup}
                      onOpen={() => openMenu(card.restaurant.id)}
                      onPrice={() => setPriced({ card, pickup })}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {open === 'filters' && (
        <FiltersSheet filters={filters} onApply={apply} onClose={close} />
      )}
      {open === 'budget' && (
        <BudgetSheet filters={filters} onApply={apply} onClose={close} />
      )}
      {open === 'time' && <StepSheet filters={filters} onApply={apply} onClose={close} />}

      {priced && (
        <BreakdownSheet
          item={priced.card.item}
          restaurantName={priced.card.restaurant.name}
          price={priced.card.price}
          pickup={priced.pickup}
          onClose={() => setPriced(null)}
        />
      )}
    </>
  )
}
