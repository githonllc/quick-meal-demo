import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatCents, pluralize } from '../../shared/format'
import { useToast } from '../components/Toast'
import { TopBar } from '../components/TopBar'
import { DELAYS, resetConfig, saveConfig, useConfig } from '../state/config'
import type { DemoConfig, Layout } from '../state/config'
import { forgetDefault } from '../state/savedDefault'
import { cancelTrial, clearResults, formatSeconds, loadResults, toCsv } from '../state/study'
import './quick-meal.css'
import './settings.css'

const LAYOUT_LABELS: Record<Layout, string> = { meals: 'Dish first', places: 'Restaurant first' }

function delayLabel(ms: number): string {
  return ms === 0 ? 'None' : formatSeconds(ms)
}

// One on/off row. The label is the switch's name.
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button className="set-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className="set-switch" aria-hidden="true" />
    </button>
  )
}

function Group({ title, help, children }: { title: string; help?: string; children?: ReactNode }) {
  return (
    <section className="grp">
      <h3>{title}</h3>
      {help && <p className="grp-help set-help">{help}</p>}
      {children}
    </section>
  )
}

// The internal settings for the research team: layout, saved filters, study timer, network.
export function SettingsScreen() {
  const config = useConfig()
  const { show } = useToast()
  const [results, setResults] = useState(loadResults)
  const set = (change: Partial<DemoConfig>) => saveConfig({ ...config, ...change })

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(toCsv(results))
      show(`Copied ${pluralize(results.length, 'result', 'results')} as CSV.`)
    } catch {
      show('Could not copy. The browser blocked the clipboard.')
    }
  }

  const clear = () => {
    clearResults()
    setResults([])
    show('Results cleared.')
  }

  // Keeps the settings. Clears what a student left behind.
  const resetState = () => {
    forgetDefault()
    clearResults()
    cancelTrial()
    setResults([])
    show('Demo state reset.')
  }

  const restoreDefaults = () => {
    resetConfig()
    show('Default settings restored.')
  }

  return (
    <>
      <TopBar title="Demo settings" fallback="/quick-meal" />
      <p className="set-banner" data-testid="settings-banner">
        For the research team. Not part of the student app.
      </p>

      <Group title="Layout" help="What the Quick Meal list shows first.">
        <div className="seg" role="radiogroup" aria-label="Layout">
          {(['meals', 'places'] as const).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={config.layout === l}
              className={config.layout === l ? 'seg-opt on' : 'seg-opt'}
              data-testid={`layout-${l}`}
              onClick={() => set({ layout: l })}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
      </Group>

      <Group
        title="Save filters"
        help="On: applied filters are saved and Quick Meal opens with them. Off: nothing is loaded or saved."
      >
        <Toggle label="Save filters" on={config.saveFilters} onChange={(saveFilters) => set({ saveFilters })} />
      </Group>

      <Group
        title="Study timer"
        help="Times each try from opening Quick Meal to the first Add to cart. Going Home or opening these settings cancels a try."
      >
        <Toggle label="Study timer" on={config.study} onChange={(study) => set({ study })} />
        <p className="set-count" data-testid="study-count">
          {pluralize(results.length, 'result', 'results')}
        </p>
        {results.length > 0 && (
          <ol className="set-results">
            {results.map((r) => (
              <li key={r.id} data-testid="study-row">
                <b>{formatSeconds(r.ms)}</b> · {LAYOUT_LABELS[r.layout]} · {r.path}
                <br />
                {r.item}, {r.restaurant} · {formatCents(r.totalCents)}
                {r.firstOpenMs !== null && ` · first open ${formatSeconds(r.firstOpenMs)}`}
              </li>
            ))}
          </ol>
        )}
        <div className="set-actions">
          <button className="opt" disabled={results.length === 0} onClick={copyCsv}>
            Copy CSV
          </button>
          <button className="opt" disabled={results.length === 0} onClick={clear}>
            Clear results
          </button>
        </div>
      </Group>

      <Group title="Network" help="Slows down or fails every request, to show the loading and error states.">
        <div className="opts" role="radiogroup" aria-label="Delay">
          {DELAYS.map((ms) => (
            <button
              key={ms}
              role="radio"
              aria-checked={config.network.delayMs === ms}
              className={config.network.delayMs === ms ? 'opt on' : 'opt'}
              data-testid={`delay-${ms}`}
              onClick={() => set({ network: { ...config.network, delayMs: ms } })}
            >
              {delayLabel(ms)}
            </button>
          ))}
        </div>
        <Toggle
          label="Fail every request"
          on={config.network.fail}
          onChange={(fail) => set({ network: { ...config.network, fail } })}
        />
      </Group>

      <Group title="Reset demo state" help="Clears saved filters, the one-time Saved message and study results. Keeps these settings.">
        <button className="opt set-wide" onClick={resetState}>
          Reset demo state
        </button>
      </Group>

      <Group title="Restore default settings" help="Dish first, Save filters on, Study timer off, no delay or failure.">
        <button className="opt set-wide" onClick={restoreDefaults}>
          Restore default settings
        </button>
      </Group>
    </>
  )
}
