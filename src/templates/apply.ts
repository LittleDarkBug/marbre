import { sectionOf } from '../importer/patterns'
import type { Block, Column, Doc } from '../model/schema'
import { PAGE_MM } from '../render/Page'
import { TEMPLATES } from './index'

type Slot = 'id' | 'profile' | 'xp' | 'skills' | 'edu' | 'proj' | 'langs' | 'photo'

const SIDE_KINDS = new Set(['skills', 'languages', 'certifications', 'awards', 'interests', 'references'])

export function slotOf(b: Block): Slot | null {
  if (b.type === 'identity') return 'id'
  if (b.type === 'photo') return 'photo'
  if (b.type === 'entries') return b.kind === 'experience' ? 'xp' : b.kind === 'education' ? 'edu' : b.kind === 'project' ? 'proj' : null
  const kind = sectionOf(b.heading)
  if (b.type === 'skills') return kind === 'languages' ? 'langs' : 'skills'
  if (b.type === 'pairs' || b.type === 'rating') return kind === 'languages' ? 'langs' : null
  if (b.type === 'text' && kind === 'profile') return 'profile'
  return null
}

const sidey = (b: Block) => b.type === 'skills' || b.type === 'pairs' || b.type === 'rating' || SIDE_KINDS.has(sectionOf(b.heading) ?? '')

function flowColumns(sample: Doc): Column[] {
  if (sample.layout.mode === 'flow') return sample.layout.columns
  const mid = PAGE_MM[sample.page.format].w * 0.55
  const frames = sample.layout.frames
  const ids = Object.keys(frames).sort((a, b) => frames[a].y - frames[b].y)
  const side = ids.filter((id) => frames[id].x >= mid)
  const width = Math.max(48, ...side.map((id) => frames[id].w))
  return [
    { id: 'main', width: 1, unit: 'fr', panel: false, blocks: ids.filter((id) => frames[id].x < mid) },
    { id: 'side', width, unit: 'mm', panel: false, blocks: side },
  ]
}

export function applyTemplate(content: Doc, templateId: string): Doc {
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
  const sample = tpl.make(content.lang)
  const out: Doc = structuredClone(content)
  out.theme = structuredClone(sample.theme)
  out.page = { ...structuredClone(sample.page), fit: content.page.fit, count: content.page.count, background: sample.page.background, backgroundImage: sample.page.backgroundImage }
  out.layout.gutter = sample.layout.gutter
  out.layout.mode = 'flow'
  out.layout.decor = sample.layout.mode === 'flow' ? structuredClone(sample.layout.decor) : sample.layout.decor.filter((d) => d.frame.locked).map((d) => structuredClone(d))

  const sampleById = new Map(sample.blocks.map((b) => [b.id, b]))
  const bySlot = new Map<Slot, string[]>()
  const loose: Block[] = []
  for (const b of out.blocks) {
    const slot = slotOf(b)
    const taken = slot ? bySlot.get(slot) : undefined
    if (slot && !taken) {
      bySlot.set(slot, [b.id])
      const model = sampleById.get(slot)
      if (model && Object.keys(b.style ?? {}).length === 0) b.style = structuredClone(model.style)
    } else if (slot && taken) taken.push(b.id)
    else loose.push(b)
  }

  const columns = flowColumns(sample).map((c) => ({ ...c, blocks: c.blocks.flatMap((slot) => bySlot.get(slot as Slot) ?? []) }))
  const placed = new Set(columns.flatMap((c) => c.blocks))
  const main = columns.find((c) => c.blocks.some((id) => bySlot.get('xp')?.includes(id))) ?? columns.find((c) => !c.panel) ?? columns[0]
  const side = columns.find((c) => c !== main && c.blocks.some((id) => bySlot.get('skills')?.includes(id) || bySlot.get('langs')?.includes(id)))
  for (const b of [...out.blocks.filter((x) => !placed.has(x.id) && !loose.includes(x)), ...loose]) {
    if (b.type === 'photo') continue
    const target = side && sidey(b) ? side : main
    target.blocks.push(b.id)
    placed.add(b.id)
  }

  for (const col of flowColumns(sample)) {
    const model = col.blocks.map((id) => sampleById.get(id)).find((b) => b && b.type !== 'photo' && Object.keys(b.style ?? {}).length)
    const target = columns.find((c) => c.id === col.id)
    if (!model || !target) continue
    for (const id of target.blocks) {
      const b = out.blocks.find((x) => x.id === id)
      if (b && b.type !== 'photo' && Object.keys(b.style ?? {}).length === 0) b.style = structuredClone(model.style)
    }
  }

  const photo = out.blocks.find((b) => b.type === 'photo')
  out.layout.frames = {}
  out.layout.order = []
  const photoSlot = sampleById.has('photo')
  if (photo) photo.hidden = !photoSlot
  if (photo && !placed.has(photo.id)) {
    const host = photoSlot ? (columns.find((c) => c.blocks.includes('photo')) ?? columns.find((c) => c.panel) ?? side) : undefined
    if (host) host.blocks.unshift(photo.id)
    else {
      const w = PAGE_MM[out.page.format].w
      out.layout.frames[photo.id] = { x: w - out.page.margin.right - 30, y: out.page.margin.top, w: 30, h: 30, rotate: 0, z: 2, locked: false }
      out.layout.order = [photo.id]
    }
  }
  out.layout.columns = columns.filter((c) => c.blocks.length || c === main)
  return out
}
