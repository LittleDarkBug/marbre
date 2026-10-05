import { lazy, Suspense } from 'react'
import { useRoute } from './app/router'
import './app/theme'
import { Home } from './home/Home'
import { useT } from './i18n'
import { Toaster } from './ui/toast'

const Editor = lazy(() => import('./editor/Editor').then((m) => ({ default: m.Editor })))
const PrintView = lazy(() => import('./print/PrintView').then((m) => ({ default: m.PrintView })))

export default function App() {
  const route = useRoute()
  const t = useT()
  return (
    <>
      <Suspense fallback={<div className="ed-loading" />}>
        {route.name === 'print' ? <PrintView id={route.id} variant={route.variant} auto={route.auto} /> : route.name === 'edit' ? <Editor id={route.id} /> : <Home />}
      </Suspense>
      {route.name !== 'print' && <Toaster closeLabel={t('ed.close')} />}
    </>
  )
}
