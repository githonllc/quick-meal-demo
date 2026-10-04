import { useEffect, useState } from 'react'
import { DEFAULT_RANGES, isValidRange } from '../../shared/ranges'
import type { Range } from '../../shared/ranges'
import { browserStorage } from './savedDefault'
import type { Store } from './savedDefault'

// The demo settings for the research team. One key in local storage.
const KEY = 'quickMeal.config.v1'

// Dish cards (the main design) or restaurant cards.
export type Layout = 'meals' | 'places'
export const LAYOUTS: readonly Layout[] = ['meals', 'places']
export const DELAYS = [0, 500, 1500, 3000] as const

export interface DemoConfig {
  layout: Layout
  time: Range
  distance: Range
  saveFilters: boolean
  study: boolean
  network: { delayMs: (typeof DELAYS)[number]; fail: boolean }
}

export const DEFAULT_CONFIG: DemoConfig = {
  layout: 'meals',
  time: DEFAULT_RANGES.time,
  distance: DEFAULT_RANGES.distance,
  saveFilters: true,
  study: false,
  network: { delayMs: 0, fail: false },
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}

function parseJson(raw: string | null | undefined): unknown {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Field by field: a bad field gets its default, the good ones stay.
export function parseConfig(raw: string | null | undefined): DemoConfig {
  const v = parseJson(raw)
  if (!isObject(v)) return DEFAULT_CONFIG
  const d = DEFAULT_CONFIG
  const net: Record<string, unknown> = isObject(v.network) ? v.network : {}
  return {
    layout: LAYOUTS.find((l) => l === v.layout) ?? d.layout,
    time: isValidRange('time', v.time) ? { min: v.time.min, max: v.time.max, step: v.time.step } : d.time,
    distance: isValidRange('distance', v.distance)
      ? { min: v.distance.min, max: v.distance.max, step: v.distance.step }
      : d.distance,
    saveFilters: bool(v.saveFilters, d.saveFilters),
    study: bool(v.study, d.study),
    network: {
      delayMs: DELAYS.find((ms) => ms === net.delayMs) ?? d.network.delayMs,
      fail: bool(net.fail, d.network.fail),
    },
  }
}

// The last config saved in this tab, and the store it went to (tests pass their own stores).
let current: { store: Store | null; config: DemoConfig } | null = null

// Storage is read until this tab saves a config. After that the saved one is used.
export function loadConfig(store = browserStorage()): DemoConfig {
  if (current && current.store === store) return current.config
  try {
    return parseConfig(store?.getItem(KEY))
  } catch {
    return DEFAULT_CONFIG
  }
}

// Screens that show the config re-render when it changes in this tab.
const listeners = new Set<(c: DemoConfig) => void>()

export function saveConfig(c: DemoConfig, store = browserStorage()): void {
  current = { store, config: c }
  try {
    store?.setItem(KEY, JSON.stringify(c))
  } catch {
    // No storage: the change holds in this tab until the page reloads.
  }
  for (const listener of listeners) listener(c)
}

export function resetConfig(store = browserStorage()): void {
  saveConfig(DEFAULT_CONFIG, store)
}

// A study link can carry ?layout=meals or ?layout=places on any page. It is saved, so it stays.
export function applyLayoutParam(search: string, store = browserStorage()): void {
  const layout = LAYOUTS.find((l) => l === new URLSearchParams(search).get('layout'))
  if (!layout) return
  const c = loadConfig(store)
  if (c.layout !== layout) saveConfig({ ...c, layout }, store)
}

export function useConfig(): DemoConfig {
  const [config, setConfig] = useState(() => loadConfig())
  useEffect(() => {
    listeners.add(setConfig)
    return () => {
      listeners.delete(setConfig)
    }
  }, [])
  return config
}
