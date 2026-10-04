import { plain } from '../model/rich'
import type { Doc } from '../model/schema'

export type Expectation = { start: string; end?: string }

const clean = (s: string) => plain(s).replace(/\s+/g, ' ').trim()

export function expectations(doc: Doc): Expectation[] {
  const upper = (s: string) => (doc.theme.headingCase === 'upper' ? s.toLocaleUpperCase(doc.lang) : s)
  const order = doc.layout.mode === 'flow' ? doc.layout.columns.flatMap((c) => c.blocks) : doc.layout.order
  const out: Expectation[] = []
  for (const id of order) {
    const b = doc.blocks.find((x) => x.id === id)
    if (!b || b.hidden) continue
    if (b.type === 'identity') {
      if (b.name) out.push({ start: clean(doc.theme.nameCase === 'upper' ? b.name.toLocaleUpperCase(doc.lang) : b.name) })
      continue
    }
    if (b.heading) out.push({ start: upper(clean(b.heading)) })
    if (b.type === 'entries') {
      for (const e of b.items) {
        const title = clean(e.title)
        if (!title) continue
        const sameLine = b.kind !== 'education' && b.kind !== 'project' && e.dates
        out.push({ start: title, end: sameLine && (doc.theme.entry === 'split' || doc.layout.columns.length === 1) ? clean(e.dates) : undefined })
        for (const bullet of e.bullets) {
          const text = clean(bullet.text)
          if (text) out.push({ start: `– ${text.slice(0, 24)}` })
        }
      }
    }
    if (b.type === 'skills') for (const g of b.groups) if (g.label) out.push({ start: clean(g.label) })
  }
  return out
}

export function checkLines(lines: string[], expected: Expectation[]) {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
  const ls = lines.map(norm)
  const gaps: string[] = []
  let k = 0
  for (const e of expected) {
    const start = norm(e.start)
    const i = ls.findIndex((l, j) => j >= k && l.startsWith(start))
    if (i < 0) {
      gaps.push(`absent en début de ligne : ${start}`)
      continue
    }
    k = i + 1
    if (e.end && !ls[i].endsWith(norm(e.end))) gaps.push(`ligne fusionnée : ${ls[i].slice(0, 120)}`)
  }
  return gaps
}
