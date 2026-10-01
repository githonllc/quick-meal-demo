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
export const SORTS = [
  { id: 'best', label: 'Best match' },
  { id: 'price', label: 'Lowest price' },
  { id: 'fastest', label: 'Fastest' },
  { id: 'nearest', label: 'Nearest' },
] as const;
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
