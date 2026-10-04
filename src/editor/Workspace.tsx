import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { RenderCtx } from '../render/context'
import { MM, PAGE_MM, Page, type Fit } from '../render/Page'
import { useDoc } from '../store/doc'
import { editApi } from './editApi'
import { FreeTransform, decorKey } from './FreeTransform'
import { GroupTransform } from './GroupTransform'
import { TextToolbar } from './TextToolbar'
import { Overlay } from './Overlay'
import { Rulers } from './Rulers'
import { SelectionBar } from './SelectionBar'
import { useEditorUi } from './uiState'

const PAD = 40

export function Workspace({ doc, onFit }: { doc: Doc; onFit: (f: Fit) => void }) {
  const t = useT()
  const scroller = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [lasso, setLasso] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
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
      ref={(el) => {
        scroller.current = el
        setHost(el)
      }}
      className="ws"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement
        const decor = target.closest<HTMLElement>('[data-decor]')
        const s = useDoc.getState()
        if (decor) {
          const key = decorKey(decor.dataset.decor!)
          if (e.shiftKey) s.toggleMulti(key)
          else if (!s.multi.includes(key) || s.multi.length < 2) s.select({ blockId: key })
          return
        }
        const empty = target === e.currentTarget || target.classList.contains('ws-stage') || target.classList.contains('ws-sheet') || target.classList.contains('mb-page') || target.classList.contains('mb-flow')
        if (!empty || e.pointerType === 'touch') return
        const box = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - box.left + e.currentTarget.scrollLeft
        const y = e.clientY - box.top + e.currentTarget.scrollTop
        setLasso({ x0: x, y0: y, x1: x, y1: y })
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const move = (ev: PointerEvent) => setLasso((l) => (l ? { ...l, x1: ev.clientX - box.left + el.scrollLeft, y1: ev.clientY - box.top + el.scrollTop } : l))
        const up = (ev: PointerEvent) => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
          setLasso(null)
          const rx0 = Math.min(e.clientX, ev.clientX)
          const rx1 = Math.max(e.clientX, ev.clientX)
          const ry0 = Math.min(e.clientY, ev.clientY)
          const ry1 = Math.max(e.clientY, ev.clientY)
          if (rx1 - rx0 < 4 && ry1 - ry0 < 4) {
            if (!target.closest('[data-block]')) s.select(null)
            return
          }
          const keys = Array.from(document.querySelectorAll<HTMLElement>('.mb-page.is-editing [data-frame], .mb-page.is-editing [data-decor]'))
            .filter((n) => {
              const r = n.getBoundingClientRect()
              return r.right > rx0 && r.left < rx1 && r.bottom > ry0 && r.top < ry1
            })
            .map((n) => (n.dataset.decor ? decorKey(n.dataset.decor) : n.dataset.frame!))
          s.setMulti(keys)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
      }}
    >
      {lasso && <div className="ws-lasso" style={{ left: Math.min(lasso.x0, lasso.x1), top: Math.min(lasso.y0, lasso.y1), width: Math.abs(lasso.x1 - lasso.x0), height: Math.abs(lasso.y1 - lasso.y0) }} />}
      <TextToolbar host={host} palette={[doc.theme.colors.ink, doc.theme.colors.accent, '#5c5c5c', '#ffffff']} />
      <div className="ws-stage" style={{ width: pageW * scale + pad * 2 + offset, height: contentH * scale + pad * 2 + offset }}>
        <div className="ws-sheet" style={{ left: pad + offset, top: pad + offset, width: pageW * scale, height: contentH * scale }}>
          {rulers && <Rulers widthMm={size.w} heightMm={(contentH / pageH) * size.h} scale={scale} />}
          <div className="ws-scale" style={{ width: pageW, transform: `scale(${scale})` }}>
            <RenderCtx.Provider value={editApi}>
              <Page doc={doc} onFit={handleFit} className="is-editing" />
            </RenderCtx.Provider>
            <Overlay doc={doc} />
            <FreeTransform doc={doc} scale={scale} label={t('frame.move')} />
            <GroupTransform doc={doc} scale={scale} />
          </div>
          <SelectionBar doc={doc} scale={scale} />
        </div>
      </div>
    </div>
  )
}
