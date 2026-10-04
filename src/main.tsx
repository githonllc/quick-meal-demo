import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyLayoutParam } from './state/config'

// Before the first render, so a study link never shows the other layout first.
applyLayoutParam(window.location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
