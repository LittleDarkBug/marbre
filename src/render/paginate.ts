const ATOMS = [
  '.mb-h2',
  '.mb-head',
  '.mb-pts > li',
  '.mb-desc',
  '.mb-sub',
  '.mb-org',
  '.mb-dates-line',
  '.mb-text',
  '.mb-skill',
  '.mb-pair',
  '.mb-row',
  '.mb-rate li',
  '.mb-tags',
  '.mb-note',
  '.mb-photo',
  '.mb-id-main',
  '.mb-keys',
  '.mb-contacts',
].join(', ')

const SAFETY = 12

const KEEP_WITH_NEXT = '.mb-h2, .mb-head, .mb-row:not(.mb-org), .mb-sub, .mb-org, .mb-dates-line'

export function clearBreaks(page: HTMLElement) {
  page.querySelectorAll<HTMLElement>('[data-pb]').forEach((el) => {
    el.style.paddingTop = el.dataset.pb ?? ''
    delete el.dataset.pb
    delete el.dataset.pbo
    delete el.dataset.pageStart
    el.style.removeProperty('--pb-print')
  })
}

export function paginate(page: HTMLElement, pageH: number, top: number, bottom: number): number {
  clearBreaks(page)
  const scale = page.getBoundingClientRect().height / page.offsetHeight || 1
  const origin = () => page.getBoundingClientRect().top
  const usable = pageH - top - bottom
  let lowest = 0
  for (const col of Array.from(page.querySelectorAll<HTMLElement>('[data-col]'))) {
    const atoms = Array.from(col.querySelectorAll<HTMLElement>(ATOMS)).filter((el) => !el.parentElement?.closest(ATOMS) && el.offsetHeight > 0)
    for (let i = 0; i < atoms.length; i++) {
      const el = atoms[i]
      const o = origin()
      const r = el.getBoundingClientRect()
      const added = (el: HTMLElement) => (el.dataset.pbo === undefined ? 0 : (parseFloat(getComputedStyle(el).paddingTop) || 0) - Number(el.dataset.pbo))
      const y0 = (r.top - o) / scale + added(el)
      const y1 = (r.bottom - o) / scale
      const h = y1 - y0
      const k = Math.floor(y0 / pageH)
      const start = k * pageH + (k > 0 ? top : 0)
      const limit = (k + 1) * pageH - bottom - SAFETY
      let target: HTMLElement | null = null
      let push = 0
      if (k > 0 && y0 < start - 0.5) {
        target = el
        push = start - y0
      } else if (y1 > limit + 0.5 && h <= usable) {
        target = el
        push = (k + 1) * pageH + top - y0
        for (let j = i - 1; j >= 0; j--) {
          const prev = atoms[j]
          if (!prev.matches(KEEP_WITH_NEXT)) break
          const pr = prev.getBoundingClientRect()
          const py0 = (pr.top - o) / scale + added(prev)
          const below = (target.getBoundingClientRect().top - o) / scale + added(target)
          if (Math.floor(py0 / pageH) !== k || below - (pr.bottom - o) / scale > 24) break
          target = prev
          push = (k + 1) * pageH + top - py0
        }
      }
      if (target && push > 0) {
        const current = parseFloat(getComputedStyle(target).paddingTop) || 0
        if (target.dataset.pb === undefined) {
          target.dataset.pb = target.style.paddingTop
          target.dataset.pbo = String(current)
        }
        target.style.paddingTop = `${current + push}px`
        target.dataset.pageStart = ''
        target.style.setProperty('--pb-print', `${Number(target.dataset.pbo) + top}px`)
        if (target !== el) i = Math.max(-1, atoms.indexOf(target) - 1)
      }
    }
    const last = atoms[atoms.length - 1]
    if (last) lowest = Math.max(lowest, (last.getBoundingClientRect().bottom - origin()) / scale)
  }
  return Math.max(1, Math.ceil((lowest + bottom + SAFETY - 1) / pageH))
}
