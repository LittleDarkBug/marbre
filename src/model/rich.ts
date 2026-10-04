const ALLOWED = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'A', 'BR', 'SPAN', 'FONT'])
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i

export function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement
  const walk = (node: Element) => {
    for (const el of Array.from(node.children)) {
      walk(el)
      if (!ALLOWED.has(el.tagName)) {
        el.replaceWith(...Array.from(el.childNodes))
        continue
      }
      if (el.tagName === 'FONT' || el.tagName === 'SPAN') {
        const color = (el.getAttribute('color') ?? (el as HTMLElement).style.color ?? '').trim()
        if (!COLOR.test(color)) {
          el.replaceWith(...Array.from(el.childNodes))
          continue
        }
        const span = doc.createElement('span')
        span.style.color = color
        span.append(...Array.from(el.childNodes))
        el.replaceWith(span)
        continue
      }
      for (const attr of Array.from(el.attributes)) {
        const keep = el.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|tel:)/i.test(attr.value)
        if (!keep) el.removeAttribute(attr.name)
      }
    }
  }
  walk(root)
  return root.innerHTML.replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>').replace(/<i>/g, '<em>').replace(/<\/i>/g, '</em>')
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

export const plain = (html: string) =>
  html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m)

export const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const RICH_KEYS = new Set(['body', 'title', 'subtitle', 'org', 'meta', 'text', 'key', 'value'])

export function sanitizeBlocks<T>(value: T, parentIsBlock = false): T {
  if (typeof DOMParser === 'undefined') return value
  if (Array.isArray(value)) return value.map((v) => sanitizeBlocks(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    const obj = value as Record<string, unknown>
    const identity = obj.type === 'identity'
    for (const [k, v] of Object.entries(obj)) {
      out[k] = typeof v === 'string' && v.includes('<') && RICH_KEYS.has(k) && !(identity && k === 'title') && !parentIsBlock ? sanitize(v) : sanitizeBlocks(v)
    }
    return out as T
  }
  return value
}
