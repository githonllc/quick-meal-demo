import type { HomeData, MenuView, SearchResponse } from '../shared/types'
import { loadConfig } from './state/config'

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

// The Network switches of the demo settings act here: a delay before every answer, cached or not,
// and a simulated failure. The old /quick-meal?fail=1 link still fails too.
function request(path: string, params: URLSearchParams): { url: string; cacheable: boolean; delayMs: number } {
  const { network } = loadConfig()
  const query = new URLSearchParams(params)
  if (network.fail || new URLSearchParams(window.location.search).get('fail') === '1') query.set('fail', '1')
  const qs = query.toString()
  // Never cache the simulated failure, so every retry really asks the server again.
  return { url: qs ? `${path}?${qs}` : path, cacheable: query.get('fail') !== '1', delayMs: network.delayMs }
}

// Waits like a slow network. An abort stops the wait.
function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

async function get<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const { url, cacheable, delayMs } = request(path, params)
  if (delayMs > 0) await pause(delayMs, signal)
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

// The answer we already have for this search, if any, so a screen can show it in its first render.
export function cachedSearch(params: URLSearchParams): SearchResponse | undefined {
  // With a simulated delay or failure there is none, so the screen shows that it is loading.
  const { url, cacheable, delayMs } = request('/api/quick-meal/search', params)
  return cacheable && delayMs === 0 ? (cache.get(url) as SearchResponse | undefined) : undefined
}

export function getMenu(id: string, params: URLSearchParams, signal?: AbortSignal): Promise<MenuView> {
  return get(`/api/quick-meal/restaurants/${encodeURIComponent(id)}`, params, signal)
}
