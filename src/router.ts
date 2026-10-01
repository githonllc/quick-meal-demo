import { useEffect, useState } from 'react'

export interface Route {
  path: string
  params: Record<string, string>
  query: URLSearchParams
}

const MENU_PATH = /^\/quick-meal\/restaurants\/([a-z0-9-]+)\/?$/

// Pure helper so the routing rules are easy to read: unknown paths fall back to Home.
export function matchRoute(pathname: string, search: string): Route {
  const query = new URLSearchParams(search)
  const menu = MENU_PATH.exec(pathname)
  if (menu) return { path: '/quick-meal/restaurants/:id', params: { id: menu[1] }, query }
  if (pathname.replace(/\/$/, '') === '/quick-meal') return { path: '/quick-meal', params: {}, query }
  return { path: '/', params: {}, query }
}

function read(): string {
  return window.location.pathname + window.location.search
}

export function useRoute(): Route {
  const [, setUrl] = useState(read)
  useEffect(() => {
    const onChange = () => setUrl(read())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return matchRoute(window.location.pathname, window.location.search)
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function back(fallback: string): void {
  if (history.length > 1) history.back()
  else navigate(fallback)
}
