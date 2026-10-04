export type Rect = { x: number; y: number; w: number; h: number }

export function pageRect(el: Element, page: Element, scale: number): Rect {
  const a = el.getBoundingClientRect()
  const p = page.getBoundingClientRect()
  return { x: (a.left - p.left) / scale, y: (a.top - p.top) / scale, w: a.width / scale, h: a.height / scale }
}

export const pageEl = () => document.querySelector<HTMLElement>('.mb-page.is-editing')

export function currentScale(page: HTMLElement) {
  return page.getBoundingClientRect().width / page.offsetWidth || 1
}

export function selectedEl(sel: { blockId: string; itemId?: string } | null) {
  if (!sel) return null
  const page = pageEl()
  if (!page) return null
  if (sel.blockId.startsWith('decor:')) return page.querySelector<HTMLElement>(`[data-decor="${CSS.escape(sel.blockId.slice(6))}"]`)
  const frame = page.querySelector<HTMLElement>(`[data-frame="${CSS.escape(sel.blockId)}"]`)
  const block = frame && !sel.itemId ? frame : page.querySelector<HTMLElement>(`[data-block="${CSS.escape(sel.blockId)}"]`)
  if (!sel.itemId || !block) return block
  return block.querySelector<HTMLElement>(`[data-item="${CSS.escape(sel.itemId)}"]`) ?? block
}
