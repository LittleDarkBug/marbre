import type { Doc } from '../model/schema'
import type { Fit } from '../render/Page'
import { readPdfminer, type Char, type ReadBox } from './pdfminer'
import type { Sample } from './measure'

export type Severity = 'error' | 'warning' | 'info'
export type IssueCode = 'photo' | 'rating' | 'interleaved' | 'order' | 'rows' | 'small' | 'rotated' | 'spaced' | 'free' | 'overflow' | 'contrast' | 'contact' | 'headings' | 'datesRight'
export type Issue = { code: IssueCode; severity: Severity; block?: string; params?: Record<string, string | number> }
export type Reading = { stream: string; miner: ReadBox[]; rows: string; streamOrder: string[]; minerOrder: string[]; issues: Issue[] }

function lines(chars: Char[]) {
  const out: string[] = []
  let cur = ''
  let y: number | null = null
  for (const c of chars) {
    if (y !== null && Math.abs(c.y0 - y) > 2) {
      out.push(cur.trim())
      cur = ''
    }
    cur += c.text
    y = c.y0
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean).join('\n')
}

function rows(chars: Char[]) {
  const buckets = new Map<number, Char[]>()
  for (const c of chars) {
    const key = Math.round(c.y0 / 3)
    const k = buckets.has(key - 1) ? key - 1 : buckets.has(key + 1) ? key + 1 : key
    buckets.set(k, [...(buckets.get(k) ?? []), c])
  }
  const sorted = [...buckets.entries()].sort((a, b) => b[0] - a[0])
  let mixed = 0
  const text = sorted
    .map(([, cs]) => {
      cs.sort((a, b) => a.x0 - b.x0)
      const blocks = new Set(cs.map((c) => c.block).filter(Boolean))
      if (blocks.size > 1) mixed++
      let s = ''
      let prev: Char | null = null
      for (const c of cs) {
        if (prev && c.x0 - prev.x1 > (prev.y1 - prev.y0) * 0.6 && !s.endsWith(' ')) s += ' '
        s += c.text
        prev = c
      }
      return s.replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean)
    .join('\n')
  return { text, mixed }
}

const unique = <T,>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) === i)

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return 1
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => {
    const v = parseInt(x, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const SECTION_WORDS = /exp[ée]rience|parcours|emploi|employment|work|career|formation|[ée]ducation|dipl[ôo]me|studies|comp[ée]tence|skill|savoir/i

export function analyze(doc: Doc, sample: Sample, fit: Fit | null): Reading {
  const issues: Issue[] = []
  const miner = readPdfminer(sample.chars)
  const streamOrder = unique(sample.chars.map((c) => c.block).filter((b): b is string => Boolean(b)))
  const runs: string[] = []
  for (const box of miner) for (const b of box.blocks) if (runs[runs.length - 1] !== b) runs.push(b)
  const minerOrder = unique(runs)
  const label = (id: string) => {
    const b = doc.blocks.find((x) => x.id === id)
    return b ? (b.type === 'identity' ? b.name : b.heading.replace(/<[^>]+>/g, '')) || b.type : id
  }

  const seen = new Set<string>()
  for (let i = 0; i < runs.length; i++) {
    const b = runs[i]
    if (seen.has(b) && runs[i - 1] !== b) {
      const between = runs.slice(runs.lastIndexOf(b, i - 1) + 1, i).filter((x) => x !== b)
      if (!issues.some((x) => x.code === 'interleaved' && x.block === b)) issues.push({ code: 'interleaved', severity: 'error', block: b, params: { other: label(between[0] ?? '') } })
    }
    seen.add(b)
  }
  minerOrder.forEach((b, i) => {
    const expected = streamOrder.indexOf(b)
    const prev = minerOrder[i - 1]
    if (prev && streamOrder.indexOf(prev) > expected && !issues.some((x) => x.block === b)) {
      issues.push({ code: 'order', severity: 'warning', block: b, params: { after: label(prev) } })
    }
  })

  const r = rows(sample.chars)
  if (r.mixed > 2) issues.push({ code: 'rows', severity: 'info', params: { n: r.mixed } })

  const minSize = new Map<string, number>()
  for (const s of sample.sizes) minSize.set(s.block, Math.min(minSize.get(s.block) ?? Infinity, s.px))
  for (const [block, px] of minSize) if (px < 11.9) issues.push({ code: 'small', severity: 'warning', block, params: { pt: Math.round(px * 7.5) / 10 } })
  for (const block of sample.rotated) issues.push({ code: 'rotated', severity: 'warning', block })
  for (const block of sample.spaced) issues.push({ code: 'spaced', severity: 'warning', block })
  const framed = Object.keys(doc.layout.frames).filter((id) => doc.blocks.some((b) => b.id === id && !b.hidden))
  if (framed.length) issues.push({ code: 'free', severity: 'info', params: { n: framed.length } })
  if (fit?.overflow) issues.push({ code: 'overflow', severity: 'error' })
  if (doc.theme.datePlacement === 'right') issues.push({ code: 'datesRight', severity: 'info' })
  for (const b of doc.blocks) {
    if (b.hidden) continue
    if (b.type === 'photo' && b.src) issues.push({ code: 'photo', severity: 'info', block: b.id })
    if (b.type === 'rating' && b.display !== 'text') issues.push({ code: 'rating', severity: 'info', block: b.id })
  }

  const c = doc.theme.colors
  const inPanel = new Set(doc.layout.mode === 'flow' ? doc.layout.columns.filter((col) => col.panel).flatMap((col) => col.blocks) : [])
  const flagged = new Set<string>()
  for (const b of doc.blocks) {
    if (b.hidden || b.type === 'photo') continue
    const bg = b.style?.background || (inPanel.has(b.id) ? c.panel : doc.page.background || c.paper)
    for (const [name, fg] of [['ink', b.style?.color || c.ink], ['accent', b.style?.accent || c.accent]] as const) {
      const ratio = contrast(fg, bg)
      const key = `${name}${fg}${bg}`
      if (ratio < 4.5 && !flagged.has(key)) {
        flagged.add(key)
        issues.push({ code: 'contrast', severity: 'warning', block: b.id, params: { color: name, ratio: Math.round(ratio * 10) / 10 } })
      }
    }
  }

  const identity = doc.blocks.find((b) => b.type === 'identity' && !b.hidden)
  if (identity && identity.type === 'identity') {
    const kinds = new Set(identity.contacts.filter((k) => k.text.trim()).map((k) => k.kind))
    if (!kinds.has('email') || !kinds.has('phone')) issues.push({ code: 'contact', severity: 'warning', block: identity.id })
  }
  const headings = doc.blocks.filter((b) => !b.hidden && b.type !== 'identity').map((b) => b.heading)
  if (headings.length && !headings.some((h) => SECTION_WORDS.test(h))) issues.push({ code: 'headings', severity: 'info' })

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])
  return { stream: lines(sample.chars), miner, rows: r.text, streamOrder, minerOrder, issues }
}
