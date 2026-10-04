// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readPdfminer, type Char } from './pdfminer'

const fixtures = import.meta.glob<{ chars: Char[]; boxes: string[] }>('./fixtures/*.json', { eager: true, import: 'default' })
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('pdfminer port matches pdfminer.six on real PDFs', () => {
  for (const [file, { chars, boxes }] of Object.entries(fixtures)) {
    it(file, () => {
      expect(readPdfminer(chars).map((b) => norm(b.text))).toEqual(boxes.map(norm))
    })
  }
})
