import { describe, expect, it } from 'vitest'
import { CUISINES, PHOTO_KINDS } from '../shared/constants'
import { compareIds, menuView } from '../shared/menu'
import { priceItem, toSummary } from '../shared/pricing'
import type { Restaurant } from '../shared/types'
import { homeData } from '../worker/data/home'
import { RESTAURANTS } from '../worker/data/restaurants'
import { paseo } from './fixtures'

const DELIVERY_FEES = [0, 49, 99, 149, 199, 249, 299]
const SMALL_ORDER_FEES = [0, 250]
const PRICE_ENDINGS = [0, 25, 49, 50, 75, 95, 99]
const PHOTOS: readonly string[] = PHOTO_KINDS

// Items the design names. Their prices may end in any cents.
const PINNED_ITEMS: [restaurantId: string, itemName: string][] = [
  ['paseo-rice-bowl', 'Chicken Rice Bowl'],
  ['paseo-rice-bowl', 'Tofu Rice Bowl'],
  ['paseo-rice-bowl', 'Spam Musubi Plate'],
  ['paseo-rice-bowl', 'Veggie Bowl'],
  ['paseo-rice-bowl', 'Salmon Poke Bowl'],
  ['fourth-st-noodle-bar', 'Dan Dan Noodles'],
  ['fourth-st-noodle-bar', 'Wonton Soup'],
  ['taylor-st-dumplings', 'Pork Dumplings (12)'],
  ['santa-clara-taco-co', 'Chicken Tacos (2)'],
]

function find(id: string): Restaurant {
  const r = RESTAURANTS.find((x) => x.id === id)
  if (!r) throw new Error(`missing restaurant ${id}`)
  return r
}

function itemTotal(r: Restaurant, name: string): number {
  const item = r.menu.find((i) => i.name === name)
  if (!item) throw new Error(`missing item ${name} in ${r.id}`)
  return priceItem(item, r).totalCents
}

function minTotal(r: Restaurant): number {
  return Math.min(...r.menu.map((i) => priceItem(i, r).totalCents))
}

const open = RESTAURANTS.filter((r) => r.isOpen)

describe('dataset shape', () => {
  it('has 30 restaurants with unique ids', () => {
    expect(RESTAURANTS.length).toBe(30)
    expect(new Set(RESTAURANTS.map((r) => r.id)).size).toBe(30)
  })

  it('has exactly 2 closed restaurants', () => {
    expect(RESTAURANTS.filter((r) => !r.isOpen).length).toBe(2)
  })

  it('keeps distance, time, fees and tax in range', () => {
    for (const r of RESTAURANTS) {
      expect(r.distanceMi, r.id).toBeGreaterThanOrEqual(0.2)
      expect(r.distanceMi, r.id).toBeLessThanOrEqual(3.0)
      expect(r.etaMin, r.id).toBeGreaterThanOrEqual(12)
      expect(r.etaMin, r.id).toBeLessThanOrEqual(45)
      expect(DELIVERY_FEES, r.id).toContain(r.deliveryFeeCents)
      expect(SMALL_ORDER_FEES, r.id).toContain(r.smallOrderFeeCents)
      expect(r.taxRateBps, r.id).toBe(950)
    }
  })

  it('gives each restaurant 4 to 6 items with unique ids and known photos', () => {
    for (const r of RESTAURANTS) {
      expect(r.menu.length, r.id).toBeGreaterThanOrEqual(4)
      expect(r.menu.length, r.id).toBeLessThanOrEqual(6)
      expect(new Set(r.menu.map((i) => i.id)).size, r.id).toBe(r.menu.length)
      expect(PHOTOS, r.id).toContain(r.heroPhoto)
      for (const i of r.menu) expect(PHOTOS, `${r.id} ${i.id}`).toContain(i.photo)
    }
  })

  it('covers every cuisine', () => {
    const used = new Set(RESTAURANTS.flatMap((r) => r.cuisines))
    for (const c of CUISINES) expect(used.has(c.id), c.id).toBe(true)
  })

  it('uses Healthy and Fast Food as a second tag at least once each', () => {
    // A second tag is any tag after the first one.
    for (const id of ['healthy', 'fast-food'] as const) {
      expect(RESTAURANTS.some((r) => r.cuisines.slice(1).includes(id)), id).toBe(true)
    }
  })

  it('ends menu prices in allowed cents, except pinned items', () => {
    const isPinned = (rid: string, name: string) =>
      PINNED_ITEMS.some(([r, n]) => r === rid && n === name)
    for (const r of RESTAURANTS) {
      for (const i of r.menu) {
        if (isPinned(r.id, i.name)) continue
        expect(PRICE_ENDINGS, `${r.id} ${i.id} ${i.priceCents}`).toContain(i.priceCents % 100)
      }
    }
  })
})

describe('pinned restaurants', () => {
  it('copies Paseo Rice Bowl from the fixture', () => {
    expect(find('paseo-rice-bowl')).toEqual(paseo)
  })

  it('pins 4th St. Noodle Bar', () => {
    const r = find('fourth-st-noodle-bar')
    expect(r.name).toBe('4th St. Noodle Bar')
    expect(r.cuisines).toEqual(['chinese'])
    expect(r.rating).toBe(4.4)
    expect(r.ratingCount).toBe(1240)
    expect(r.distanceMi).toBe(0.3)
    expect(r.etaMin).toBe(19)
    // Dan Dan Noodles is the most liked item that fits $20.
    const lead = menuView(r, 2000, 'best').fits[0]
    expect(lead.item.name).toBe('Dan Dan Noodles')
    expect(lead.item.likePct).toBe(91)
    expect(lead.item.likeCount).toBe(240)
    expect(itemTotal(r, 'Wonton Soup')).toBeLessThanOrEqual(1500)
  })

  it('pins Taylor St. Dumplings', () => {
    const r = find('taylor-st-dumplings')
    expect(r.name).toBe('Taylor St. Dumplings')
    expect(r.cuisines).toEqual(['chinese'])
    expect(r.distanceMi).toBe(0.4)
    expect(r.etaMin).toBe(14)
    // 1700 would tie 4th St. Noodle Bar on score, so the total must stay under it.
    const pork = itemTotal(r, 'Pork Dumplings (12)')
    expect(pork).toBeGreaterThanOrEqual(1601)
    expect(pork).toBeLessThanOrEqual(1699)
    // Pork Dumplings is the cheapest item, so no item is at or under 1600.
    expect(minTotal(r)).toBe(pork)
  })

  it('pins Santa Clara Taco Co.', () => {
    const r = find('santa-clara-taco-co')
    expect(r.name).toBe('Santa Clara Taco Co.')
    expect(r.cuisines).toEqual(['mexican'])
    expect(r.distanceMi).toBe(0.9)
    expect(r.etaMin).toBe(16)
    expect(itemTotal(r, 'Chicken Tacos (2)')).toBeLessThanOrEqual(1500)
  })
})

describe('scenario guards', () => {
  it('has no open place with eta <= 15 and a meal total <= 1500', () => {
    // Otherwise the no-match scenario gets a third relax chip.
    const bad = open.filter((r) => r.etaMin <= 15 && minTotal(r) <= 1500).map((r) => r.id)
    expect(bad).toEqual([])
  })

  it('has no open place but Taylor St. Dumplings with eta <= 15, distance <= 0.5 and a meal total <= 1700', () => {
    const bad = open
      .filter((r) => r.id !== 'taylor-st-dumplings')
      .filter((r) => r.etaMin <= 15 && r.distanceMi <= 0.5 && minTotal(r) <= 1700)
      .map((r) => r.id)
    expect(bad).toEqual([])
  })
})

describe('homeData', () => {
  it('lists every cuisine with its label', () => {
    expect(homeData().cuisines).toEqual(CUISINES.map(({ id, label }) => ({ id, label })))
  })

  it('lists the 4 nearest open places as summaries', () => {
    const expected = [...open]
      .sort((a, b) => a.distanceMi - b.distanceMi || compareIds(a.id, b.id))
      .slice(0, 4)
      .map(toSummary)
    expect(expected.length).toBe(4)
    expect(homeData().nearCampus).toEqual(expected)
  })
})
