import { describe, expect, it } from 'vitest'
import { blankDoc, newBlock, newEntry } from './factories'
import { DocError, load } from './migrate'
import { formatRange, fromJsonResume, toJsonResume } from './resume'
import { plain, sanitize } from './rich'
import type { EntriesBlock } from './schema'
import { diff, resolve, withEdit } from './variants'

const sample = () => {
  const doc = blankDoc('Test')
  const xp = doc.blocks[2] as EntriesBlock
  xp.items = [newEntry('A'), newEntry('B'), newEntry('C')]
  xp.items[0].bullets = [{ id: 'u1', text: 'un' }, { id: 'u2', text: 'deux' }]
  return doc
}

describe('variants', () => {
  it('resolves to the base when no variant', () => {
    const doc = sample()
    expect(resolve(doc, null)).toBe(doc)
  })

  it('round-trips any edit through overrides', () => {
    const doc = sample()
    doc.variants = [{ id: 'v1', name: 'Offre', overrides: [] }]
    const edited = structuredClone(doc)
    const xp = edited.blocks[2] as EntriesBlock
    xp.items[0].title = 'A modifié'
    xp.items.reverse()
    xp.items = xp.items.filter((e) => e.title !== 'B')
    xp.items.find((e) => e.title === 'A modifié')!.bullets.reverse()
    edited.theme.size.body = 12
    const next = withEdit(doc, 'v1', edited)
    const resolved = resolve(next, 'v1')
    expect(resolved.blocks).toEqual(edited.blocks)
    expect(resolved.theme).toEqual(edited.theme)
    expect(next.blocks).toEqual(doc.blocks)
  })

  it('stores whole arrays when items are added', () => {
    const doc = sample()
    const edited = structuredClone(doc)
    ;(edited.blocks[2] as EntriesBlock).items.push(newEntry('D'))
    const ops = diff(doc, edited)
    expect(ops).toHaveLength(1)
    expect(ops[0].op).toBe('set')
  })

  it('switches language with the variant', () => {
    const doc = sample()
    doc.variants = [{ id: 'en', name: 'English', lang: 'en', overrides: [] }]
    expect(resolve(doc, 'en').lang).toBe('en')
  })
})

describe('load', () => {
  it('accepts a valid document', () => {
    const doc = blankDoc()
    expect(load(JSON.parse(JSON.stringify(doc))).id).toBe(doc.id)
  })

  it('rejects newer and invalid documents', () => {
    expect(() => load({ ...blankDoc(), version: 99 })).toThrow(DocError)
    expect(() => load({ version: 1, name: 3 })).toThrow(DocError)
    expect(() => load('x')).toThrow(DocError)
  })
})

describe('rich text', () => {
  it('keeps only bold, italic and safe links', () => {
    const out = sanitize('<b>gras</b> <span style="x">s</span> <a href="javascript:x" onclick="y">l</a> <a href="https://a.b">ok</a><script>z</script>')
    expect(out).toBe('<strong>gras</strong> s <a>l</a> <a href="https://a.b">ok</a>z')
  })

  it('extracts plain text', () => {
    expect(plain('<strong>+15&nbsp;%</strong> de A &amp; B')).toBe('+15 % de A & B')
  })
})

describe('JSON Resume', () => {
  const resume = {
    basics: { name: 'Camille Martin', label: 'Data Engineer', email: 'c@m.fr', summary: 'Pipelines <fiables>.', profiles: [{ network: 'GitHub', url: 'https://github.com/cm' }] },
    work: [{ name: 'Acme', position: 'Engineer', startDate: '2023-07-01', endDate: '2024-04', highlights: ['Built X'] }],
    skills: [{ name: 'Langages', keywords: ['Python', 'SQL'] }],
    languages: [{ language: 'Anglais', fluency: 'C1' }],
  }

  it('imports into blocks in reading order', () => {
    const doc = fromJsonResume(resume, 'fr')
    expect(doc.blocks.map((b) => b.type)).toEqual(['identity', 'text', 'entries', 'skills', 'pairs'])
    expect(doc.layout.columns[0].blocks).toEqual(doc.blocks.map((b) => b.id))
    const xp = doc.blocks[2] as EntriesBlock
    expect(xp.items[0].dates).toBe('Juil. 2023 – Avr. 2024')
    expect(xp.items[0].bullets[0].text).toBe('Built X')
    expect((doc.blocks[1] as { body: string }).body).toBe('Pipelines &lt;fiables&gt;.')
  })

  it('exports back the essentials', () => {
    const out = toJsonResume(fromJsonResume(resume, 'en')) as { basics: { name: string; profiles: unknown[] }; skills: { keywords: string[] }[] }
    expect(out.basics.name).toBe('Camille Martin')
    expect(out.basics.profiles).toHaveLength(1)
    expect(out.skills[0].keywords).toEqual(['Python', 'SQL'])
  })

  it('formats open ranges', () => {
    expect(formatRange('2025-09', '', 'en')).toBe('Sep. 2025 – Present')
  })
})

describe('factories', () => {
  it('creates every block type', () => {
    for (const t of ['identity', 'text', 'entries', 'skills', 'pairs'] as const) expect(newBlock(t).type).toBe(t)
  })
})

describe('import safety', () => {
  it('strips scripts and handlers from rich fields on load, keeps plain text intact', () => {
    const doc = blankDoc()
    ;(doc.blocks[1] as { body: string }).body = '<img src=x onerror="alert(1)"><strong>ok</strong><span style="color:#ff0000">rouge</span>'
    ;(doc.blocks[0] as { contacts: { id: string; kind: 'other'; text: string }[] }).contacts = [{ id: 'k', kind: 'other', text: 'R&D' }]
    const loaded = load(JSON.parse(JSON.stringify(doc)))
    expect((loaded.blocks[1] as { body: string }).body).toBe('<strong>ok</strong><span style="color: rgb(255, 0, 0);">rouge</span>')
    expect((loaded.blocks[0] as { contacts: { text: string }[] }).contacts[0].text).toBe('R&D')
  })
})
