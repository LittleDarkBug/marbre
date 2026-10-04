// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { coverage, parse } from './parse'
import { readPdf } from './pdf'

const load = (name: string) => {
  const b = readFileSync(new URL(`./fixtures/${name}`, import.meta.url))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

describe('pdf import', () => {
  it.each([
    ['signal_fr.pdf', 2, 'Ingénieure Data et Machine Learning'],
    ['affiche_en.pdf', 2, 'Data and Machine Learning Engineer'],
  ])('%s keeps its words and structure', async (file, columns, title) => {
    const src = await readPdf(load(file))
    expect(src.columns).toBe(columns)
    const cv = parse(src)
    expect(cv.name.toLowerCase()).toBe('camille martin')
    expect(cv.title).toBe(title)
    expect(cv.contacts.map((c) => c.kind)).toEqual(expect.arrayContaining(['email', 'phone', 'github']))
    const kinds = cv.sections.map((s) => s.kind)
    for (const k of ['profile', 'experience', 'projects', 'skills', 'education', 'languages']) expect(kinds).toContain(k)
    expect(cv.sections.find((s) => s.kind === 'experience')!.entries).toHaveLength(2)
    expect(cv.sections.find((s) => s.kind === 'skills')!.groups.length).toBeGreaterThanOrEqual(4)
    expect(coverage(src, cv).ratio).toBeGreaterThan(0.97)
  })
})
