import { load } from '../model/migrate'
import { fromJsonResume } from '../model/resume'
import type { Doc } from '../model/schema'
import { buildDoc } from './build'
import { fromDocx, fromHtml, fromText } from './markup'
import { coverage, parse } from './parse'
import { ImportError, LIMITS, type Coverage, type ParsedCv, type Source } from './types'

export type ImportResult = { doc: Doc; cv?: ParsedCv; source?: Source; coverage?: Coverage; kind: string; warnings: string[] }
export type Progress = (step: 'read' | 'ocr' | 'parse' | 'build', ratio?: number) => void

const ext = (name: string) => name.toLowerCase().split('.').pop() ?? ''

async function sniff(file: File): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const sig = Array.from(head.slice(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (sig === '25504446') return 'pdf'
  if (sig === '504b0304') return ext(file.name) === 'odt' ? 'odt' : 'docx'
  if (sig.startsWith('ffd8') || sig === '89504e47' || sig.startsWith('4749') || sig === '52494646') return 'image'
  const e = ext(file.name)
  if (['json', 'html', 'htm', 'txt', 'md', 'markdown', 'rtf'].includes(e)) return e === 'htm' ? 'html' : e === 'markdown' ? 'md' : e
  if (file.type.startsWith('text/')) return 'txt'
  return e
}

const textAmount = (s: Source) => s.lines.reduce((n, l) => n + l.text.length, 0)

function stripRtf(rtf: string) {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n: string) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
}

async function readSource(file: File, kind: string, password: string | undefined, progress: Progress): Promise<Source> {
  if (kind === 'pdf') {
    const data = await file.arrayBuffer()
    const { readPdf, renderPdfPages } = await import('./pdf')
    let source: Source | null = null
    try {
      source = await readPdf(data.slice(0), password)
    } catch (e) {
      if (e instanceof ImportError && (e.code === 'password' || e.code === 'too-many-pages')) throw e
    }
    if (source && textAmount(source) > 80 * Math.max(1, source.pages) * 0.25) return source
    progress('ocr', 0)
    const { ocrImages } = await import('./ocr')
    const canvases = await renderPdfPages(data.slice(0), LIMITS.ocrPages, password)
    const ocr = await ocrImages(canvases, (r) => progress('ocr', r))
    if (source) ocr.images = source.images
    return ocr
  }
  if (kind === 'image') {
    progress('ocr', 0)
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const { ocrImages } = await import('./ocr')
      return await ocrImages([img], (r) => progress('ocr', r))
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  if (kind === 'docx') return fromDocx(await file.arrayBuffer())
  if (kind === 'odt') {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const xml = await zip.file('content.xml')?.async('string')
    if (!xml) throw new ImportError('unreadable')
    const html = xml.replace(/<text:h[^>]*text:outline-level="(\d)"[^>]*>/g, '<h$1>').replace(/<\/text:h>/g, '</h2>').replace(/<text:p[^>]*>/g, '<p>').replace(/<\/text:p>/g, '</p>').replace(/<text:list-item[^>]*>/g, '<li>').replace(/<\/text:list-item>/g, '</li>').replace(/<text:(?:s|tab)[^>]*\/>/g, ' ').replace(/<(?!\/?(?:h\d|p|li)\b)[^>]+>/g, '')
    return fromHtml(html, 'docx')
  }
  const text = await file.text()
  if (kind === 'html') return fromHtml(text)
  if (kind === 'md') return fromText(text, true)
  if (kind === 'rtf') return fromText(stripRtf(text))
  return fromText(text)
}

export async function importFile(file: File, opts: { lang: 'fr' | 'en'; password?: string; onProgress?: Progress }): Promise<ImportResult> {
  const progress: Progress = opts.onProgress ?? (() => undefined)
  if (file.size > LIMITS.bytes) throw new ImportError('too-big')
  if (file.size === 0) throw new ImportError('empty')
  const kind = await sniff(file)
  progress('read')
  if (kind === 'json') {
    let raw: unknown
    try {
      raw = JSON.parse(await file.text())
    } catch {
      throw new ImportError('unreadable')
    }
    const obj = raw as Record<string, unknown>
    const doc = obj && 'basics' in obj && !('blocks' in obj) ? fromJsonResume(obj, opts.lang) : load(obj)
    return { doc, kind: 'json', warnings: [] }
  }
  if (!['pdf', 'image', 'docx', 'odt', 'html', 'txt', 'md', 'rtf'].includes(kind)) throw new ImportError('unsupported')
  const source = await readSource(file, kind, opts.password, progress)
  if (!source.lines.length) throw new ImportError('empty')
  progress('parse')
  let cv: ParsedCv
  try {
    cv = parse(source)
  } catch {
    cv = { lang: opts.lang, name: '', title: '', contacts: [], sections: [], leftovers: source.lines.map((l) => [l.text, ...(l.side ?? [])].join(' ')) }
  }
  progress('build')
  const name = file.name.replace(/\.[^.]+$/, '')
  const doc = buildDoc(cv, { columns: source.columns, name: cv.name || name })
  const cov = coverage(source, cv)
  return { doc, cv, source, coverage: cov, kind: source.kind, warnings: source.warnings }
}
