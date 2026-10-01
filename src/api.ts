import type { HomeData, MenuView, SearchResponse } from '../shared/types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Successful answers by full request URL. The mock data never changes while the app runs,
// so a cached answer is always right. A real backend would need a short expiry here.
const cache = new Map<string, unknown>()

async function get<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(params)
  // Lets us demo the error state with /quick-meal?fail=1
  if (new URLSearchParams(window.location.search).get('fail') === '1') query.set('fail', '1')
  const qs = query.toString()
  const url = qs ? `${path}?${qs}` : path
  // Never cache the simulated failure, so every retry really asks the server again.
  const cacheable = query.get('fail') !== '1'
  if (cacheable && cache.has(url)) return cache.get(url) as T
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error ?? 'Request failed', res.status)
  }
  const data = (await res.json()) as T
  if (cacheable) cache.set(url, data)
  return data
}

export function getHome(signal?: AbortSignal): Promise<HomeData> {
  return get('/api/home', new URLSearchParams(), signal)
}

export function searchMeals(params: URLSearchParams, signal?: AbortSignal): Promise<SearchResponse> {
  return get('/api/quick-meal/search', params, signal)
}

export function getMenu(id: string, params: URLSearchParams, signal?: AbortSignal): Promise<MenuView> {
  return get(`/api/quick-meal/restaurants/${encodeURIComponent(id)}`, params, signal)
}
