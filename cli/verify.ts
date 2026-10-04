import { PDFDocument, PDFDict, PDFName } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export type Expect = { pages?: number; phrases?: string[]; order?: string[] }
export type Run = { text: string; x0: number; y0: number; x1: number; y1: number; size: number }
export type Report = { ok: boolean; lines: string[]; text: string; runs: Run[] }

const norm = (s: string) => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

export async function textRuns(data: Uint8Array): Promise<{ pages: number; runs: Run[]; text: string }> {
  const pdf = await getDocument({ data: new Uint8Array(data), useSystemFonts: false, disableFontFace: true, verbosity: 0 }).promise
  const runs: Run[] = []
  let text = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { height } = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item)) continue
      const [a, , , d, e, f] = item.transform as number[]
      const size = Math.hypot(a, item.transform[1] as number) || Math.abs(d)
      if (item.str) runs.push({ text: item.str, x0: e, x1: e + item.width, y1: height - f + size * 0.2 + (p - 1) * height, y0: height - f - size * 0.8 + (p - 1) * height, size })
      text += item.str + (item.hasEOL ? '\n' : '')
    }
  }
  return { pages: pdf.numPages, runs, text }
}

export async function type3Fonts(data: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(data)
  const found: string[] = []
  for (const page of doc.getPages()) {
    const fonts = page.node.Resources()?.lookupMaybe(PDFName.of('Font'), PDFDict)
    if (!fonts) continue
    for (const [name, ref] of fonts.entries()) {
      const font = doc.context.lookup(ref, PDFDict)
      if (font.get(PDFName.of('Subtype'))?.toString() === '/Type3') found.push(name.toString())
    }
  }
  return found
}

export async function verifyPdf(data: Uint8Array, expect: Expect): Promise<Report> {
  const lines: string[] = []
  let ok = true
  const fail = (msg: string) => {
    ok = false
    lines.push(`ECHEC  ${msg}`)
  }
  const { pages, runs, text } = await textRuns(data)
  const flat = norm(text)
  lines.push(`pages  ${pages}`)
  if (expect.pages && pages !== expect.pages) fail(`${pages} pages au lieu de ${expect.pages}`)
  const t3 = await type3Fonts(data)
  if (t3.length) fail(`polices Type 3 (mots collés à l'extraction) : ${t3.join(', ')}`)
  else lines.push('polices aucune Type 3')
  for (const p of expect.phrases ?? []) if (!flat.includes(norm(p))) fail(`phrase absente ou altérée : ${p}`)
  if (expect.phrases?.length) lines.push(`phrases ${expect.phrases.length} vérifiées`)
  if (expect.order?.length) {
    const pos = expect.order.map((m) => flat.indexOf(norm(m)))
    const sorted = pos.every((v, i) => v >= 0 && (i === 0 || v > pos[i - 1]))
    if (!sorted) fail(`ordre de lecture : ${expect.order.filter((_, i) => pos[i] < 0 || (i > 0 && pos[i] < pos[i - 1])).join(', ')}`)
    else lines.push('ordre  conforme')
  }
  return { ok, lines, text, runs }
}
