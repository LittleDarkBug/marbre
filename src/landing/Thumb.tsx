import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Doc } from '../model/schema'
import { MM, PAGE_MM, Page } from '../render/Page'
import { loadThemeFonts } from '../render/fonts'

export function Thumb({ doc }: { doc: Doc }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [ready, setReady] = useState(false)
  const w = PAGE_MM[doc.page.format].w * MM
  const h = PAGE_MM[doc.page.format].h * MM
  useEffect(() => {
    let alive = true
    loadThemeFonts(doc.theme).then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [doc])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  return (
    <div ref={ref} className={`thumb${ready ? ' is-ready' : ''}`} style={{ height: h * scale }} aria-hidden="true">
      <div className="thumb-scale" style={{ width: w, transform: `scale(${scale})` }}>
        <Page doc={doc} />
      </div>
    </div>
  )
}
