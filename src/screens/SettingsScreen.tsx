import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatCents, formatMiles, pluralize } from '../../shared/format'
import { DEFAULT_RANGES, draftRange, rangeError, rangeLimits, rangeParam } from '../../shared/ranges'
import type { Range, RangeDraft, RangeKind } from '../../shared/ranges'
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

// The text of the boxes for a saved range.
const toDraft = (r: Range): RangeDraft => ({ min: String(r.min), max: String(r.max), step: String(r.step) })

// From and To are typed in, Step is picked. Nothing is saved until Apply (or Enter), and only a
// valid range that differs from the saved one can be applied. An invalid one says why.
function RangeInputs({ kind, range, onApply }: { kind: RangeKind; range: Range; onApply: (r: Range) => void }) {
  const { low, high, grid, steps } = rangeLimits(kind)
  const saved = rangeParam(range)
  const [draft, setDraft] = useState(() => toDraft(range))
  // A new saved range (Apply, Restore default settings) resets the boxes.
  const [seen, setSeen] = useState(saved)
  if (seen !== saved) {
    setSeen(saved)
    setDraft(toDraft(range))
  }
  const error = rangeError(kind, draft)
  const next = draftRange(draft)
  const canApply = error === null && rangeParam(next) !== saved
  const errorId = `${kind}-error`
  const show = (v: number) => (kind === 'time' ? `${v} min` : formatMiles(v))
  const unit = kind === 'time' ? 'min' : 'mi'
  const box = (field: 'min' | 'max', label: string, testId: string) => (
    <label>
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={low}
        max={high}
        step={grid}
        value={draft[field]}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        data-testid={`${kind}-${testId}`}
        onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
      />
    </label>
  )
  return (
    <form
      className="set-range"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (canApply) onApply(next)
      }}
    >
      <div className="set-range-row">
        {box('min', `From (${unit})`, 'from')}
        {box('max', `To (${unit})`, 'to')}
        <label>
          <span>Step</span>
          <select
            value={draft.step}
            data-testid={`${kind}-step`}
            onChange={(e) => setDraft({ ...draft, step: e.target.value })}
          >
            {steps.map((v) => (
              <option key={v} value={String(v)}>
                {show(v)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="set-range-error" id={errorId} role="status" data-testid={`${kind}-error`}>
        {error}
      </p>
      <button type="submit" className="opt set-wide" disabled={!canApply} data-testid={`${kind}-apply`}>
        Apply
      </button>
    </form>
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

  // Bumped by Restore default settings, so the range boxes also drop typed text that was never applied.
  const [restored, setRestored] = useState(0)
  const restoreDefaults = () => {
    if (!sameRanges(config)) forgetDefault()
    resetConfig()
    setRestored((n) => n + 1)
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
        <RangeInputs key={`time-${restored}`} kind="time" range={config.time} onApply={(r) => setRange('time', r)} />
      </Group>

      <Group title="Distance range" help="The stops of the Pickup distance slider.">
        <RangeInputs key={`distance-${restored}`} kind="distance" range={config.distance} onApply={(r) => setRange('distance', r)} />
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
