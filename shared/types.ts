import type { CUISINES, SORTS, PHOTO_KINDS, TIME_STEPS, DISTANCE_STEPS } from './constants'

export type CuisineId = (typeof CUISINES)[number]['id']
export type SortId = (typeof SORTS)[number]['id']
export type PhotoKind = (typeof PHOTO_KINDS)[number]
export type TimeStep = (typeof TIME_STEPS)[number]
export type DistanceStep = (typeof DISTANCE_STEPS)[number]

export interface MenuItem {
  id: string
  name: string
  priceCents: number
  likePct: number
  likeCount: number
  photo: PhotoKind
}
export interface Restaurant {
  id: string
  name: string
  cuisines: CuisineId[]
  rating: number
  ratingCount: number
  distanceMi: number
  etaMin: number
  deliveryFeeCents: number
  smallOrderFeeCents: number
  taxRateBps: number
  isOpen: boolean
  heroPhoto: PhotoKind
  menu: MenuItem[]
}
export type RestaurantSummary = Omit<
  Restaurant,
  'menu' | 'deliveryFeeCents' | 'smallOrderFeeCents' | 'taxRateBps'
>
export interface Filters {
  budgetCents: number | null
  timeMin: TimeStep | null
  distanceMi: DistanceStep | null
  cuisine: CuisineId | null
  sort: SortId
}
export interface PriceBreakdown {
  itemCents: number
  deliveryFeeCents: number
  smallOrderFeeCents: number
  serviceFeeCents: number
  taxCents: number
  tipCents: number
  totalCents: number
  taxRateBps: number
}
export interface MealCard {
  restaurant: RestaurantSummary
  item: MenuItem
  price: PriceBreakdown
  moreCount: number
  moreNames: string[]
}
export interface Miss {
  filter: 'budget' | 'time' | 'distance'
  over: number // cents | minutes | miles
  label: string
}
export interface NearCard extends MealCard {
  miss: Miss[]
  score: number
}
export interface Relax {
  filter: 'budget' | 'time' | 'distance' | 'cuisine'
  to: number | null // dollars | minutes | miles | null = remove
  count: number
  label: string
}
export interface SearchResponse {
  filters: Filters
  total: number
  exact: MealCard[]
  near: NearCard[]
  relax: Relax[]
}
export interface MenuRow {
  item: MenuItem
  price: PriceBreakdown
  overCents: number
}
export interface MenuView {
  restaurant: RestaurantSummary
  budgetCents: number | null
  sort: SortId
  pickup: boolean
  fits: MenuRow[]
  over: MenuRow[]
}
export interface HomeData {
  cuisines: { id: CuisineId; label: string }[]
  nearCampus: RestaurantSummary[]
}
