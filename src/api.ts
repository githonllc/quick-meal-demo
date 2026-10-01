import type { HomeData, MenuView, SearchResponse } from '../shared/types'

async function get<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(params)
  // Lets us demo the error state with /quick-meal?fail=1
  if (new URLSearchParams(window.location.search).get('fail') === '1') query.set('fail', '1')
  const qs = query.toString()
  const res = await fetch(qs ? `${path}?${qs}` : path, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Request failed')
  }
  return (await res.json()) as T
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
