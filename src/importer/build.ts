import { blankDoc } from '../model/factories'
import { uid } from '../model/ids'
import { escape } from '../model/rich'
import type { Block, Doc, EntriesBlock } from '../model/schema'
import { TEMPLATES } from '../templates'
import type { ParsedCv, ParsedSection } from './types'

const html = (s: string) => escape(s).replace(/\n/g, '<br>')

const ENTRY_KIND: Record<string, EntriesBlock['kind']> = { experience: 'experience', education: 'education', projects: 'project', volunteering: 'other' }
const SIDE = new Set(['skills', 'languages', 'certifications', 'awards', 'interests', 'references'])

function sectionBlock(s: ParsedSection, lang: 'fr' | 'en'): Block | null {
  const base = { id: uid('b'), heading: s.heading, hidden: false, style: {} }
  if (s.entries.length && ENTRY_KIND[s.kind]) {
    return {
      ...base,
      type: 'entries',
      kind: ENTRY_KIND[s.kind],
      items: s.entries.map((e) => ({
        id: uid('e'),
        title: html(e.title),
        subtitle: html(e.subtitle),
        org: html(e.org),
        meta: html(e.meta),
        dates: e.dates,
        tags: '',
        body: html(e.body),
        bullets: e.bullets.map((b) => ({ id: uid('u'), text: html(b) })),
      })),
    }
  }
  if (s.groups.length) return { ...base, type: 'skills', groups: s.groups.map((g) => ({ id: uid('g'), label: g.label, items: g.items })) }
  if (s.pairs.length) return { ...base, type: 'pairs', items: s.pairs.map((p) => ({ id: uid('p'), key: html(p.key), value: html(p.value) })) }
  if (s.text) return { ...base, heading: s.heading || (lang === 'fr' ? 'Informations' : 'Information'), type: 'text', body: html(s.text) }
  return null
}

export function buildDoc(cv: ParsedCv, opts: { columns: number; name: string }): Doc {
  const lang = cv.lang
  const template = TEMPLATES.find((t) => t.id === (opts.columns > 1 ? 'signal' : 'colonne'))!.make(lang)
  const doc = blankDoc(opts.name || cv.name || 'CV', lang)
  doc.theme = template.theme
  doc.page = { ...template.page, fit: 'flow' }
  const identity: Block = {
    id: uid('b'),
    type: 'identity',
    heading: '',
    hidden: false,
    style: {},
    name: cv.name,
    title: cv.title,
    highlights: (cv.highlights ?? []).map((text) => ({ id: uid('h'), text })),
    contacts: cv.contacts.map((c) => ({ id: uid('k'), kind: c.kind, text: c.text, href: c.href })),
  }
  const main: string[] = [identity.id]
  const side: string[] = []
  const blocks: Block[] = [identity]
  if (cv.photo) {
    const photo: Block = { id: uid('b'), type: 'photo', heading: '', hidden: false, style: {}, src: cv.photo.src, alt: cv.name, shape: 'circle', focusX: 50, focusY: 40, zoom: 1, grayscale: false, ratio: 1 }
    blocks.push(photo)
    if (opts.columns > 1) side.push(photo.id)
    else {
      doc.layout.frames[photo.id] = { x: 168, y: 10, w: 30, h: 30, rotate: 0, z: 2, locked: false }
      doc.layout.order.push(photo.id)
    }
  }
  for (const s of cv.sections) {
    const b = sectionBlock(s, lang)
    if (!b) continue
    blocks.push(b)
    if (opts.columns > 1 && SIDE.has(s.kind)) side.push(b.id)
    else main.push(b.id)
  }
  if (cv.leftovers.length) {
    const rest: Block = { id: uid('b'), type: 'text', heading: lang === 'fr' ? 'À trier' : 'To sort', hidden: false, style: { background: '#fff4d6', padding: 3, radius: 2 }, body: html(cv.leftovers.join('\n')) }
    blocks.push(rest)
    main.push(rest.id)
  }
  doc.blocks = blocks
  doc.layout.columns =
    opts.columns > 1 && side.length
      ? [
          { id: uid('c'), width: 1, unit: 'fr', panel: false, blocks: main },
          { id: uid('c'), width: 66, unit: 'mm', panel: true, blocks: side },
        ]
      : [{ id: uid('c'), width: 1, unit: 'fr', panel: false, blocks: [...main, ...side] }]
  doc.layout.gutter = template.layout.gutter
  return doc
}
