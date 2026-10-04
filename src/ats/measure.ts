import type { Char } from './pdfminer'

export type Sample = { chars: Char[]; height: number; sizes: { block: string; px: number; text: string }[]; rotated: string[]; spaced: string[] }

const SKIP = (el: Element) => el.closest('[aria-hidden="true"], .mb-decor') !== null

function pushWord(chars: Char[], text: string, r: DOMRect, origin: DOMRect, scale: number, size: number, H: number, block?: string) {
  const left = (r.left - origin.left) / scale
  const right = (r.right - origin.left) / scale
  const bottom = (r.bottom - origin.top) / scale
  const step = (right - left) / text.length
  for (let i = 0; i < text.length; i++) {
    chars.push({ text: text[i], x0: left + step * i, x1: left + step * (i + 1), y0: H - bottom, y1: H - bottom + size, block })
  }
}

export function samplePage(page: HTMLElement): Sample {
  const origin = page.getBoundingClientRect()
  const scale = origin.width / page.offsetWidth || 1
  const H = page.offsetHeight
  const lang = page.lang || undefined
  const chars: Char[] = []
  const sizes: Sample['sizes'] = []
  const rotated = new Set<string>()
  const spaced = new Set<string>()
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  const range = document.createRange()
  let node: Node | null
  let lastRight: { x: number; bottom: number } | null = null
  let sawSpace = false
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === 'LI' && el.parentElement?.classList.contains('mb-pts') && !SKIP(el)) {
        const content = getComputedStyle(el, '::before').content
        const first = el.firstChild
        if (content && content !== 'none' && content !== '""' && content !== "''" && first) {
          range.selectNodeContents(el)
          const rects = range.getClientRects()
          if (rects.length) {
            const r = rects[0]
            const size = parseFloat(getComputedStyle(el).fontSize)
            const dash = new DOMRect(r.left - size * 0.85 * scale, r.top, size * 0.5 * scale, r.height)
            pushWord(chars, '–', dash, origin, scale, size, H, el.closest<HTMLElement>('[data-block]')?.dataset.block)
          }
        }
      }
      continue
    }
    const textNode = node as Text
    const parent = textNode.parentElement
    if (!parent || SKIP(parent) || !textNode.data.trim()) continue
    const style = getComputedStyle(parent)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    const block = parent.closest<HTMLElement>('[data-block]')?.dataset.block
    const size = parseFloat(style.fontSize)
    const upper = style.textTransform === 'uppercase'
    const frame = parent.closest<HTMLElement>('[data-frame]')
    if (frame && /rotate\((?!0deg)/.test(frame.style.transform) && block) rotated.add(block)
    if (style.letterSpacing !== 'normal' && parseFloat(style.letterSpacing) !== 0 && block) spaced.add(block)
    const data = textNode.data
    const re = /\S+/g
    let m: RegExpExecArray | null
    if (/^\s/.test(data)) sawSpace = true
    while ((m = re.exec(data))) {
      if (m.index > 0) sawSpace = true
      range.setStart(textNode, m.index)
      range.setEnd(textNode, m.index + m[0].length)
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0)
      if (!rects.length) continue
      const r = rects[0]
      if (sawSpace && lastRight && Math.abs(lastRight.bottom - r.bottom) < 2 && r.left > lastRight.x) {
        pushWord(chars, ' ', new DOMRect(lastRight.x, r.top, Math.min(r.left - lastRight.x, size * 0.25 * scale), r.height), origin, scale, size, H, block)
      }
      sawSpace = false
      pushWord(chars, upper ? m[0].toLocaleUpperCase(lang) : m[0], r, origin, scale, size, H, block)
      lastRight = { x: r.right, bottom: r.bottom }
      if (block) sizes.push({ block, px: size, text: m[0] })
    }
    if (/\s$/.test(data)) sawSpace = true
  }
  return { chars, height: H, sizes, rotated: [...rotated], spaced: [...spaced] }
}
