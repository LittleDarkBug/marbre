import { useLayoutEffect, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import type { Doc, Frame } from '../model/schema'
import { MM, PAGE_MM } from '../render/Page'
import { useDoc } from '../store/doc'
import { Icon, useMedia } from '../ui/kit'

const round = (v: number) => Math.round(v * 10) / 10

export const decorKey = (id: string) => `decor:${id}`
export const isDecorKey = (key: string) => key.startsWith('decor:')

function targetFor(doc: Doc, key: string): { el: HTMLElement; frame: Frame } | null {
  const page = document.querySelector('.mb-page.is-editing')
  if (!page) return null
  if (isDecorKey(key)) {
    const id = key.slice(6)
    const d = doc.layout.decor.find((x) => x.id === id)
    const el = page.querySelector<HTMLElement>(`[data-decor="${CSS.escape(id)}"]`)
    return d && el ? { el, frame: d.frame } : null
  }
  const frame = doc.layout.frames[key]
  const el = page.querySelector<HTMLElement>(`[data-frame="${CSS.escape(key)}"]`)
  return frame && el ? { el, frame } : null
}

function commit(key: string, patch: Partial<Frame>) {
  useDoc.getState().edit((d) => {
    if (isDecorKey(key)) {
      const decor = d.layout.decor.find((x) => x.id === key.slice(6))
      if (decor) Object.assign(decor.frame, patch)
    } else if (d.layout.frames[key]) Object.assign(d.layout.frames[key], patch)
  })
}

export function FreeTransform({ doc, scale, label }: { doc: Doc; scale: number; label: string }) {
  const selection = useDoc((s) => s.selection)
  const coarse = useMedia('(pointer: coarse)')
  const [target, setTarget] = useState<{ el: HTMLElement; frame: Frame; key: string } | null>(null)
  const [grip, setGrip] = useState<HTMLDivElement | null>(null)
  const gripRef = useRef<HTMLDivElement | null>(null)
  const key = selection && !selection.itemId ? selection.blockId : null

  useLayoutEffect(() => {
    const found = key ? targetFor(doc, key) : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(found && key ? { ...found, key } : null)
  }, [doc, key])

  if (!target) return null
  const decor = isDecorKey(target.key)
  const gripSize = (coarse ? 40 : 22) / scale
  const placeGrip = (left: number, top: number) => {
    const el = gripRef.current
    if (el) {
      el.style.left = `${left - gripSize - 4 / scale}px`
      el.style.top = `${top}px`
    }
  }
  const page = PAGE_MM[doc.page.format]
  const m = doc.page.margin
  const others = Array.from(document.querySelectorAll<HTMLElement>('.mb-page.is-editing [data-frame], .mb-page.is-editing [data-decor]')).filter((el) => el !== target.el)

  return (
    <>
    {!decor && (
      <div
        ref={(el) => {
          gripRef.current = el
          setGrip(el)
        }}
        className="ft-grip"
        role="button"
        aria-label={label}
        title={label}
        style={{ left: target.frame.x * MM - gripSize - 4 / scale, top: target.frame.y * MM, width: gripSize, height: gripSize }}
      >
        <Icon name="arrows-out-cardinal" size={Math.round(gripSize * 0.62)} />
      </div>
    )}
    <Moveable
      dragTarget={decor ? undefined : grip ?? undefined}
      className="mb-moveable"
      target={target.el}
      draggable
      resizable
      rotatable
      snappable
      origin={false}
      zoom={1 / scale}
      throttleDrag={0}
      controlPadding={coarse ? 14 : 0}
      snapThreshold={6}
      isDisplaySnapDigit
      snapRotationDegrees={[0, 45, 90, 135, 180, 225, 270, 315]}
      snapDirections={{ left: true, right: true, top: true, bottom: true, center: true, middle: true }}
      elementSnapDirections={{ left: true, right: true, top: true, bottom: true, center: true, middle: true }}
      elementGuidelines={others}
      verticalGuidelines={[m.left * MM, (page.w / 2) * MM, (page.w - m.right) * MM]}
      horizontalGuidelines={[m.top * MM, (page.h / 2) * MM, (page.h - m.bottom) * MM]}
      onDrag={(e) => {
        e.target.style.left = `${e.left}px`
        e.target.style.top = `${e.top}px`
        placeGrip(e.left, e.top)
      }}
      onDragEnd={(e) => {
        const el = e.target as HTMLElement
        commit(target.key, { x: round(el.offsetLeft / MM), y: round(el.offsetTop / MM) })
      }}
      onResize={(e) => {
        e.target.style.width = `${e.width}px`
        if (isDecorKey(target.key)) e.target.style.height = `${e.height}px`
        else e.target.style.minHeight = `${e.height}px`
        e.target.style.left = `${e.drag.left}px`
        e.target.style.top = `${e.drag.top}px`
      }}
      onResizeEnd={(e) => {
        const el = e.target as HTMLElement
        commit(target.key, { x: round(el.offsetLeft / MM), y: round(el.offsetTop / MM), w: round(el.offsetWidth / MM), h: round(el.offsetHeight / MM) })
      }}
      onRotate={(e) => {
        e.target.style.transform = e.transform
      }}
      onRotateEnd={(e) => {
        const match = /rotate\(([-\d.]+)deg\)/.exec((e.target as HTMLElement).style.transform)
        commit(target.key, { rotate: match ? Math.round(Number(match[1])) : 0 })
      }}
    />
    </>
  )
}
