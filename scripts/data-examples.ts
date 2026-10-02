// Prints docs/data-examples.md: the real numbers behind the examples in the design.
// Run: npx tsx scripts/data-examples.ts > docs/data-examples.md
import { formatCents } from '../shared/format'
import { priceItem } from '../shared/pricing'
import { search } from '../shared/search'
import type { Restaurant } from '../shared/types'
import { RESTAURANTS } from '../worker/data/restaurants'

function itemTotal(restaurantId: string, itemName: string): string {
  const r = RESTAURANTS.find((x: Restaurant) => x.id === restaurantId)
  const item = r?.menu.find((i) => i.name === itemName)
  if (!r || !item) throw new Error(`missing ${restaurantId} / ${itemName}`)
  return formatCents(priceItem(item, r).totalCents)
}

const res = search(RESTAURANTS, {
  budgetCents: 1500,
  timeMin: 15,
  distanceMi: null,
  cuisine: null,
  sort: 'fastest',
})

const lines: string[] = [
  '# Data examples',
  '',
  'Real values computed from `worker/data/restaurants.ts`.',
  'Regenerate with `npx tsx scripts/data-examples.ts > docs/data-examples.md`.',
  '',
  '## No-match scenario: budget $15, time 15 min',
  '',
  `Exact results: ${res.total}. Near cards, in order:`,
  '',
  '| # | Restaurant | Item | Total | Miss | Score |',
  '|---|---|---|---|---|---|',
  ...res.near.map(
    (c, i) =>
      `| ${i + 1} | ${c.restaurant.name} | ${c.item.name} | ${formatCents(c.price.totalCents)} | ` +
      `${c.miss.map((m) => m.label).join(', ')} | ${c.score.toFixed(3)} |`,
  ),
  '',
  `Relax chips: ${res.relax.map((r) => `"${r.label}"`).join(', ')}`,
  '',
  '## Pinned item totals',
  '',
  '| Restaurant | Item | Total |',
  '|---|---|---|',
  `| 4th St. Noodle Bar | Dan Dan Noodles | ${itemTotal('fourth-st-noodle-bar', 'Dan Dan Noodles')} |`,
  `| 4th St. Noodle Bar | Wonton Soup | ${itemTotal('fourth-st-noodle-bar', 'Wonton Soup')} |`,
  `| Santa Clara Taco Co. | Chicken Tacos (2) | ${itemTotal('santa-clara-taco-co', 'Chicken Tacos (2)')} |`,
  `| Taylor St. Dumplings | Pork Dumplings (12) | ${itemTotal('taylor-st-dumplings', 'Pork Dumplings (12)')} |`,
  '',
]

console.log(lines.join('\n'))
