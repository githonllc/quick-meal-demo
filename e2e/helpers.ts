import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Old results stay on screen while new ones load, so wait until the list is no longer busy.
export async function waitForResults(page: Page, testId = 'results') {
  await expect(page.locator(`[data-testid="${testId}"][aria-busy="false"]`)).toBeVisible()
}

// Moves a step slider (time or distance) to the stop with this tick label, e.g. "30", "1" or "Any".
export async function setStop(slider: Locator, stop: string) {
  const ticks = await slider.locator('xpath=following-sibling::div[1]/span').allInnerTexts()
  const i = ticks.indexOf(stop)
  if (i < 0) throw new Error(`No stop "${stop}" in ${JSON.stringify(ticks)}`)
  await slider.fill(String(i))
}
