import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { DEFAULT_RANGES, isValidRange, stepsOf } from '../shared/ranges'

// Old results stay on screen while new ones load, so wait until the list is no longer busy.
export async function waitForResults(page: Page, testId = 'results') {
  await expect(page.locator(`[data-testid="${testId}"][aria-busy="false"]`)).toBeVisible()
}

// Moves a step slider (time or distance) to this stop, e.g. "30", "1" or "Any".
// The input value is the stop's index; "Any" is the index after the last stop.
// The stops come from the range in the page's demo settings, like the slider's own (src/state/config.ts).
export async function setStop(slider: Locator, stop: string) {
  const kind = (await slider.getAttribute('data-testid')) === 'time-slider' ? 'time' : 'distance'
  const saved = await slider.page().evaluate(() => localStorage.getItem('quickMeal.config.v1'))
  let range: unknown = null
  try {
    range = (JSON.parse(saved ?? 'null') as Record<string, unknown> | null)?.[kind]
  } catch {
    // Bad JSON: the app uses the default range too.
  }
  const stops = stepsOf(isValidRange(kind, range) ? range : DEFAULT_RANGES[kind])
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

// Sets fields of the demo settings, e.g. { study: true } or { network: { delayMs: 500, fail: false } }.
// Like setLayout: call it on a page of the app; the next page load uses it.
export async function setConfig(page: Page, config: Record<string, unknown>) {
  await page.evaluate((c) => localStorage.setItem('quickMeal.config.v1', JSON.stringify(c)), config)
}
