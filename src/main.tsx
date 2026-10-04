import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/schibsted-grotesk/900.css'
import '@fontsource/fragment-mono/400.css'
import './index.css'
import App from './App.tsx'
import { useAts } from './ats/store'
import { useDoc } from './store/doc'

Object.assign(window, { marbre: { store: useDoc, ats: useAts } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
