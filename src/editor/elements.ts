import { current, isDraft } from 'immer'
import { uid } from '../model/ids'
import type { Block, Decor, Doc, Frame } from '../model/schema'

export const isDecor = (key: string) => key.startsWith('decor:')
export const decorId = (key: string) => key.slice(6)

export function frameOf(doc: Doc, key: string): Frame | undefined {
  if (isDecor(key)) return doc.layout.decor.find((d) => d.id === decorId(key))?.frame
  return doc.layout.frames[key]
}

export function freeKeys(doc: Doc) {
  return [...Object.keys(doc.layout.frames).filter((id) => doc.blocks.some((b) => b.id === id)), ...doc.layout.decor.map((d) => `decor:${d.id}`)]
}

export function nudge(doc: Doc, keys: string[], dx: number, dy: number) {
  for (const k of keys) {
    const f = frameOf(doc, k)
    if (f && !f.locked) {
      f.x = Math.round((f.x + dx) * 10) / 10
      f.y = Math.round((f.y + dy) * 10) / 10
    }
  }
}

export function setLocked(doc: Doc, keys: string[], locked: boolean) {
  for (const k of keys) {
    const f = frameOf(doc, k)
    if (f) f.locked = locked
  }
}

export function restackKeys(doc: Doc, keys: string[], mode: 'front' | 'back' | 'up' | 'down') {
  const all = freeKeys(doc).map((k) => frameOf(doc, k)!.z)
  const top = Math.max(0, ...all)
  const bottom = Math.min(0, ...all)
  for (const k of keys) {
    const f = frameOf(doc, k)
    if (!f) continue
    if (mode === 'front') f.z = top + 1
    else if (mode === 'back') f.z = bottom - 1
    else f.z += mode === 'up' ? 1 : -1
  }
}

export type Align = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'hspace' | 'vspace'

export function align(doc: Doc, keys: string[], how: Align, page: { w: number; h: number }) {
  const frames = keys.map((k) => frameOf(doc, k)).filter((f): f is Frame => Boolean(f) && !f!.locked)
  if (!frames.length) return
  const box =
    frames.length === 1
      ? { x0: 0, y0: 0, x1: page.w, y1: page.h }
      : {
          x0: Math.min(...frames.map((f) => f.x)),
          y0: Math.min(...frames.map((f) => f.y)),
          x1: Math.max(...frames.map((f) => f.x + f.w)),
          y1: Math.max(...frames.map((f) => f.y + f.h)),
        }
  const round = (v: number) => Math.round(v * 10) / 10
  if (how === 'hspace' || how === 'vspace') {
    if (frames.length < 3) return
    const horizontal = how === 'hspace'
    const sorted = [...frames].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))
    const total = sorted.reduce((n, f) => n + (horizontal ? f.w : f.h), 0)
    const span = horizontal ? box.x1 - box.x0 : box.y1 - box.y0
    const gap = (span - total) / (sorted.length - 1)
    let at = horizontal ? box.x0 : box.y0
    for (const f of sorted) {
      if (horizontal) f.x = round(at)
      else f.y = round(at)
      at += (horizontal ? f.w : f.h) + gap
    }
    return
  }
  for (const f of frames) {
    if (how === 'left') f.x = box.x0
    if (how === 'right') f.x = box.x1 - f.w
    if (how === 'hcenter') f.x = (box.x0 + box.x1) / 2 - f.w / 2
    if (how === 'top') f.y = box.y0
    if (how === 'bottom') f.y = box.y1 - f.h
    if (how === 'vcenter') f.y = (box.y0 + box.y1) / 2 - f.h / 2
    f.x = round(f.x)
    f.y = round(f.y)
  }
}

export type Clip = { blocks: Block[]; frames: Record<string, Frame>; decor: Decor[] }

const plainCopy = <T,>(v: T): T => (isDraft(v) ? (current(v as object) as T) : structuredClone(v))

export function copy(doc: Doc, keys: string[]): Clip {
  const blocks = doc.blocks.filter((b) => keys.includes(b.id)).map((b) => plainCopy(b))
  const frames: Record<string, Frame> = {}
  for (const b of blocks) if (doc.layout.frames[b.id]) frames[b.id] = plainCopy(doc.layout.frames[b.id])
  const decor = doc.layout.decor.filter((d) => keys.includes(`decor:${d.id}`)).map((d) => plainCopy(d))
  return { blocks, frames, decor }
}

function reId<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reId) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = k === 'id' ? uid('n') : reId(v)
    return out as T
  }
  return value
}

export function paste(doc: Doc, clip: Clip, offset = 6): string[] {
  const keys: string[] = []
  for (const raw of clip.blocks) {
    const fresh = reId(structuredClone(raw))
    doc.blocks.push(fresh)
    const f = clip.frames[raw.id]
    doc.layout.frames[fresh.id] = f ? { ...f, x: f.x + offset, y: f.y + offset, locked: false } : { x: 20, y: 20, w: 80, h: 20, rotate: 0, z: 0, locked: false }
    doc.layout.order.push(fresh.id)
    keys.push(fresh.id)
  }
  for (const raw of clip.decor) {
    const fresh = { ...structuredClone(raw), id: uid('o') }
    fresh.frame = { ...fresh.frame, x: fresh.frame.x + offset, y: fresh.frame.y + offset, locked: false }
    doc.layout.decor.push(fresh)
    keys.push(`decor:${fresh.id}`)
  }
  return keys
}

export function removeKeys(doc: Doc, keys: string[]) {
  const blocks = keys.filter((k) => !isDecor(k))
  const decor = keys.filter(isDecor).map(decorId)
  doc.blocks = doc.blocks.filter((b) => !blocks.includes(b.id))
  for (const c of doc.layout.columns) c.blocks = c.blocks.filter((id) => !blocks.includes(id))
  for (const id of blocks) delete doc.layout.frames[id]
  doc.layout.order = doc.layout.order.filter((id) => !blocks.includes(id))
  doc.layout.decor = doc.layout.decor.filter((d) => !decor.includes(d.id))
}

export function placeFree(doc: Doc, block: Block, at: { x: number; y: number }, size: { w: number; h: number }) {
  doc.blocks.push(block)
  doc.layout.frames[block.id] = { ...at, ...size, rotate: 0, z: Math.max(0, ...freeKeys(doc).map((k) => frameOf(doc, k)?.z ?? 0)) + 1, locked: false }
  doc.layout.order.push(block.id)
}
