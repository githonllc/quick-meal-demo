import { useEffect, useState } from 'react'
import { formatCount, formatDollars, formatEtaRange, formatMiles } from '../../shared/format'
import type { MenuRow as Row, MenuView } from '../../shared/types'
import { ApiError, getMenu } from '../api'
import { BackIcon } from '../components/TopBar'
import { BreakdownSheet } from '../components/BreakdownSheet'
import { BudgetSheet } from '../components/BudgetSheet'
import { FoodTile } from '../components/FoodTile'
import { LoadingBar } from '../components/LoadingBar'
import { MenuRow } from '../components/MenuRow'
import { useToast } from '../components/Toast'
import { back, navigate, useRoute } from '../router'
import { parseUrl, toQuery, withQuery } from '../state/filters'
import type { UiFilters } from '../state/filters'
import { firstSave, loadDefault, saveDefault } from '../state/savedDefault'
import './menu.css'

// The answer to one request: a menu, a failure, or a missing restaurant.
type Result = { req: string; menu: MenuView | null; missing: boolean }

export function MenuScreen() {
  const { params, query } = useRoute()
  const filters = parseUrl(query.toString())
  // Distance stays: it means pickup prices (design P6).
  const key = toQuery({ ...filters, time: null, cuisine: null })
  const path = `/quick-meal/restaurants/${params.id}`

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  // The last menu that loaded. It stays on screen while a new budget loads.
  const [menu, setMenu] = useState<MenuView | null>(null)
  const [priced, setPriced] = useState<Row | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const { show } = useToast()

  // One request at a time: a new budget or sort aborts the request still in flight.
  const req = `${path}?${key}#${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getMenu(params.id, new URLSearchParams(key), controller.signal)
      // A cached answer can arrive after the abort, so check it here too.
      .then((data) => {
        if (controller.signal.aborted) return
        setResult({ req, menu: data, missing: false })
        setMenu(data)
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setResult({ req, menu: null, missing: err instanceof ApiError && err.status === 404 })
      })
    return () => controller.abort()
  }, [params.id, key, req])

  // Changing the budget here is a user choice, so it also saves the default (design P8).
  // Only the budget changes in the saved default. Time, distance and sort stay as saved.
  const applyBudget = (f: UiFilters) => {
    const saved = loadDefault()
    saveDefault({
      budget: f.budget,
      time: saved?.time ?? null,
      distance: saved?.distance ?? null,
      sort: saved?.sort ?? filters.sort,
      cuisine: null,
    })
    navigate(withQuery(path, toQuery({ ...filters, budget: f.budget })), { replace: true })
    if (firstSave()) show('Saved. Quick Meal will open with these filters.')
    setBudgetOpen(false)
  }

  // Derived in the same render as the URL change, so an old menu never looks final.
  const done = result?.req === req
  const pending = !done
  const failed = done && !result.menu && !result.missing
  const missing = done && result.missing

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => back('/quick-meal')}>
          <BackIcon />
        </button>
      </div>

      {missing && (
        <div className="menu-error">
          <p>This restaurant is not available.</p>
          <button className="menu-retry" onClick={() => navigate('/quick-meal')}>
            Back to Quick Meal
          </button>
        </div>
      )}

      {failed && (
        <div className="menu-error">
          <p>Could not load the menu. Check your connection and try again.</p>
          <button className="menu-retry" data-testid="retry" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}

      {!failed && !missing && (
        <section data-testid="menu-results" aria-busy={pending ? 'true' : 'false'}>
          {/* Skeletons only on the first load, when there is nothing to show yet. */}
          {pending && !menu && (
            <>
              <div className="skeleton menu-skel" style={{ height: 100 }} />
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="skeleton menu-skel" style={{ height: 64 }} />
              ))}
            </>
          )}
          {pending && menu && <LoadingBar />}

          {menu && (
            <div className={pending ? 'dim' : undefined}>
              <FoodTile kind={menu.restaurant.heroPhoto} size="hero" />
              <h1 className="menu-name">{menu.restaurant.name}</h1>
              <p className="menu-meta">
                {menu.restaurant.rating.toFixed(1)} ★ ({formatCount(menu.restaurant.ratingCount)}) ·{' '}
                {/* Pickup shows no time: it is a delivery time. */}
                {!menu.pickup && `Est. ${formatEtaRange(menu.restaurant.etaMin)} · `}
                {formatMiles(menu.restaurant.distanceMi)}
              </p>

              {menu.budgetCents !== null && (
                <div className="menu-budget-bar" data-testid="menu-budget-bar">
                  <span>
                    Your budget: <b>up to {formatDollars(menu.budgetCents / 100)}</b> est. all-in
                  </span>
                  <button className="menu-change" onClick={() => setBudgetOpen(true)}>
                    Change
                  </button>
                </div>
              )}

              {menu.budgetCents === null && (
                <Section rows={menu.fits.concat(menu.over)} tag={null} onPrice={setPriced} />
              )}
              {menu.budgetCents !== null && (
                <>
                  <Section
                    testId="menu-fits"
                    title={
                      menu.fits.length > 0
                        ? `Under your budget (${menu.fits.length})`
                        : `Nothing here fits ${formatDollars(menu.budgetCents / 100)}. Closest:`
                    }
                    rows={menu.fits}
                    tag="fits"
                    onPrice={setPriced}
                  />
                  <Section
                    testId="menu-over"
                    title={`Over your budget (${menu.over.length})`}
                    rows={menu.over}
                    tag="over"
                    onPrice={setPriced}
                  />
                </>
              )}
            </div>
          )}
        </section>
      )}

      {budgetOpen && (
        <BudgetSheet
          filters={{ ...filters, time: null, distance: null, cuisine: null }}
          applyText="Apply"
          onApply={applyBudget}
          onClose={() => setBudgetOpen(false)}
        />
      )}

      {priced && menu && (
        <BreakdownSheet
          item={priced.item}
          restaurantName={menu.restaurant.name}
          price={priced.price}
          pickup={menu.pickup}
          onClose={() => setPriced(null)}
        />
      )}
    </>
  )
}

// A titled list of rows. It is left out when there are no rows.
function Section({
  testId,
  title,
  rows,
  tag,
  onPrice,
}: {
  testId?: string
  title?: string
  rows: Row[]
  tag: 'fits' | 'over' | null
  onPrice: (row: Row) => void
}) {
  // The "Nothing here fits" title stays even without rows. Other empty sections go.
  if (rows.length === 0 && tag !== 'fits') return null
  return (
    <section data-testid={testId}>
      {title && (
        <h2 className="menu-section" data-testid={testId && `${testId}-title`}>
          {title}
        </h2>
      )}
      {rows.map((row) => (
        <MenuRow key={row.item.id} row={row} tag={tag} onPrice={() => onPrice(row)} />
      ))}
    </section>
  )
}
