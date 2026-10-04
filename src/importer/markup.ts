import type { Line, Source } from './types'

const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV', 'TD', 'TH', 'DT', 'DD', 'BLOCKQUOTE', 'PRE', 'ADDRESS', 'SECTION', 'HEADER', 'ARTICLE', 'TR'])
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'OBJECT', 'HEAD'])

const SIZE = /font-size\s*:\s*([\d.]+)\s*(pt|px|em|rem)?/i
const WEIGHT = /font-weight\s*:\s*(bold|bolder|[6-9]00)/i

function inlineStyle(el: Element, text: string) {
  let size = 0
  let boldChars = 0
  const nodes = [el, ...Array.from(el.querySelectorAll('[style]'))]
  for (const n of nodes) {
    const style = n.getAttribute('style') ?? ''
    const len = (n.textContent ?? '').replace(/\s+/g, ' ').trim().length
    if (!len) continue
    const m = SIZE.exec(style)
    if (m && len >= text.length * 0.5) {
      const v = Number(m[1]) * (m[2] === 'px' ? 0.75 : m[2] === 'em' || m[2] === 'rem' ? 11 : 1)
      if (v > 4 && v < 120) size = Math.max(size, v)
    }
    if (WEIGHT.test(style) && n !== el) boldChars += len
    else if (WEIGHT.test(style)) boldChars = text.length
  }
  return { size, bold: boldChars >= text.length * 0.8 }
}

const base = (text: string, i: number): Line => ({ text, page: 1, x0: 0, x1: 500, y0: i * 14, y1: i * 14 + 12, size: 11, bold: false, italic: false })

export function fromHtml(html: string, kind: Source['kind'] = 'html'): Source {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lines: Line[] = []
  const images: Source['images'] = []
  const visit = (el: Element) => {
    if (SKIP.has(el.tagName)) return
    if (el.tagName === 'IMG') {
      const src = el.getAttribute('src') ?? ''
      if (src.startsWith('data:image/')) images.push({ src, w: Number(el.getAttribute('width')) || 200, h: Number(el.getAttribute('height')) || 200, page: 1, x: 0, y: 0 })
      return
    }
    const hasBlockChild = Array.from(el.children).some((c) => BLOCKS.has(c.tagName) && !SKIP.has(c.tagName))
    if (BLOCKS.has(el.tagName) && !hasBlockChild) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) {
        const line = base(text, lines.length)
        const level = /^H([1-6])$/.exec(el.tagName)
        if (level) {
          line.heading = Number(level[1])
          line.size = 22 - Number(level[1]) * 2
          line.bold = true
        }
        const strong = Array.from(el.querySelectorAll('strong, b')).map((s) => s.textContent ?? '').join('').replace(/\s+/g, ' ').trim()
        if (strong && strong.length >= text.length * 0.8) line.bold = true
        const st = inlineStyle(el, text)
        if (st.size && !level) line.size = st.size
        if (st.bold) line.bold = true
        const em = Array.from(el.querySelectorAll('em, i')).map((s) => s.textContent ?? '').join('').trim()
        if (em && em.length >= text.length * 0.8) line.italic = true
        if (el.tagName === 'LI') line.bullet = true
        lines.push(line)
      }
      el.querySelectorAll('img').forEach((img) => visit(img))
      return
    }
    for (const child of Array.from(el.children)) visit(child)
    if (!hasBlockChild && el.children.length === 0 && !BLOCKS.has(el.tagName)) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) lines.push(base(text, lines.length))
    }
  }
  if (doc.body) visit(doc.body)
  return { kind, lines, pages: 1, images, columns: 1, raw: lines.map((l) => l.text).join('\n'), warnings: [] }
}

export function fromText(text: string, markdown = false): Source {
  const lines: Line[] = []
  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    let t = rawLine.replace(/\t/g, '    ').trimEnd()
    if (!t.trim()) continue
    const line = base('', lines.length)
    if (markdown) {
      const h = /^(#{1,6})\s+(.*)$/.exec(t.trim())
      if (h) {
        line.heading = h[1].length
        line.bold = true
        line.size = 22 - h[1].length * 2
        t = h[2]
      }
      t = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\[(.+?)\]\((.+?)\)/g, '$1 $2').replace(/`([^`]+)`/g, '$1')
      if (/^\s*[-*+]\s+/.test(t)) {
        line.bullet = true
        t = t.replace(/^\s*[-*+]\s+/, '')
      }
    }
    line.text = t.trim().replace(/\s{3,}/g, '   ')
    lines.push(line)
  }
  return { kind: markdown ? 'markdown' : 'text', lines, pages: 1, images: [], columns: 1, raw: text, warnings: [] }
}

const decodeXml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')

export function fromWordXml(xml: string): Source {
  const lines: Line[] = []
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []
  const seen = new Set<string>()
  for (const p of paragraphs) {
    if (/<w:p[ >][\s\S]*<w:p[ >]/.test(p.slice(5))) continue
    const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []
    let text = ''
    let bold = 0
    let size = 0
    for (const r of runs) {
      const t = (r.match(/<w:t[^>]*>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) ?? []).map((x) => (x.startsWith('<w:t') && !x.startsWith('<w:tab') ? decodeXml(x.replace(/<[^>]+>/g, '')) : ' ')).join('')
      text += t
      if (/<w:b(?:\s+w:val="(?:true|1|on)")?\s*\/>/.test(r)) bold += t.trim().length
      const sz = /<w:sz w:val="(\d+)"/.exec(r)
      if (sz && t.trim()) size = Math.max(size, Number(sz[1]) / 2)
    }
    text = text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const key = `${text}|${lines.length > 0 ? '' : 'first'}`
    if (seen.has(key) && /mc:Fallback/.test(p)) continue
    seen.add(key)
    const line = base(text, lines.length)
    line.bold = bold >= text.replace(/\s/g, '').length * 0.8
    if (size) line.size = size
    const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? ''
    const h = /^(?:heading|titre|title|berschrift)\s*(\d)?$/i.exec(style.replace(/[-_]/g, ' '))
    if (h) line.heading = Number(h[1] ?? 1)
    if (/<w:numPr>/.test(p) || /list/i.test(style)) line.bullet = true
    lines.push(line)
  }
  return { kind: 'docx', lines, pages: 1, images: [], columns: 1, raw: lines.map((l) => l.text).join('\n'), warnings: [] }
}

function decodeBytes(bytes: Uint8Array, charset: string) {
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

export function decodeMime(data: Uint8Array): string | null {
  let mht = ''
  for (let i = 0; i < data.length; i += 8192) mht += String.fromCharCode(...data.subarray(i, i + 8192))
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(mht)?.[1]
  const parts = boundary ? mht.split(`--${boundary}`) : [mht]
  for (const part of parts) {
    if (!/content-type:\s*text\/html/i.test(part) && boundary) continue
    const split = part.search(/\r?\n\r?\n/)
    const headers = split > 0 ? part.slice(0, split) : ''
    let body = split > 0 ? part.slice(split).trim() : part
    let bytes: Uint8Array
    if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
      body = body.replace(/=\r?\n/g, '')
      const out: number[] = []
      for (let i = 0; i < body.length; i++) {
        if (body[i] === '=' && /^[0-9A-F]{2}$/i.test(body.slice(i + 1, i + 3))) {
          out.push(parseInt(body.slice(i + 1, i + 3), 16))
          i += 2
        } else out.push(body.charCodeAt(i) & 0xff)
      }
      bytes = new Uint8Array(out)
    } else if (/content-transfer-encoding:\s*base64/i.test(headers)) bytes = Uint8Array.from(atob(body.replace(/\s/g, '')), (c) => c.charCodeAt(0))
    else bytes = Uint8Array.from(body, (c) => c.charCodeAt(0) & 0xff)
    const sniff = String.fromCharCode(...bytes.subarray(0, 4096))
    const charset = /charset="?([\w-]+)/i.exec(headers)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1] ?? 'utf-8'
    const html = decodeBytes(bytes, charset)
    if (/<html|<body|<p[\s>]|<div/i.test(html)) return html
  }
  return null
}

const amount = (s: Source) => s.lines.reduce((n, l) => n + l.text.length, 0)

export async function fromDocx(data: ArrayBuffer): Promise<Source> {
  const candidates: Source[] = []
  const warnings: string[] = []
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml(
      { arrayBuffer: data },
      {
        styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Heading 1'] => h2:fresh", "p[style-name='Heading 2'] => h3:fresh", "p[style-name='Titre'] => h1:fresh", "p[style-name='Titre 1'] => h2:fresh", "p[style-name='Titre 2'] => h3:fresh"],
        convertImage: mammoth.images.imgElement((image: { read: (enc: string) => Promise<string>; contentType: string }) => image.read('base64').then((b64) => ({ src: `data:${image.contentType};base64,${b64}` }))),
      },
    )
    candidates.push(fromHtml(result.value, 'docx'))
  } catch {
    warnings.push('docx')
  }
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(data)
    const xml = await zip.file('word/document.xml')?.async('string')
    if (xml) candidates.push(fromWordXml(xml))
    for (const name of Object.keys(zip.files)) {
      if (!/^word\/[^/]+\.(?:mht|mhtml|html?|xhtml)$/i.test(name)) continue
      const bytes = await zip.file(name)!.async('uint8array')
      const html = /\.mht/i.test(name) ? decodeMime(bytes) : decodeBytes(bytes, /<meta[^>]+charset=["']?([\w-]+)/i.exec(String.fromCharCode(...bytes.subarray(0, 4096)))?.[1] ?? 'utf-8')
      if (html) candidates.push(fromHtml(html, 'docx'))
    }
  } catch {
    warnings.push('docx')
  }
  if (!candidates.length) return { kind: 'docx', lines: [], pages: 1, images: [], columns: 1, raw: '', warnings }
  const richest = Math.max(...candidates.map(amount))
  const best = candidates.find((c) => amount(c) >= richest * 0.92) ?? candidates[0]
  best.images = candidates.flatMap((c) => c.images)
  best.warnings.push(...warnings)
  return best
}
