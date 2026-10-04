import { blankDoc } from '../model/factories'
import { uid } from '../model/ids'
import { escape } from '../model/rich'
import type { Block, Doc, EntriesBlock } from '../model/schema'
import { applyTemplate } from '../templates/apply'
import type { ParsedCv, ParsedSection } from './types'

const html = (s: string) => escape(s).replace(/\n/g, '<br>')

const ENTRY_KIND: Record<string, EntriesBlock['kind']> = { experience: 'experience', education: 'education', projects: 'project', volunteering: 'other' }

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

export const suggestTemplate = (columns: number) => (columns > 1 ? 'signal' : 'colonne')

export function buildDoc(cv: ParsedCv, opts: { columns: number; name: string; template?: string }): Doc {
  const lang = cv.lang
  const doc = blankDoc(opts.name || cv.name || 'CV', lang)
  doc.page = { ...doc.page, fit: 'one', count: 1 }
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
  const blocks: Block[] = [identity]
  if (cv.photo) blocks.push({ id: uid('b'), type: 'photo', heading: '', hidden: false, style: {}, src: cv.photo.src, alt: cv.name, shape: 'circle', focusX: 50, focusY: 40, zoom: 1, grayscale: false, ratio: 1 })
  for (const s of cv.sections) {
    const b = sectionBlock(s, lang)
    if (b) blocks.push(b)
  }
  if (cv.leftovers.length) {
    blocks.push({ id: uid('b'), type: 'text', heading: lang === 'fr' ? 'À trier' : 'To sort', hidden: false, style: { background: '#fff4d6', padding: 3, radius: 2 }, body: html(cv.leftovers.join('\n')) })
  }
  doc.blocks = blocks
  doc.layout.columns = [{ id: uid('c'), width: 1, unit: 'fr', panel: false, blocks: blocks.filter((b) => b.type !== 'photo').map((b) => b.id) }]
  return applyTemplate(doc, opts.template ?? suggestTemplate(opts.columns))
}
