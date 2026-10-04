import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/instrument-sans/700.css'
import '@fontsource/fragment-mono/400.css'
import './index.css'
import App from './App.tsx'
import { useAts } from './ats/store'
import { useDoc } from './store/doc'

Object.assign(window, { marbre: { store: useDoc, ats: useAts, importFile: (file: File) => import('./importer').then((m) => m.importFile(file, { lang: 'fr' })),
    importAndFit: async (file: File, template: string) => {
      const [{ importFile }, { applyTemplate }, { autoFit }, { saveDoc }] = await Promise.all([import('./importer'), import('./templates/apply'), import('./render/autofit'), import('./store/persist')])
      const r = await importFile(file, { lang: 'fr' })
      const fit = await autoFit(applyTemplate(r.doc, template))
      await saveDoc(fit.doc)
      return { id: fit.doc.id, scale: fit.scale, pages: fit.pages, fitted: fit.fitted }
    },
  } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
