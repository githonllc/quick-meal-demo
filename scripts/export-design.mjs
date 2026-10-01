// Make the README images from the design page, so they never drift from it.
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const names = ['1-home', '2-meal-list', '3-filters', '4-no-match', '5-menu', '6-breakdown']
mkdirSync('docs/design', { recursive: true })

const browser = await chromium.launch()
const url = pathToFileURL(resolve('docs/design.html')).href

// Full page at scale 1.
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(url)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: 'docs/design.png', fullPage: true })

// One image per phone at scale 2.
const hi = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
await hi.goto(url)
await hi.evaluate(() => document.fonts.ready)
const phones = await hi.locator('.phone-col .phone').all()
if (phones.length !== names.length) throw new Error(`expected ${names.length} phones, found ${phones.length}`)
for (const [i, phone] of phones.entries()) await phone.screenshot({ path: `docs/design/${names[i]}.png` })

await browser.close()
