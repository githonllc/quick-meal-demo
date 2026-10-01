import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { HomeData } from '../../shared/types'
import { formatMiles } from '../../shared/format'
import { getHome } from '../api'
import { FoodTile } from '../components/FoodTile'
import { useToast } from '../components/Toast'
import { navigate } from '../router'
import './home.css'

const NOT_IN_DEMO = 'Not part of this demo.'

const svg = (children: ReactNode, size = 20) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {children}
  </svg>
)

const ICONS = {
  profile: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>,
  ),
  bell: svg(<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4" />),
  cart: svg(
    <>
      <path d="M3 4h3l2 12h10l2-8H7" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
    </>,
  ),
}

const CATEGORIES: { label: string; icon: ReactNode }[] = [
  { label: 'Deals', icon: svg(<><path d="M3 12V3h9l9 9-9 9-9-9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>, 26) },
  { label: 'Grocery', icon: svg(<><path d="M4 9h16l-2 11H6L4 9z" /><path d="M9 9a3 3 0 0 1 6 0" /></>, 26) },
  { label: 'Convenience', icon: svg(<><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></>, 26) },
  { label: 'Reserve', icon: svg(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>, 26) },
]

function Loading() {
  return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 36, margin: '20px 0 8px', width: '60%' }} />
      <div className="skeleton" style={{ height: 100 }} />
    </div>
  )
}

export function HomeScreen() {
  const { show } = useToast()
  const [home, setHome] = useState<HomeData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getHome(controller.signal)
      .then((data) => {
        setHome(data)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [attempt])

  const retry = () => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <>
      <header className="home-head">
        <div className="home-row">
          <span className="home-loc">SJSU ▾</span>
          <div className="home-icons">
            {(['profile', 'bell', 'cart'] as const).map((name) => (
              <button key={name} className="icon-btn" aria-label={name} onClick={() => show(NOT_IN_DEMO)}>
                {ICONS[name]}
              </button>
            ))}
          </div>
        </div>
        <div className="cats">
          <button className="cat cat-new" data-testid="quick-meal-entry" onClick={() => navigate('/quick-meal')}>
            <span className="cat-ic">
              {svg(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none" />, 28)}
              <span className="new-tag">NEW</span>
            </span>
            Quick Meal
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.label} className="cat" onClick={() => show(NOT_IN_DEMO)}>
              <span className="cat-ic">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
        <button className="banner" onClick={() => navigate('/quick-meal')}>
          $0 delivery
          <br />
          on your first
          <br />
          Quick Meal
        </button>
      </header>

      {failed && (
        <div className="error">
          <p>Could not load. Check your connection and try again.</p>
          <button className="retry" data-testid="retry" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      {!failed && !home && <Loading />}
      {home && (
        <>
          <h2 className="home-sec">What can we get you?</h2>
          <div className="chips">
            {home.cuisines.map((c) => (
              <button key={c.id} className="chip" onClick={() => navigate(`/quick-meal?cuisine=${c.id}`)}>
                {c.label}
              </button>
            ))}
          </div>
          <h2 className="home-sec">Near campus</h2>
          <div className="near">
            {home.nearCampus.map((r) => (
              <button key={r.id} className="near-card" onClick={() => navigate(`/quick-meal/restaurants/${r.id}`)}>
                <FoodTile kind={r.heroPhoto} size="hero" />
                <div className="near-name">{r.name}</div>
                <div className="near-meta">
                  {r.rating.toFixed(1)} ★ · {formatMiles(r.distanceMi)} · {r.etaMin} min
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button className="search-pill" onClick={() => show('Search is not part of this demo.')}>
        {svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>, 18)}
        Search DoorDash
      </button>
    </>
  )
}
