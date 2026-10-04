import { useEffect, useState } from 'react'
import { load } from '../model/migrate'
import type { Doc } from '../model/schema'
import { resolve } from '../model/variants'
import { PAGE_MM, Page, type Fit } from '../render/Page'
import { loadThemeFonts } from '../render/fonts'
import { readDoc } from '../store/persist'
import './print.css'

type Injected = { __MARBRE_DOC__?: unknown; __MARBRE_READY__?: boolean; __MARBRE_FIT__?: Fit }

export function PrintView({ id, variant, auto }: { id: string; variant: string | null; auto?: boolean }) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [ready, setReady] = useState(false)
  const w = window as unknown as Injected

  useEffect(() => {
    const source = w.__MARBRE_DOC__ ? Promise.resolve(load(w.__MARBRE_DOC__)) : readDoc(id)
    source.then(async (d) => {
      if (!d) return
      const resolved = resolve(d, variant)
      await loadThemeFonts(resolved.theme)
      setDoc(resolved)
      setReady(true)
    })
  }, [id, variant, w])

  useEffect(() => {
    if (!doc) return
    const size = PAGE_MM[doc.page.format]
    const style = document.createElement('style')
    style.textContent = `@page { size: ${size.w}mm ${size.h}mm; margin: 0 }`
    document.head.appendChild(style)
    document.title = doc.name
    return () => style.remove()
  }, [doc])

  if (!doc) return null
  return (
    <div className="mb-print">
      <Page
        doc={doc}
        onFit={(fit) => {
          w.__MARBRE_FIT__ = fit
          if (ready && !w.__MARBRE_READY__) {
            w.__MARBRE_READY__ = true
            if (auto) setTimeout(() => window.print(), 300)
          }
        }}
      />
    </div>
  )
}
