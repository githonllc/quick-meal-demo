import type { Filters, MenuItem, PhotoKind, Restaurant } from '../shared/types'

// Most fixtures use no delivery fee, no small-order fee and no tax.
// Then, for a price that is a multiple of 100, total = price + 15% service + 15% tip = 1.3 x price.

export function item(
  id: string,
  name: string,
  priceCents: number,
  likePct: number,
  photo: PhotoKind = 'bowl',
): MenuItem {
  return { id, name, priceCents, likePct, likeCount: 50, photo }
}

export function makeRestaurant(p: Partial<Restaurant> & Pick<Restaurant, 'id'>): Restaurant {
  return {
    name: p.id,
    cuisines: ['fast-food'],
    rating: 4.5,
    ratingCount: 100,
    distanceMi: 1,
    etaMin: 20,
    deliveryFeeCents: 0,
    smallOrderFeeCents: 0,
    taxRateBps: 0,
    isOpen: true,
    heroPhoto: 'bowl',
    menu: [],
    ...p,
  }
}

export function filters(p: Partial<Filters> = {}): Filters {
  return { budgetCents: null, timeMin: null, distanceMi: null, cuisine: null, sort: 'fastest', ...p }
}

// Totals: chicken 1873, tofu 1948, musubi 1565, veggie 2054, salmon 2362 (see pricing.test.ts).
export const paseo: Restaurant = {
  id: 'paseo-rice-bowl',
  name: 'Paseo Rice Bowl',
  cuisines: ['healthy'],
  rating: 4.6,
  ratingCount: 812,
  distanceMi: 0.4,
  etaMin: 18,
  deliveryFeeCents: 199,
  smallOrderFeeCents: 250,
  taxRateBps: 950,
  isOpen: true,
  heroPhoto: 'bowl',
  menu: [
    { id: 'chicken-bowl', name: 'Chicken Rice Bowl', priceCents: 1200, likePct: 88, likeCount: 120, photo: 'bowl' },
    { id: 'tofu-bowl', name: 'Tofu Rice Bowl', priceCents: 1075, likePct: 82, likeCount: 64, photo: 'bowl' },
    { id: 'musubi-plate', name: 'Spam Musubi Plate', priceCents: 800, likePct: 79, likeCount: 40, photo: 'rice' },
    { id: 'veggie-bowl', name: 'Veggie Bowl', priceCents: 1150, likePct: 85, likeCount: 51, photo: 'salad' },
    { id: 'salmon-poke', name: 'Salmon Poke Bowl', priceCents: 1550, likePct: 91, likeCount: 77, photo: 'poke' },
  ],
}

// Healthy, a bit slow and far. kale 1100 -> 1430, grain 1300 -> 1690.
export const greenLeaf = makeRestaurant({
  id: 'green-leaf',
  name: 'Green Leaf',
  cuisines: ['healthy'],
  rating: 4.4,
  distanceMi: 0.9,
  etaMin: 19,
  heroPhoto: 'salad',
  menu: [item('kale-salad', 'Kale Salad', 1100, 75, 'salad'), item('grain-bowl', 'Grain Bowl', 1300, 83)],
})

// Mexican, close and fast. taco 800 -> 1040, burrito 1000 -> 1300.
export const tacoLoco = makeRestaurant({
  id: 'taco-loco',
  name: 'Taco Loco',
  cuisines: ['mexican'],
  rating: 4.3,
  distanceMi: 0.3,
  etaMin: 12,
  heroPhoto: 'taco',
  menu: [item('taco-plate', 'Taco Plate', 800, 80, 'taco'), item('burrito', 'Burrito', 1000, 86, 'burrito')],
})

// Indian, eta 25. Delivery fee 80, no small-order fee because items are >= 1200.
// butter 1200 + 80 + 180 + 180 = 1640. paneer 1400 + 80 + 210 + 210 = 1900.
export const curryHouse = makeRestaurant({
  id: 'curry-house',
  name: 'Curry House',
  cuisines: ['indian'],
  rating: 4.2,
  distanceMi: 0.8,
  etaMin: 25,
  deliveryFeeCents: 80,
  heroPhoto: 'curry',
  menu: [
    item('butter-chicken', 'Butter Chicken', 1200, 84, 'curry'),
    item('paneer-tikka', 'Paneer Tikka', 1400, 87, 'curry'),
  ],
})

// Pizza, 2.5 mi away. margherita 1000 -> 1300.
export const sliceHouse = makeRestaurant({
  id: 'slice-house',
  name: 'Slice House',
  cuisines: ['pizza'],
  rating: 4.1,
  distanceMi: 2.5,
  etaMin: 20,
  heroPhoto: 'pizza',
  menu: [item('margherita', 'Margherita Slice', 1000, 84, 'pizza')],
})

// Burgers, far, slow and expensive.
// double 3100 -> 3100 + 465 + 465 = 4030. wagyu 3200 -> 4160.
export const farBurger = makeRestaurant({
  id: 'far-burger',
  name: 'Far Burger',
  cuisines: ['burgers'],
  rating: 4.0,
  distanceMi: 3.6,
  etaMin: 50,
  heroPhoto: 'burger',
  menu: [
    item('double-burger', 'Double Burger', 3100, 70, 'burger'),
    item('wagyu-burger', 'Wagyu Burger', 3200, 90, 'burger'),
  ],
})

// Closed. The only sushi place. Cheap, fast and close, so it would win if it were open.
// roll 600 -> 780.
export const sakuraClosed = makeRestaurant({
  id: 'sakura-sushi',
  name: 'Sakura Sushi',
  cuisines: ['sushi', 'healthy'],
  rating: 4.9,
  distanceMi: 0.2,
  etaMin: 10,
  isOpen: false,
  heroPhoto: 'sushi',
  menu: [item('salmon-roll', 'Salmon Roll', 600, 95, 'sushi')],
})

export const restaurants: Restaurant[] = [
  paseo,
  greenLeaf,
  tacoLoco,
  curryHouse,
  sliceHouse,
  farBurger,
  sakuraClosed,
]

// For card sort tests. One item each. Listed so that every tie pair is in reverse id order.
// Totals: a 1300, b 1170, c 1300, d 1560, e 1040.
export const sortList: Restaurant[] = [
  makeRestaurant({ id: 'r-e', rating: 4.5, etaMin: 15, distanceMi: 3, menu: [item('e1', 'E1', 800, 80)] }),
  makeRestaurant({ id: 'r-d', rating: 4.5, etaMin: 15, distanceMi: 1, menu: [item('d1', 'D1', 1200, 80)] }),
  makeRestaurant({ id: 'r-c', rating: 4.5, etaMin: 20, distanceMi: 1, menu: [item('c1', 'C1', 1000, 80)] }),
  makeRestaurant({ id: 'r-b', rating: 4.8, etaMin: 10, distanceMi: 0.5, menu: [item('b1', 'B1', 900, 80)] }),
  makeRestaurant({ id: 'r-a', rating: 4.0, etaMin: 30, distanceMi: 2, menu: [item('a1', 'A1', 1000, 90)] }),
]
