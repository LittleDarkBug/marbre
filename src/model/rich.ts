const ALLOWED = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'BR'])

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
