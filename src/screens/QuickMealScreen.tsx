import { SlidersIcon, TopBar } from '../components/TopBar'

export function QuickMealScreen() {
  return (
    <>
      <TopBar title="Quick Meal" right={<SlidersIcon />} />
      <p className="placeholder">Coming in #8</p>
    </>
  )
}
