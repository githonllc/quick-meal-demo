import type { SortId } from './types';

export const BUDGET_MIN = 10; // dollars
export const BUDGET_MAX = 40; // dollars; the slider's max means "any budget" (null)
export const TIME_STEPS = [15, 20, 30, 45] as const;
export const DISTANCE_STEPS = [0.5, 1, 2, 3] as const;
export const SERVICE_FEE_BPS = 1500; // 15%
export const TIP_BPS = 1500; // 15%
export const SMALL_ORDER_THRESHOLD_CENTS = 1200;
export const NEAR_LIMIT = 5;
export const SCORE_BUDGET_CENTS = 500; // 1 score point per $5 over
export const SCORE_TIME_MIN = 10; // 1 point per 10 min over
export const SCORE_DISTANCE_MI = 1; // 1 point per 1 mi over
export const CUISINES = [
  { id: 'chinese', label: 'Chinese' },
  { id: 'indian', label: 'Indian' },
  { id: 'mexican', label: 'Mexican' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'burgers', label: 'Burgers' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'fast-food', label: 'Fast Food' },
  { id: 'sushi', label: 'Sushi' },
] as const;
// Every sort uses a number the card shows (design P2). These are all the sorts the API knows.
export const SORTS = [
  { id: 'fastest', label: 'Fastest' },
  { id: 'price', label: 'Lowest price' },
  { id: 'liked', label: 'Most liked' },
  { id: 'nearest', label: 'Nearest' },
] as const;
// Each side shows 3 sorts. Delivery has no Nearest and Pickup has no Fastest.
// The first sort of each side is its default.
export const DELIVERY_SORT_IDS = ['fastest', 'price', 'liked'] as const;
export const PICKUP_SORT_IDS = ['nearest', 'price', 'liked'] as const;

// The asked sort if the side has it, otherwise the side's default.
// So an old sort=best link, or a sort from the other side, gets a sort the side shows.
export function sortFor(raw: string | null | undefined, pickup: boolean): SortId {
  const ids: readonly SortId[] = pickup ? PICKUP_SORT_IDS : DELIVERY_SORT_IDS;
  return ids.find((id) => id === raw) ?? ids[0];
}
export const PHOTO_KINDS = [
  'bowl',
  'noodles',
  'dumplings',
  'soup',
  'taco',
  'burrito',
  'burger',
  'fries',
  'pizza',
  'salad',
  'sushi',
  'curry',
  'sandwich',
  'chicken',
  'poke',
  'rice',
] as const;
