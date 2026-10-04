import { useLayoutEffect, useState } from 'react'
import type { Doc } from '../model/schema'
import { currentScale, pageEl, pageRect, type Rect } from './geometry'

export function useBlockOrder(doc: Doc) {
  const [rects, setRects] = useState<{ id: string; r: Rect }[]>([])
  useLayoutEffect(() => {
    const page = pageEl()
    if (!page) return
    const run = () => {
      const scale = currentScale(page)
      setRects(Array.from(page.querySelectorAll<HTMLElement>('[data-block]')).map((el) => ({ id: el.dataset.block!, r: pageRect(el, page, scale) })))
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(page)
    return () => ro.disconnect()
  }, [doc])
  return rects
}

export function Thread({ doc, order, faulty }: { doc: Doc; order?: string[]; faulty?: Set<string> }) {
  const rects = useBlockOrder(doc)
  const byId = new Map(rects.map((x) => [x.id, x.r]))
  const ids = order ?? rects.map((x) => x.id)
  const points = ids.map((id) => byId.get(id)).filter((r): r is Rect => Boolean(r)).map((r) => ({ x: r.x - 14, y: r.y + 9 }))
  if (points.length < 2) return null
  return (
    <g className="thread">
      <path className="thread-line" d={points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('')} />
      {ids.map((id, i) => {
        const r = byId.get(id)
        if (!r) return null
        const bad = faulty?.has(id)
        return (
          <g key={id} className={bad ? 'thread-pin is-bad' : 'thread-pin'} transform={`translate(${r.x - 14} ${r.y + 9})`}>
            <circle r="8" />
            <text y="3.2">{i + 1}</text>
          </g>
        )
      })}
    </g>
  )
}
