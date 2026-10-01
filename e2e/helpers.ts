import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Old results stay on screen while new ones load, so wait until the list is no longer busy.
export async function waitForResults(page: Page, testId = 'results') {
  await expect(page.locator(`[data-testid="${testId}"][aria-busy="false"]`)).toBeVisible()
}
