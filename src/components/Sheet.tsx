import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Bottom sheet over a dimmed page. Closes on backdrop tap, Escape or the close button.
export function Sheet({
  title,
  subtitle,
  testId,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  testId: string
  onClose: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Focus the sheet on open and give focus back to the page on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => before?.focus()
  }, [])

  // Lock page scroll while open; restore the previous inline values on close.
  useEffect(() => {
    const html = document.documentElement.style
    const body = document.body.style
    const savedHtml = html.overflow
    const savedBody = body.overflow
    html.overflow = 'hidden'
    body.overflow = 'hidden'
    return () => {
      html.overflow = savedHtml
      body.overflow = savedBody
    }
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep Tab inside the sheet: wrap from the last control to the first and back.
  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !panel.current) return
    const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        tabIndex={-1}
        ref={panel}
        onKeyDown={trapTab}
      >
        <div className="sheet-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="sheet-sub">{subtitle}</p>}
          </div>
          <button className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
