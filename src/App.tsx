import { useEffect, useRef } from 'react'
import { Footer } from './components/Footer'
import { ToastProvider } from './components/Toast'
import { HomeScreen } from './screens/HomeScreen'
import { MenuScreen } from './screens/MenuScreen'
import { QuickMealScreen } from './screens/QuickMealScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useRoute } from './router'
import { useConfig } from './state/config'
import { parseUrl, toQuery } from './state/filters'
import { cancelTrial, startTrial } from './state/study'

function Screen() {
  const { path } = useRoute()
  const { study, layout } = useConfig()
  const prevPath = useRef<string | null>(null)

  // Study timer: opening Quick Meal starts a trial, a menu keeps it, Home or the settings cancel it.
  // Back from a menu never starts one, even after the trial ended there.
  // This runs after the screen's own effects, so the URL already holds the start filters.
  useEffect(() => {
    const fromMenu = prevPath.current === '/quick-meal/restaurants/:id'
    prevPath.current = path
    if (study && path === '/quick-meal' && !fromMenu) startTrial(layout, toQuery(parseUrl(window.location.search, layout)))
    else if (!study || path === '/' || path === '/demo-settings') cancelTrial()
  }, [path, study, layout])

  if (path === '/quick-meal') return <QuickMealScreen />
  if (path === '/quick-meal/restaurants/:id') return <MenuScreen />
  if (path === '/demo-settings') return <SettingsScreen />
  return <HomeScreen />
}

function App() {
  return (
    <ToastProvider>
      <div className="column">
        <main className="page">
          <Screen />
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}

export default App
