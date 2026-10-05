import { useRef, useState } from 'react'
import { useT } from '../i18n'
import { useDoc } from '../store/doc'
import { Icon } from '../ui/kit'
import { moveToIndex } from './actions'
import { selectedEl } from './geometry'

type Rect = { x: number; y: number; w: number; h: number }
type Drop = { id: string; after: boolean; line: Rect } | null

export function ItemGrip({ blockId, itemId, path, rect, scale, row }: { blockId: string; itemId: string; path: string[]; rect: Rect; scale: number; row: boolean }) {
  const t = useT()
  const grip = useRef<HTMLDivElement>(null)
  const [drop, setDrop] = useState<Drop>(null)
  const [dragging, setDragging] = useState(false)
  const size = 20

  const siblings = () => {
    const el = selectedEl({ blockId, itemId })
    const parent = el?.parentElement
    return parent ? Array.from(parent.children).filter((c): c is HTMLElement => c instanceof HTMLElement && Boolean(c.dataset.item)) : []
  }

  const locate = (x: number, y: number): Drop => {
    const host = grip.current?.offsetParent as HTMLElement | null
    if (!host) return null
    const origin = host.getBoundingClientRect()
    const items = siblings()
    if (items.length < 2) return null
    const rects = items.map((el) => ({ el, r: el.getBoundingClientRect() }))
    const row = rects.every((a) => Math.abs(a.r.top - rects[0].r.top) < 4) || rects.some((a, i) => i > 0 && a.r.left > rects[i - 1].r.right - 2 && Math.abs(a.r.top - rects[i - 1].r.top) < a.r.height / 2)
    let best = rects[0]
    let bestD = Infinity
    for (const c of rects) {
      const d = Math.hypot(x - (c.r.left + c.r.width / 2), y - (c.r.top + c.r.height / 2))
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    const horizontal = row && Math.abs(y - (best.r.top + best.r.height / 2)) < best.r.height
    const after = horizontal ? x > best.r.left + best.r.width / 2 : y > best.r.top + best.r.height / 2
    const line = horizontal
      ? { x: (after ? best.r.right + 3 : best.r.left - 3) - origin.left, y: best.r.top - origin.top, w: 2, h: best.r.height }
      : { x: best.r.left - origin.left, y: (after ? best.r.bottom + 1 : best.r.top - 1) - origin.top, w: best.r.width, h: 2 }
    return { id: best.el.dataset.item!, after, line }
  }

  const commit = (d: Drop) => {
    if (!d || d.id === itemId) return
    const rest = siblings().map((el) => el.dataset.item!).filter((x) => x !== itemId)
    const index = rest.indexOf(d.id) + (d.after ? 1 : 0)
    useDoc.getState().edit((doc) => moveToIndex(doc, path, itemId, index))
  }

  return (
    <>
      <div
        ref={grip}
        className={`item-grip${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={-1}
        aria-label={t('sel.drag')}
        title={t('sel.drag')}
        style={row ? { left: rect.x * scale, top: (rect.y + rect.h) * scale + 3, width: size, height: size } : { left: rect.x * scale - size - 4, top: rect.y * scale + Math.max(0, (rect.h * scale - size) / 2), width: size, height: size }}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          setDragging(true)
        }}
        onPointerMove={(e) => dragging && setDrop(locate(e.clientX, e.clientY))}
        onPointerUp={(e) => {
          if (!dragging) return
          setDragging(false)
          commit(locate(e.clientX, e.clientY))
          setDrop(null)
        }}
        onPointerCancel={() => {
          setDragging(false)
          setDrop(null)
        }}
      >
        <Icon name="dots-six-vertical" size={14} />
      </div>
      {drop && drop.id !== itemId && <div className="item-drop" style={{ left: drop.line.x, top: drop.line.y, width: drop.line.w, height: drop.line.h }} />}
    </>
  )
}
