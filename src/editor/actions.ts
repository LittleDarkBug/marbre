import { current, isDraft } from 'immer'
import { newBlock, newEntry } from '../model/factories'
import { uid } from '../model/ids'
import { getAt } from '../model/paths'
import type { Block, BlockType, Decor, Doc } from '../model/schema'

type List = { id: string }[]

export function columnOf(doc: Doc, blockId: string) {
  return doc.layout.columns.find((c) => c.blocks.includes(blockId))
}

export function addBlock(doc: Doc, type: BlockType, heading: string, columnId?: string, after?: string) {
  const block = newBlock(type, heading)
  doc.blocks.push(block)
  if (doc.layout.mode === 'free') {
    doc.layout.frames[block.id] = { x: 20, y: 20, w: 120, h: 20, rotate: 0, z: 0, locked: false }
    doc.layout.order.push(block.id)
    return block.id
  }
  const col = doc.layout.columns.find((c) => c.id === columnId) ?? (after ? columnOf(doc, after) : undefined) ?? doc.layout.columns[0]
  const at = after ? col.blocks.indexOf(after) + 1 : col.blocks.length
  col.blocks.splice(at > 0 ? at : col.blocks.length, 0, block.id)
  return block.id
}

export function removeBlock(doc: Doc, blockId: string) {
  doc.blocks = doc.blocks.filter((b) => b.id !== blockId)
  for (const c of doc.layout.columns) c.blocks = c.blocks.filter((id) => id !== blockId)
  delete doc.layout.frames[blockId]
  doc.layout.order = doc.layout.order.filter((id) => id !== blockId)
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

export function duplicateBlock(doc: Doc, blockId: string) {
  const src = doc.blocks.find((b) => b.id === blockId)
  if (!src) return null
  const copy = reId(isDraft(src) ? current(src) : structuredClone(src)) as Block
  doc.blocks.push(copy)
  const col = columnOf(doc, blockId)
  if (col) col.blocks.splice(col.blocks.indexOf(blockId) + 1, 0, copy.id)
  if (doc.layout.frames[blockId]) {
    const f = doc.layout.frames[blockId]
    doc.layout.frames[copy.id] = { ...f, x: f.x + 6, y: f.y + 6 }
    doc.layout.order.push(copy.id)
  }
  return copy.id
}

export function moveBlock(doc: Doc, blockId: string, toColumn: string, index: number) {
  for (const c of doc.layout.columns) {
    const i = c.blocks.indexOf(blockId)
    if (i >= 0) {
      c.blocks.splice(i, 1)
      if (c.id === toColumn && i < index) index -= 1
    }
  }
  const target = doc.layout.columns.find((c) => c.id === toColumn)
  if (!target) return
  target.blocks.splice(Math.max(0, Math.min(index, target.blocks.length)), 0, blockId)
  delete doc.layout.frames[blockId]
  doc.layout.order = doc.layout.order.filter((id) => id !== blockId)
}

export function listAt(doc: Doc, path: string[]) {
  const list = getAt(doc, path)
  return Array.isArray(list) ? (list as List) : null
}

export function moveInList(doc: Doc, path: string[], id: string, delta: number) {
  const list = listAt(doc, path)
  if (!list) return
  const i = list.findIndex((x) => x.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return
  const [item] = list.splice(i, 1)
  list.splice(j, 0, item)
}

export function reorderList(doc: Doc, path: string[], fromId: string, toId: string) {
  const list = listAt(doc, path)
  if (!list) return
  const from = list.findIndex((x) => x.id === fromId)
  const to = list.findIndex((x) => x.id === toId)
  if (from < 0 || to < 0) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

export function removeFromList(doc: Doc, path: string[], id: string) {
  const list = listAt(doc, path)
  if (!list) return
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) list.splice(i, 1)
}

export function insertItem(doc: Doc, blockId: string, after?: string) {
  const block = doc.blocks.find((b) => b.id === blockId)
  if (!block) return null
  const make = (): { list: List; item: { id: string } } | null => {
    switch (block.type) {
      case 'entries':
        return { list: block.items, item: newEntry() }
      case 'skills':
        return { list: block.groups, item: { id: uid('g'), label: '', items: '' } as { id: string } }
      case 'pairs':
        return { list: block.items, item: { id: uid('p'), key: '', value: '' } as { id: string } }
      case 'identity':
        return { list: block.contacts, item: { id: uid('k'), kind: 'other', text: '' } as { id: string } }
      default:
        return null
    }
  }
  const made = make()
  if (!made) return null
  const at = after ? made.list.findIndex((x) => x.id === after) + 1 : made.list.length
  made.list.splice(at > 0 ? at : made.list.length, 0, made.item)
  return made.item.id
}

export function insertBullet(doc: Doc, blockId: string, entryId: string, after?: string, text = '') {
  const entry = getAt(doc, ['blocks', blockId, 'items', entryId]) as { bullets: { id: string; text: string }[] } | undefined
  if (!entry) return null
  const bullet = { id: uid('u'), text }
  const at = after ? entry.bullets.findIndex((b) => b.id === after) + 1 : entry.bullets.length
  entry.bullets.splice(at > 0 ? at : entry.bullets.length, 0, bullet)
  return bullet.id
}

export function detachBlock(doc: Doc, blockId: string, frame: { x: number; y: number; w: number; h: number }) {
  for (const c of doc.layout.columns) c.blocks = c.blocks.filter((id) => id !== blockId)
  doc.layout.frames[blockId] = { ...frame, rotate: 0, z: 0, locked: false }
  if (!doc.layout.order.includes(blockId)) doc.layout.order.push(blockId)
}

export function setMode(doc: Doc, mode: 'flow' | 'free', frames: Record<string, { x: number; y: number; w: number; h: number }>) {
  if (mode === doc.layout.mode) return
  if (mode === 'free') {
    const order = doc.layout.columns.flatMap((c) => c.blocks)
    for (const id of order) if (frames[id]) doc.layout.frames[id] = { ...frames[id], rotate: 0, z: 0, locked: false }
    doc.layout.order = [...order, ...doc.layout.order.filter((id) => !order.includes(id))]
  } else {
    const placed = new Set(doc.layout.columns.flatMap((c) => c.blocks))
    const missing = doc.layout.order.filter((id) => !placed.has(id))
    doc.layout.columns[0].blocks.push(...missing)
    doc.layout.frames = {}
    doc.layout.order = []
  }
  doc.layout.mode = mode
}

export function addColumn(doc: Doc) {
  doc.layout.columns.push({ id: uid('c'), width: 60, unit: 'mm', panel: true, blocks: [] })
}

export function removeColumn(doc: Doc, columnId: string) {
  if (doc.layout.columns.length < 2) return
  const col = doc.layout.columns.find((c) => c.id === columnId)
  if (!col) return
  doc.layout.columns = doc.layout.columns.filter((c) => c.id !== columnId)
  doc.layout.columns[0].blocks.push(...col.blocks)
}

export function addDecor(doc: Doc, kind: Decor['kind'], extra: Partial<Decor> = {}, at?: { x: number; y: number }) {
  const id = uid('o')
  const size = kind === 'rule' ? { w: 60, h: 0.6 } : kind === 'line' ? { w: 60, h: 4 } : kind === 'icon' ? { w: 12, h: 12 } : kind === 'qr' ? { w: 26, h: 26 } : kind === 'image' ? { w: 50, h: 40 } : { w: 30, h: 30 }
  const z = Math.max(0, ...doc.layout.decor.map((d) => d.frame.z)) + 1
  doc.layout.decor.push({
    id,
    kind,
    frame: { x: at?.x ?? 20, y: at?.y ?? 20, ...size, rotate: 0, z, locked: false },
    color: 'accent',
    stroke: 0.4,
    fill: kind !== 'ellipse',
    radius: 0,
    opacity: 1,
    dash: 'solid',
    arrow: 'none',
    hidden: false,
    ...extra,
  })
  return id
}

export function removeDecor(doc: Doc, id: string) {
  doc.layout.decor = doc.layout.decor.filter((d) => d.id !== id)
}

export function duplicateDecor(doc: Doc, id: string) {
  const src = doc.layout.decor.find((d) => d.id === id)
  if (!src) return null
  const copy = { ...(isDraft(src) ? current(src) : structuredClone(src)), id: uid('o') }
  copy.frame = { ...copy.frame, x: copy.frame.x + 5, y: copy.frame.y + 5 }
  doc.layout.decor.push(copy)
  return copy.id
}

export function restack(doc: Doc, id: string, delta: number) {
  const d = doc.layout.decor.find((x) => x.id === id)
  if (d) d.frame.z = Math.max(-5, Math.min(50, d.frame.z + delta))
}
