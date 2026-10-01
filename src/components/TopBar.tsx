import type { ReactNode } from 'react'
import { back } from '../router'

export function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function SlidersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}

export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <div className="topbar">
      <button className="icon-btn" aria-label="Back" onClick={() => back('/')}>
        <BackIcon />
      </button>
      {title && <h1>{title}</h1>}
      <div className="icon-btn">{right}</div>
    </div>
  )
}
