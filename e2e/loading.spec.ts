import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'
import { waitForResults } from './helpers'

test('a filter change keeps the old list, dimmed, until the new one arrives', async ({ page }) => {
  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  await expect(page.getByTestId('meal-card')).toHaveCount(6)

  // Hold the Chinese answer so the in-between state can be checked without a race.
  const held: Route[] = []
  await page.route('**/api/quick-meal/search?*cuisine=chinese*', (route) => {
    held.push(route)
  })

  await page.getByTestId('cuisine-tab-chinese').click()
  // Same tick as the tap: the old cards are still there, not replaced by skeletons.
  await expect(page.getByTestId('meal-card')).toHaveCount(6)
  await expect(page.locator('.meal-skel')).toHaveCount(0)
  await expect(page.locator('[data-testid="results"][aria-busy="true"]')).toBeVisible()
  await expect(page.getByTestId('loading-bar')).toBeVisible()

  // Let the held requests through. A request React already aborted may throw here.
  await expect.poll(() => held.length).toBeGreaterThan(0)
  await page.unroute('**/api/quick-meal/search?*cuisine=chinese*')
  for (const route of held) await route.continue().catch(() => {})

  await waitForResults(page)
  await expect(page.getByTestId('loading-bar')).toHaveCount(0)
  await expect(page.getByTestId('count-line')).toHaveText('3 places have a meal that fits · fastest first')
  await expect(page.getByTestId('meal-card')).toHaveCount(3)
})

test('going back from a menu shows the same list at once: no skeleton, no loading bar, no name over a photo', async ({
  page,
}) => {
  // Watches every DOM change after the back tap, before the browser paints it.
  // Page code is a string: the e2e tsconfig has no DOM types.
  await page.addInitScript(`
    window.watch = false
    window.seen = []
    new MutationObserver(() => {
      if (!window.watch) return
      if (document.querySelector('.meal-skel')) window.seen.push('skeleton')
      if (document.querySelector('[data-testid="results"][aria-busy="true"]')) window.seen.push('loading')
      for (const tile of document.querySelectorAll('[data-testid="meal-card"] .tile')) {
        const img = tile.querySelector('img')
        const name = tile.querySelector('span')
        if (!img || !img.complete || !name) continue
        const r = name.getBoundingClientRect()
        if (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === name) window.seen.push('name over photo')
      }
    }).observe(document, { subtree: true, childList: true, attributes: true })
  `)
  const watch = (on: boolean) => page.evaluate(`window.watch = ${on}; window.seen = []`)
  const seen = () => page.evaluate<string[]>('window.seen')

  await page.goto('/quick-meal?budget=20&time=30')
  await waitForResults(page)
  const photosDone = `[...document.querySelectorAll('[data-testid="meal-card"] img')].every((i) => i.complete)`
  await expect.poll(() => page.evaluate<boolean>(photosDone)).toBe(true)

  for (const goBack of [() => page.goBack(), () => page.getByLabel('Back').click()]) {
    await page.getByTestId('meal-card').first().click()
    await waitForResults(page, 'menu-results')
    await watch(true)
    await goBack()
    await expect(page).toHaveURL(/\/quick-meal\?budget=20&time=30$/)
    await expect(page.getByTestId('meal-card')).toHaveCount(6)
    expect(await seen()).toEqual([])
    await watch(false)
  }
})
