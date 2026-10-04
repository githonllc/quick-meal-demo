import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { DISTANCE_STEPS, TIME_STEPS } from '../shared/constants'

// Old results stay on screen while new ones load, so wait until the list is no longer busy.
export async function waitForResults(page: Page, testId = 'results') {
  await expect(page.locator(`[data-testid="${testId}"][aria-busy="false"]`)).toBeVisible()
}

// Moves a step slider (time or distance) to this stop, e.g. "30", "1" or "Any".
// The input value is the stop's index; "Any" is the index after the last stop.
export async function setStop(slider: Locator, stop: string) {
  const stops: readonly number[] = (await slider.getAttribute('data-testid')) === 'time-slider' ? TIME_STEPS : DISTANCE_STEPS
  const i = stop === 'Any' ? stops.length : stops.indexOf(Number(stop))
  if (i < 0) throw new Error(`No stop "${stop}" in ${JSON.stringify(stops)}`)
  await slider.fill(String(i))
}

// Sets the card layout of the demo settings: 'meals' (dish cards, the default) or 'places'.
// Call it on a page of the app, after any localStorage.clear(); the next page load uses it.
// The key matches src/state/config.ts. The rest of the config gets its defaults.
export async function setLayout(page: Page, layout: 'meals' | 'places') {
  await page.evaluate((l) => localStorage.setItem('quickMeal.config.v1', JSON.stringify({ layout: l })), layout)
  const saved = await page.evaluate(() => localStorage.getItem('quickMeal.config.v1'))
  expect(JSON.parse(saved ?? '{}').layout).toBe(layout)
}
