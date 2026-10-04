import { useLayoutEffect, useState } from 'react'
import type { Doc } from '../model/schema'
import { MM } from '../render/Page'
import { useDoc } from '../store/doc'
import { currentScale, pageEl, pageRect, selectedEl, type Rect } from './geometry'
import { Thread } from './Thread'
import { useEditorUi } from './uiState'

const L = 9
const G = 3

function Crop({ r, strong }: { r: Rect; strong?: boolean }) {
  const x0 = r.x - G
  const y0 = r.y - G
  const x1 = r.x + r.w + G
  const y1 = r.y + r.h + G
  const d = [
    `M${x0 - L} ${y0}H${x0 - 2}M${x0} ${y0 - L}V${y0 - 2}`,
    `M${x1 + 2} ${y0}H${x1 + L}M${x1} ${y0 - L}V${y0 - 2}`,
    `M${x0 - L} ${y1}H${x0 - 2}M${x0} ${y1 + 2}V${y1 + L}`,
    `M${x1 + 2} ${y1}H${x1 + L}M${x1} ${y1 + 2}V${y1 + L}`,
  ].join('')
  return <path d={d} className={strong ? 'ov-crop' : 'ov-crop ov-crop-soft'} />
}

export function useSelectionRects(doc: Doc) {
  const selection = useDoc((s) => s.selection)
  const [rects, setRects] = useState<{ block?: Rect; item?: Rect }>({})
  useLayoutEffect(() => {
    const page = pageEl()
    if (!page || !selection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRects({})
      return
    }
    const run = () => {
      const scale = currentScale(page)
      const block = selectedEl({ blockId: selection.blockId })
      const item = selection.itemId ? selectedEl(selection) : null
      setRects({ block: block ? pageRect(block, page, scale) : undefined, item: item && item !== block ? pageRect(item, page, scale) : undefined })
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(page)
    const target = selectedEl(selection)
    if (target) ro.observe(target)
    return () => ro.disconnect()
  }, [doc, selection])
  return rects
}

function ColumnHandles({ doc }: { doc: Doc }) {
  const [edges, setEdges] = useState<number[]>([])
  useLayoutEffect(() => {
    const page = pageEl()
    if (!page) return
    const scale = currentScale(page)
    const cols = Array.from(page.querySelectorAll<HTMLElement>('[data-col]'))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEdges(cols.slice(0, -1).map((c) => { const r = pageRect(c, page, scale); return r.x + r.w }))
  }, [doc])
  if (doc.layout.mode !== 'flow' || doc.layout.columns.length < 2) return null
  return (
    <>
      {edges.map((x, i) => (
        <div
          key={i}
          className="ov-colhandle"
          style={{ left: x - 6 }}
          role="separator"
          aria-orientation="vertical"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const el = e.currentTarget
            el.setPointerCapture(e.pointerId)
            const startX = e.clientX
            const page = pageEl()!
            const scale = currentScale(page)
            const store = useDoc.getState()
            const left = doc.layout.columns[i]
            const right = doc.layout.columns[i + 1]
            const startL = left.width
            const startR = right.width
            const move = (ev: PointerEvent) => {
              const dmm = (ev.clientX - startX) / scale / MM
              store.edit((d) => {
                const l = d.layout.columns[i]
                const r = d.layout.columns[i + 1]
                if (r.unit === 'mm') r.width = Math.max(30, Math.round(startR - dmm))
                else if (l.unit === 'mm') l.width = Math.max(30, Math.round(startL + dmm))
                else {
                  const total = startL + startR
                  const pageW = page.offsetWidth / MM
                  const share = Math.min(0.85, Math.max(0.15, startL / total + dmm / pageW))
                  l.width = Math.round(share * total * 100) / 100
                  r.width = Math.round((1 - share) * total * 100) / 100
                }
              }, { merge: `col${i}` })
            }
            const up = () => {
              el.removeEventListener('pointermove', move)
              el.removeEventListener('pointerup', up)
            }
            el.addEventListener('pointermove', move)
            el.addEventListener('pointerup', up)
          }}
        />
      ))}
    </>
  )
}

export function Overlay({ doc }: { doc: Doc }) {
  const rects = useSelectionRects(doc)
  const thread = useEditorUi((s) => s.thread)
  const showThread = thread || doc.layout.mode === 'free' || Object.keys(doc.layout.frames).length > 0
  return (
    <div className="ov" aria-hidden="true">
      <svg className="ov-svg">
        {showThread && <Thread doc={doc} />}
        {rects.block && <Crop r={rects.block} strong={!rects.item} />}
        {rects.item && <Crop r={rects.item} strong />}
      </svg>
      <ColumnHandles doc={doc} />
    </div>
  )
}
