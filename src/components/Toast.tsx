import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const ToastContext = createContext<(text: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((message: string) => {
    window.clearTimeout(timer.current)
    setText(message)
    timer.current = window.setTimeout(() => setText(null), 2500)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {text && (
        <div className="toast" data-testid="toast" role="status">
          {text}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return { show: useContext(ToastContext) }
}
