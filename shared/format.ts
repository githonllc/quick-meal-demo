export function formatCents(c: number): string {
  const whole = Math.floor(c / 100)
  const cents = c % 100
  return `$${whole}.${String(cents).padStart(2, '0')}`
}

export function formatDollars(d: number): string {
  return `$${d}`
}

export function formatMiles(m: number): string {
  return `${Number(m.toFixed(1))} mi`
}

// A display range. The high end is etaMin, the value the time filter compares.
export function formatEtaRange(etaMin: number): string {
  return `${Math.max(1, etaMin - 5)}–${etaMin} min`
}

export function formatPercentBps(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`
  return String(n)
}
