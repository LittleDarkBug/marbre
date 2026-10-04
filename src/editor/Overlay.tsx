import { useLayoutEffect, useState } from 'react'
import type { Doc } from '../model/schema'
import { MM } from '../render/Page'
import { useDoc } from '../store/doc'
import { currentScale, pageEl, pageRect, selectedEl, type Rect } from './geometry'
import { Thread, useBlockOrder } from './Thread'
import { useAts } from '../ats/store'
import { useEditorUi } from './uiState'

const G = 4

function Crop({ r, strong }: { r: Rect; strong?: boolean }) {
  return <rect x={r.x - G} y={r.y - G} width={r.w + G * 2} height={r.h + G * 2} rx={6} className={strong ? 'ov-crop' : 'ov-crop ov-crop-soft'} />
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

function ProofMarks({ doc }: { doc: Doc }) {
  const reading = useAts((s) => s.reading)
  const rects = useBlockOrder(doc)
  const page = pageEl()
  if (!reading || !page) return null
  const width = page.offsetWidth
  const byId = new Map(rects.map((x) => [x.id, x.r]))
  const used = new Map<string, number>()
  return (
    <g className="proof">
      {reading.issues.map((issue, i) => {
        const r = issue.block ? byId.get(issue.block) : null
        if (!r) return null
        const k = used.get(issue.block!) ?? 0
        used.set(issue.block!, k + 1)
        const y = r.y + 8 + k * 18
        const x = width - 9
        return (
          <g key={i} className={`proof-mark is-${issue.severity}`}>
            <path d={`M${r.x + r.w + 2} ${y}H${x - 8}`} />
            <rect x={x - 8} y={y - 8} width="16" height="16" />
            <text x={x} y={y + 3.4}>{i + 1}</text>
          </g>
        )
      })}
    </g>
  )
}

function MultiCrops({ doc }: { doc: Doc }) {
  const multi = useDoc((s) => s.multi)
  const [rects, setRects] = useState<Rect[]>([])
  useLayoutEffect(() => {
    const page = pageEl()
    if (!page || multi.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRects([])
      return
    }
    const scale = currentScale(page)
    setRects(multi.flatMap((k) => { const el = selectedEl({ blockId: k }); return el ? [pageRect(el, page, scale)] : [] }))
  }, [doc, multi])
  return <>{rects.map((r, i) => <Crop key={i} r={r} strong />)}</>
}

export function Overlay({ doc }: { doc: Doc }) {
  const rects = useSelectionRects(doc)
  const thread = useEditorUi((s) => s.thread)
  const lens = useEditorUi((s) => s.lens)
  const reading = useAts((s) => s.reading)
  const showThread = thread || doc.layout.mode === 'free' || Object.keys(doc.layout.frames).length > 0
  const faulty = new Set((reading?.issues ?? []).filter((i) => i.block && i.severity !== 'info').map((i) => i.block!))
  return (
    <div className="ov" aria-hidden="true">
      <svg className="ov-svg">
        {lens && reading ? <Thread doc={doc} order={reading.minerOrder} faulty={faulty} /> : showThread && <Thread doc={doc} />}
        {lens && <ProofMarks doc={doc} />}
        <MultiCrops doc={doc} />
        {rects.block && <Crop r={rects.block} strong={!rects.item} />}
        {rects.item && <Crop r={rects.item} strong />}
      </svg>
      <ColumnHandles doc={doc} />
    </div>
  )
}
