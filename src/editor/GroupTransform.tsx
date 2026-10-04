import { useLayoutEffect, useState } from 'react'
import Moveable from 'react-moveable'
import type { Doc } from '../model/schema'
import { MM } from '../render/Page'
import { useDoc } from '../store/doc'
import { frameOf, isDecor, decorId } from './elements'

const elementFor = (key: string) => {
  const page = document.querySelector('.mb-page.is-editing')
  if (!page) return null
  return isDecor(key)
    ? page.querySelector<HTMLElement>(`[data-decor="${CSS.escape(decorId(key))}"]`)
    : page.querySelector<HTMLElement>(`[data-frame="${CSS.escape(key)}"]`)
}

export function GroupTransform({ doc, scale }: { doc: Doc; scale: number }) {
  const multi = useDoc((s) => s.multi)
  const [targets, setTargets] = useState<{ key: string; el: HTMLElement }[]>([])

  useLayoutEffect(() => {
    const next = multi.length > 1
      ? multi.flatMap((key) => {
          const f = frameOf(doc, key)
          const el = f && !f.locked ? elementFor(key) : null
          return el ? [{ key, el }] : []
        })
      : []
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargets(next)
  }, [doc, multi])

  if (targets.length < 2) return null
  return (
    <Moveable
      className="mb-moveable"
      target={targets.map((t) => t.el)}
      draggable
      origin={false}
      zoom={1 / scale}
      onDragGroup={(e) => {
        for (const ev of e.events) {
          ev.target.style.left = `${ev.left}px`
          ev.target.style.top = `${ev.top}px`
        }
      }}
      onDragGroupEnd={() => {
        useDoc.getState().edit((d) => {
          for (const { key, el } of targets) {
            const f = frameOf(d, key)
            if (f) {
              f.x = Math.round((el.offsetLeft / MM) * 10) / 10
              f.y = Math.round((el.offsetTop / MM) * 10) / 10
            }
          }
        })
      }}
    />
  )
}
