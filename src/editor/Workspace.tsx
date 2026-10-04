import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { RenderCtx } from '../render/context'
import { MM, PAGE_MM, Page, type Fit } from '../render/Page'
import { useDoc } from '../store/doc'
import { editApi } from './editApi'
import { FreeTransform, decorKey } from './FreeTransform'
import { Overlay } from './Overlay'
import { Rulers } from './Rulers'
import { SelectionBar } from './SelectionBar'
import { useEditorUi } from './uiState'

const PAD = 40

export function Workspace({ doc, onFit }: { doc: Doc; onFit: (f: Fit) => void }) {
  const t = useT()
  const scroller = useRef<HTMLDivElement>(null)
  const { zoom, fitZoom, setZoom } = useEditorUi()
  const [width, setWidth] = useState(0)
  const size = PAGE_MM[doc.page.format]
  const pageW = size.w * MM
  const pageH = size.h * MM
  const [contentH, setContentH] = useState(pageH)
  const pad = width < 600 ? 12 : PAD
  const scale = fitZoom && width ? Math.min(1.6, (width - pad * 2 - (width < 600 ? 0 : 28)) / pageW) : zoom

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const handleFit = useCallback(
    (f: Fit) => {
      setContentH(Math.max(pageH, f.pages * pageH))
      onFit(f)
    },
    [onFit, pageH],
  )

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08))
    }
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch: { d: number; z: number } | null = null
    const dist = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) pinch = { d: dist(), z: scale }
    }
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch && pointers.size === 2) setZoom((pinch.z * dist()) / pinch.d)
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [scale, setZoom])

  const rulers = width >= 600
  const offset = rulers ? 28 : 0
  return (
    <div
      ref={scroller}
      className="ws"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement
        const decor = target.closest<HTMLElement>('[data-decor]')
        if (decor) useDoc.getState().select({ blockId: decorKey(decor.dataset.decor!) })
        else if (target === e.currentTarget || target.classList.contains('ws-stage')) useDoc.getState().select(null)
      }}
    >
      <div className="ws-stage" style={{ width: pageW * scale + pad * 2 + offset, height: contentH * scale + pad * 2 + offset }}>
        <div className="ws-sheet" style={{ left: pad + offset, top: pad + offset, width: pageW * scale, height: contentH * scale }}>
          {rulers && <Rulers widthMm={size.w} heightMm={(contentH / pageH) * size.h} scale={scale} />}
          <div className="ws-scale" style={{ width: pageW, transform: `scale(${scale})` }}>
            <RenderCtx.Provider value={editApi}>
              <Page doc={doc} onFit={handleFit} className="is-editing" />
            </RenderCtx.Provider>
            <Overlay doc={doc} />
            <FreeTransform doc={doc} scale={scale} label={t('frame.move')} />
          </div>
          <SelectionBar doc={doc} scale={scale} />
        </div>
      </div>
    </div>
  )
}
