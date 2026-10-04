import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatCents, formatMiles, pluralize } from '../../shared/format'
import { DEFAULT_RANGES, isValidRange, rangeParam, stepsOf } from '../../shared/ranges'
import type { Range, RangeKind } from '../../shared/ranges'
import { useToast } from '../components/Toast'
import { TopBar } from '../components/TopBar'
import { DELAYS, resetConfig, saveConfig, useConfig } from '../state/config'
import type { DemoConfig, Layout } from '../state/config'
import { forgetDefault } from '../state/savedDefault'
import { cancelTrial, clearResults, formatSeconds, loadResults, toCsv } from '../state/study'
import './quick-meal.css'
import './settings.css'

const LAYOUT_LABELS: Record<Layout, string> = { meals: 'Dish first', places: 'Restaurant first' }
const LAYOUT_HELP: Record<Layout, string> = {
  places: 'One place per card, with the meals that fit.',
  meals: 'One meal and its all-in price per card.',
}

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

// The choices of the range selects. Each select only offers values that make a valid range
// with the other two (shared/ranges.ts), so every pick is valid.
const RANGE_CHOICES: Record<RangeKind, { values: number[]; steps: number[]; show: (v: number) => string }> = {
  time: { values: stepsOf({ min: 5, max: 90, step: 1 }), steps: [1, 5, 10, 15], show: (v) => `${v} min` },
  distance: { values: stepsOf({ min: 0.5, max: 10, step: 0.5 }), steps: [0.5, 1], show: formatMiles },
}

function RangeSelects({ kind, range, onChange }: { kind: RangeKind; range: Range; onChange: (r: Range) => void }) {
  const { values, steps, show } = RANGE_CHOICES[kind]
  const fields = [
    { field: 'min', label: 'From', options: values },
    { field: 'max', label: 'To', options: values },
    { field: 'step', label: 'Step', options: steps },
  ] as const
  return (
    <div className="set-range">
      {fields.map(({ field, label, options }) => (
        <label key={field}>
          <span>{label}</span>
          <select
            value={range[field]}
            data-testid={`${kind}-${field}`}
            onChange={(e) => onChange({ ...range, [field]: Number(e.target.value) })}
          >
            {options
              .filter((v) => isValidRange(kind, { ...range, [field]: v }))
              .map((v) => (
                <option key={v} value={v}>
                  {show(v)}
                </option>
              ))}
          </select>
        </label>
      ))}
    </div>
  )
}

const sameRanges = (c: DemoConfig) =>
  rangeParam(c.time) === rangeParam(DEFAULT_RANGES.time) &&
  rangeParam(c.distance) === rangeParam(DEFAULT_RANGES.distance)

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

  // A new range clears the saved filters: a saved time or distance may not be a stop of it.
  const setRange = (kind: RangeKind, r: Range) => {
    set(kind === 'time' ? { time: r } : { distance: r })
    forgetDefault()
  }

  const restoreDefaults = () => {
    if (!sameRanges(config)) forgetDefault()
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
        <div className="set-radios" role="radiogroup" aria-label="Layout">
          {(['places', 'meals'] as const).map((l) => (
            <label key={l} className="set-radio">
              <input
                type="radio"
                name="layout"
                value={l}
                checked={config.layout === l}
                data-testid={`layout-${l}`}
                onChange={() => set({ layout: l })}
              />
              <span>
                <b>{LAYOUT_LABELS[l]}</b>
                <small>{LAYOUT_HELP[l]}</small>
              </span>
            </label>
          ))}
        </div>
      </Group>

      <Group title="Time range" help="The stops of the Delivery time slider.">
        <RangeSelects kind="time" range={config.time} onChange={(r) => setRange('time', r)} />
      </Group>

      <Group title="Distance range" help="The stops of the Pickup distance slider.">
        <RangeSelects kind="distance" range={config.distance} onChange={(r) => setRange('distance', r)} />
        <p className="grp-help" data-testid="range-note">
          Changing a range clears the saved filters.
        </p>
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

      <Group title="Restore default settings" help="Restaurant first, time 15 to 45 min by 1, distance 0.5 to 5 mi by 0.5, Save filters on, Study timer off, no delay or failure.">
        <button className="opt set-wide" onClick={restoreDefaults}>
          Restore default settings
        </button>
      </Group>
    </>
  )
}
