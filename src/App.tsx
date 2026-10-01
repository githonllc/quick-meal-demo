import { Footer } from './components/Footer'
import { ToastProvider } from './components/Toast'
import { HomeScreen } from './screens/HomeScreen'
import { MenuScreen } from './screens/MenuScreen'
import { QuickMealScreen } from './screens/QuickMealScreen'
import { useRoute } from './router'

function Screen() {
  const { path } = useRoute()
  if (path === '/quick-meal') return <QuickMealScreen />
  if (path === '/quick-meal/restaurants/:id') return <MenuScreen />
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
