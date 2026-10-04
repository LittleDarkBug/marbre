import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Doc } from '../model/schema'
import { MM, PAGE_MM, Page } from '../render/Page'
import { loadDocFonts } from '../render/style'

export function FitPage({ doc, className, children, pageRef }: { doc: Doc; className?: string; children?: ReactNode; pageRef?: (el: HTMLDivElement | null) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [ready, setReady] = useState(false)
  const w = PAGE_MM[doc.page.format].w * MM
  const h = PAGE_MM[doc.page.format].h * MM
  useEffect(() => {
    let alive = true
    loadDocFonts(doc).then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [doc])
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  return (
    <div ref={box} className={`fit-page${ready ? ' is-ready' : ''} ${className ?? ''}`} style={{ height: h * scale }}>
      <div className="fit-page-scale" ref={pageRef} style={{ width: w, height: h, transform: `scale(${scale})` }}>
        <Page doc={doc} />
        {children}
      </div>
    </div>
  )
}
