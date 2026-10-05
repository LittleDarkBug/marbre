import { pdfminerLayout, type Char } from '../ats/pdfminer'
import { columnize } from './layout'
import { ImportError, LIMITS, type Line, type Source, type SourceImage } from './types'

type PdfJs = typeof import('pdfjs-dist')
type Meta = { size: number; bold: boolean; italic: boolean }

let pdfjs: Promise<PdfJs> | null = null

async function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjs) {
    pdfjs = (async () => {
      if (typeof window === 'undefined') return (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJs
      const lib = await import('pdfjs-dist')
      {
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        lib.GlobalWorkerOptions.workerSrc = worker.default
      }
      return lib
    })()
  }
  return pdfjs
}

const BOLD = /bold|black|heavy|semibold|demibold|extrabold|ultrabold/i
const ITALIC = /italic|oblique/i

function fontMeta(page: { commonObjs: { get: (k: string) => unknown } }, name: string, size: number): Meta {
  try {
    const font = page.commonObjs.get(name) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean; loadedName?: string } | undefined
    const label = `${font?.name ?? ''}`
    return { size, bold: Boolean(font?.bold || font?.black || BOLD.test(label)), italic: Boolean(font?.italic || ITALIC.test(label)) }
  } catch {
    return { size, bold: false, italic: false }
  }
}

async function imageFromObj(obj: unknown): Promise<{ src: string; w: number; h: number } | null> {
  if (typeof document === 'undefined' || !obj || typeof obj !== 'object') return null
  const img = obj as { width: number; height: number; data?: Uint8ClampedArray; kind?: number; bitmap?: ImageBitmap }
  if (!img.width || !img.height || img.width < 60 || img.height < 60) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0)
  else if (img.data) {
    const rgba = new Uint8ClampedArray(img.width * img.height * 4)
    const src = img.data
    const channels = img.kind === 3 ? 4 : img.kind === 2 ? 3 : 0
    if (!channels) return null
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += channels) {
      rgba[i] = src[j]
      rgba[i + 1] = src[j + 1]
      rgba[i + 2] = src[j + 2]
      rgba[i + 3] = channels === 4 ? src[j + 3] : 255
    }
    ctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0)
  } else return null
  return { src: canvas.toDataURL('image/jpeg', 0.9), w: img.width, h: img.height }
}

function despace(chars: Char[]): string | null {
  const glyphs = chars.filter((c) => c.text.trim()).sort((a, b) => a.x0 - b.x0)
  if (glyphs.length < 4) return null
  const tokens = chars.map((c) => c.text).join('').split(/\s+/).filter(Boolean)
  if (tokens.length < 4 || tokens.filter((t) => t.length === 1).length / tokens.length < 0.75) return null
  const gaps = glyphs.slice(1).map((g, i) => g.x0 - glyphs[i].x1)
  const typical = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
  let out = glyphs[0].text
  glyphs.slice(1).forEach((g, i) => {
    out += (gaps[i] > typical * 1.7 + 0.5 ? ' ' : '') + g.text
  })
  return out
}

type Runs = { text: string; squeezed: string; map: number[] }[]

function glyphRuns(ops: { fnArray: number[]; argsArray: unknown[][] } | null, codes: { showText: number; endText: number; setTextMatrix: number }): Runs {
  const runs: Runs = []
  if (!ops) return runs
  let text = ''
  const flush = () => {
    if (/\S\s+\S/.test(text)) {
      const map: number[] = []
      let squeezed = ''
      Array.from(text).forEach((ch, i) => {
        if (/\s/.test(ch)) return
        squeezed += ch
        map.push(i)
      })
      runs.push({ text: Array.from(text).join(''), squeezed, map })
    }
    text = ''
  }
  ops.fnArray.forEach((fn, i) => {
    if (fn === codes.endText || fn === codes.setTextMatrix) flush()
    if (fn !== codes.showText) return
    const glyphs = ops.argsArray[i][0]
    if (!Array.isArray(glyphs)) return
    for (const g of glyphs) {
      if (g && typeof g === 'object' && 'unicode' in g) text += (g as { unicode: string }).unicode
    }
  })
  flush()
  return runs
}

function lookup(runs: Runs, key: string) {
  let best: string | undefined
  const n = Array.from(key).length
  for (const r of runs) {
    const at = r.squeezed.indexOf(key)
    if (at < 0) continue
    const found = Array.from(r.text).slice(r.map[at], r.map[at + n - 1] + 1).join('').replace(/\s+/g, ' ')
    if (best === undefined || found.split(' ').length < best.split(' ').length) best = found
  }
  return best
}

function unspace(str: string, runs: Runs, loose: boolean) {
  const core = str.trim()
  const tokens = core.split(/ +/)
  const single = tokens.filter((t) => Array.from(t).length === 1).length
  if (tokens.length < (loose ? 2 : 3) || !/^\S+( {1,3}\S+)+$/.test(core) || tokens.some((t) => Array.from(t).length > 2) || single < tokens.length * 0.8) return str
  const lead = /^\s/.test(str) ? ' ' : ''
  const trail = /\s$/.test(str) ? ' ' : ''
  const known = lookup(runs, core.replace(/\s+/g, ''))
  return lead + (known ?? core.split(/ {2,}/).map((w) => w.replace(/ /g, '')).join(' ')) + trail
}

type LayoutLine = ReturnType<typeof pdfminerLayout>[number]['lines'][number]

function splitWide(l: LayoutLine): LayoutLine[] {
  const glyphs = l.chars.filter((c) => c.text.trim())
  const size = glyphs.length ? glyphs.reduce((n, c) => n + (c.y1 - c.y0), 0) / glyphs.length : 10
  const parts: Char[][] = [[]]
  let last: Char | null = null
  for (const c of l.chars) {
    if (c.text.trim() && last && c.x0 - last.x1 > size * 2.5) parts.push([])
    parts[parts.length - 1].push(c)
    if (c.text.trim()) last = c
  }
  if (parts.length === 1) return [l]
  return parts
    .map((cs) => cs.filter((c, i) => c.text.trim() || (i > 0 && i < cs.length - 1)))
    .filter((cs) => cs.some((c) => c.text.trim()))
    .map((cs) => ({ text: cs.map((c) => c.text).join('').replace(/\s+/g, ' ').trim(), chars: cs, x0: Math.min(...cs.map((c) => c.x0)), x1: Math.max(...cs.map((c) => c.x1)), y0: l.y0, y1: l.y1 }))
}

const SIDE_TEXT = /\b(?:19|20)\d{2}\b|\b(?:present|aujourd|actuel|current|now)\b/i

function mergeSideLines(lines: Line[]): Line[] {
  const used = new Set<Line>()
  for (const short of lines) {
    if (short.text.length > 48 || !SIDE_TEXT.test(short.text)) continue
    const right = Math.max(...lines.filter((l) => l.page === short.page && l.col === short.col).map((l) => l.x1))
    if (short.x1 < right - 24) continue
    const host = lines.find(
      (l) => l !== short && !used.has(l) && l.page === short.page && l.col === short.col && l.x1 + 8 < short.x0 && Math.abs(l.y0 - short.y0) < Math.max(2, short.size * 0.45) && short.x0 - l.x1 < 400,
    )
    if (host) {
      host.side = [...(host.side ?? []), short.text]
      used.add(short)
    }
  }
  return lines.filter((l) => !used.has(l))
}

export async function readPdf(data: ArrayBuffer, password?: string): Promise<Source> {
  const lib = await loadPdfJs()
  let doc
  try {
    doc = await lib.getDocument({ data: new Uint8Array(data), password, disableFontFace: true, fontExtraProperties: true, verbosity: 0 }).promise
  } catch (e) {
    const name = (e as { name?: string }).name
    if (name === 'PasswordException') throw new ImportError('password')
    throw new ImportError('unreadable', (e as Error).message)
  }
  if (doc.numPages > LIMITS.pages) throw new ImportError('too-many-pages')
  const lines: Line[] = []
  const images: SourceImage[] = []
  const warnings: string[] = []
  let raw = ''
  let width = 595
  let box = 0
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    width = viewport.width
    const ops = await page.getOperatorList().catch(() => null)
    const content = await page.getTextContent()
    const runs = glyphRuns(ops, lib.OPS)
    const textItems = content.items.filter((it): it is typeof it & { str: string } => 'str' in it)
    const loose = textItems.filter((it) => /^\S( \S){2,}$/.test(it.str.trim())).length >= 4
    const metas: Meta[] = []
    const chars: Char[] = []
    const painted: { str: string; e: number; f: number }[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue
      const [a, b, , d, e, f] = item.transform as number[]
      if (item.str.trim() && painted.some((o) => o.str === item.str && Math.abs(o.e - e) < 2 && Math.abs(o.f - f) < 2)) continue
      painted.push({ str: item.str, e, f })
      const size = Math.hypot(a, b) || Math.abs(d) || 10
      const meta = fontMeta(page, item.fontName, size)
      metas.push(meta)
      const ref = metas.length - 1
      const text = unspace(item.str, runs, loose)
      const step = (item.width || size * 0.5 * text.length) / Math.max(1, text.length)
      for (let i = 0; i < text.length; i++) chars.push({ text: text[i], x0: e + step * i, x1: e + step * (i + 1), y0: f - size * 0.22, y1: f + size * 0.78, ref })
      raw += text + (item.hasEOL ? '\n' : ' ')
    }
    for (const b of pdfminerLayout(chars)) {
      for (const l of b.lines.flatMap(splitWide)) {
        const refs = l.chars.map((c) => c.ref).filter((r): r is number => r !== undefined)
        const ms = refs.map((r) => metas[r])
        const visible = l.chars.filter((c) => c.text.trim()).length || 1
        const boldCount = l.chars.filter((c) => c.ref !== undefined && c.text.trim() && metas[c.ref].bold).length
        const italicCount = l.chars.filter((c) => c.ref !== undefined && c.text.trim() && metas[c.ref].italic).length
        const size = ms.length ? ms.reduce((n, m) => n + m.size, 0) / ms.length : 10
        const text = (despace(l.chars) ?? l.text).replace(/\s+/g, ' ').trim()
        if (!text) continue
        lines.push({ text, page: p, x0: l.x0, x1: l.x1, y0: viewport.height - l.y1 + (p - 1) * 2000, y1: viewport.height - l.y0 + (p - 1) * 2000, size, bold: boldCount / visible > 0.6, italic: italicCount / visible > 0.6, box })
      }
      box++
    }
    if (ops && p <= 2) {
      const names = new Set<string>()
      ops.fnArray.forEach((fn, i) => {
        if (fn === lib.OPS.paintImageXObject) names.add(ops.argsArray[i][0] as string)
      })
      for (const name of names) {
        try {
          const obj = await new Promise<unknown>((resolve) => {
            try {
              page.objs.get(name, resolve)
            } catch {
              resolve(null)
            }
            setTimeout(() => resolve(null), 1500)
          })
          const img = await imageFromObj(obj)
          if (img) images.push({ ...img, page: p, x: 0, y: 0 })
        } catch {
          warnings.push('image')
        }
      }
    }
    if (lines.length > LIMITS.lines) break
  }
  const laid = columnize(lines, width)
  return { kind: 'pdf', lines: mergeSideLines(laid.lines), pages: doc.numPages, images, columns: laid.columns, raw, warnings }
}

export async function renderPdfPages(data: ArrayBuffer, max: number, password?: string): Promise<HTMLCanvasElement[]> {
  const lib = await loadPdfJs()
  const doc = await lib.getDocument({ data: new Uint8Array(data), password, verbosity: 0 }).promise
  const canvases: HTMLCanvasElement[] = []
  for (let p = 1; p <= Math.min(doc.numPages, max); p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 2.2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
    canvases.push(canvas)
  }
  return canvases
}
