import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { analyze } from '../ats/analyze'
import { samplePage } from '../ats/measure'
import type { Doc } from '../model/schema'
import { MM, PAGE_MM, Page } from '../render/Page'
import { loadThemeFonts } from '../render/fonts'

type Pin = { n: number; x: number; y: number; bad: boolean }

export function LensDemo({ doc, caption }: { doc: Doc; caption: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [pins, setPins] = useState<Pin[]>([])
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
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])

  useEffect(() => {
    if (!ready) return
    const page = frame.current?.querySelector<HTMLElement>('.mb-page')
    if (!page) return
    const reading = analyze(doc, samplePage(page), null)
    const bad = new Set(reading.issues.filter((i) => i.block && i.severity !== 'info').map((i) => i.block!))
    const origin = page.getBoundingClientRect()
    const s = origin.width / page.offsetWidth
    const next = reading.minerOrder.flatMap((id, i) => {
      const el = page.querySelector(`[data-block="${CSS.escape(id)}"]`)
      if (!el) return []
      const r = el.getBoundingClientRect()
      return [{ n: i + 1, x: (r.left - origin.left) / s - 16, y: (r.top - origin.top) / s + 10, bad: bad.has(id) }]
    })
    setPins(next)
  }, [doc, ready, scale])

  return (
    <figure className="lens-demo">
      <div ref={frame} className="lens-frame" style={{ height: h * scale }}>
        <div className="lens-scale" style={{ width: w, transform: `scale(${scale})` }}>
          <Page doc={doc} />
          <svg className="lens-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            <path className="lens-line" d={pins.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('')} />
            {pins.map((p) => (
              <g key={p.n} className={p.bad ? 'lens-pin is-bad' : 'lens-pin'} transform={`translate(${p.x} ${p.y})`}>
                <circle r="11" />
                <text y="4">{p.n}</text>
              </g>
            ))}
          </svg>
        </div>
        <span className="crop crop-tl" aria-hidden="true" />
        <span className="crop crop-tr" aria-hidden="true" />
        <span className="crop crop-bl" aria-hidden="true" />
        <span className="crop crop-br" aria-hidden="true" />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
