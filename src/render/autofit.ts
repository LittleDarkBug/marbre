import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Doc } from '../model/schema'
import { MM, PAGE_MM, Page, type Fit } from './Page'
import { loadDocFonts } from './style'

export const MIN_BODY_PX = 12
const MIN_MARGIN = 8

export type FitResult = { doc: Doc; scale: number; pages: number; fitted: boolean }

const round = (v: number) => Math.round(v * 10) / 10

const settle = (doc: Doc, pages: number): Doc => (pages > 1 ? { ...doc, page: { ...doc.page, fit: 'flow', count: pages } } : doc)

export function scaleDoc(doc: Doc, k: number, pages: number): Doc {
  const out = structuredClone(doc)
  const t = out.theme
  const s = doc.theme.size
  const text = (v: number) => round(Math.max(Math.min(v, MIN_BODY_PX), v * (0.5 + 0.5 * k)))
  const body = text(s.body)
  t.size = {
    name: round(Math.max(Math.min(s.name, 20), s.name * k)),
    title: round(Math.max(body, s.title * k)),
    heading: round(Math.max(body, s.heading * (0.3 + 0.7 * k))),
    body,
    small: text(s.small),
  }
  t.spacing = { ...t.spacing, section: round(doc.theme.spacing.section * k), item: round(doc.theme.spacing.item * k) }
  t.leading = Math.round(Math.max(1.2, doc.theme.leading - (1 - k) * 0.45) * 100) / 100
  const m = doc.page.margin
  const mk = (v: number) => (v <= MIN_MARGIN ? v : round(MIN_MARGIN + (v - MIN_MARGIN) * k))
  out.page = { ...out.page, fit: 'one', count: pages, margin: { top: mk(m.top), right: mk(m.right), bottom: mk(m.bottom), left: mk(m.left) } }
  return out
}

async function measurer() {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none;contain:layout style'
  document.body.appendChild(host)
  const root = createRoot(host)
  const measure = (doc: Doc) =>
    new Promise<Fit>((resolve) => {
      let done = false
      const finish = (fit: Fit) => {
        if (done) return
        done = true
        requestAnimationFrame(() => resolve(fit))
      }
      host.style.width = `${PAGE_MM[doc.page.format].w * MM}px`
      root.render(createElement(Page, { key: Math.random(), doc, onFit: finish }))
    })
  const dispose = () => {
    root.unmount()
    host.remove()
  }
  return { measure, dispose }
}

async function balance(doc: Doc, measure: (d: Doc) => Promise<Fit>): Promise<Doc> {
  if (doc.layout.columns.length < 2) return doc
  let current = doc
  let fit = await measure(scaleDoc(current, 1, 1))
  const worst = (f: Fit) => Math.min(...f.columns.map((c) => c.slack))
  for (let i = 0; i < 8; i++) {
    const over = [...fit.columns].sort((a, b) => a.slack - b.slack)[0]
    const room = [...fit.columns].sort((a, b) => b.slack - a.slack)[0]
    if (!over || !room || over.id === room.id || over.slack >= 0 || room.slack < 80) break
    const next = structuredClone(current)
    const from = next.layout.columns.find((c) => c.id === over.id)
    const to = next.layout.columns.find((c) => c.id === room.id)
    const movable = from?.blocks.filter((id) => !['identity', 'photo'].includes(next.blocks.find((b) => b.id === id)?.type ?? ''))
    const id = movable?.[movable.length - 1]
    if (!from || !to || !id) break
    from.blocks = from.blocks.filter((x) => x !== id)
    to.blocks.push(id)
    const after = await measure(scaleDoc(next, 1, 1))
    if (worst(after) <= worst(fit)) break
    current = next
    fit = after
  }
  return current
}

export async function autoFit(doc: Doc, maxPages = 3): Promise<FitResult> {
  if (doc.layout.mode !== 'flow') return { doc, scale: 1, pages: doc.page.count ?? 1, fitted: true }
  await loadDocFonts(doc)
  const { measure, dispose } = await measurer()
  const fits = async (d: Doc) => {
    const fit = await measure(d)
    const pages = d.page.count ?? 1
    const reserve = pages > 1 ? (pages - 1) * (d.page.margin.top + d.page.margin.bottom + 14) * MM : 0
    return !fit.overflow && fit.columns.every((c) => c.slack >= reserve)
  }
  const floor = 0.66
  doc = await balance(doc, measure)
  try {
    for (let pages = 1; pages <= maxPages; pages++) {
      const full = scaleDoc(doc, 1, pages)
      if (await fits(full)) return { doc: settle(full, pages), scale: 1, pages, fitted: true }
      if (await fits(scaleDoc(doc, floor, pages))) {
        let lo = floor
        let hi = 1
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2
          if (await fits(scaleDoc(doc, mid, pages))) lo = mid
          else hi = mid
        }
        return { doc: settle(scaleDoc(doc, lo, pages), pages), scale: lo, pages, fitted: true }
      }
    }
    const rest = structuredClone(doc)
    rest.page = { ...rest.page, fit: 'flow' }
    return { doc: rest, scale: 1, pages: maxPages, fitted: false }
  } finally {
    dispose()
  }
}
