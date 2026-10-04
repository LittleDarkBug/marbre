import { describe, expect, it } from 'vitest'
import type { TextBlock } from '../model/schema'
import { sampleDoc } from '../templates/sample'
import { fixText, keywordCoverage, proofread } from './rules'

const withProfile = (body: string, mutate?: (d: ReturnType<typeof sampleDoc>) => void) => {
  const doc = sampleDoc('fr')
  ;(doc.blocks.find((b) => b.id === 'profile') as TextBlock).body = body
  doc.rules.frenchSpacing = true
  mutate?.(doc)
  return doc
}

describe('proofreading', () => {
  it('flags forbidden strings, emoji, double spaces and French spacing', () => {
    const dash = String.fromCodePoint(0x2014)
    const doc = withProfile(`Data ${dash} IA  et ML: oui ${String.fromCodePoint(0x1f680)}`, (d) => {
      d.rules.forbidden = [dash]
    })
    const codes = proofread(doc).filter((i) => i.path[1] === 'profile').map((i) => i.code)
    expect(codes).toEqual(['forbidden', 'emoji', 'spacing', 'double'])
  })

  it('accepts correct French spacing and URLs', () => {
    const doc = withProfile('Objectif : voir https://example.org et finir.')
    expect(proofread(doc).filter((i) => i.path[1] === 'profile')).toEqual([])
  })

  it('fixes spacing without breaking entities or links', () => {
    expect(fixText('Langues: FR  et EN ; <a href="https://x.y">lien</a>', 'fr')).toBe('Langues : FR et EN ; <a href="https://x.y">lien</a>')
    expect(fixText('Note&nbsp;: ok', 'fr')).toBe('Note : ok')
  })

  it('reports keyword coverage', () => {
    expect(keywordCoverage(sampleDoc('fr'), ['airflow', 'Kubernetes'])).toEqual([
      { keyword: 'airflow', found: true },
      { keyword: 'Kubernetes', found: false },
    ])
  })
})
