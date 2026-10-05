import { CONTACT_HEADING, findDates, sectionOf } from './patterns'
import type { Line } from './types'

const chars = (ls: Line[]) => ls.reduce((n, l) => n + l.text.trim().length, 0)

function gutter(lines: Line[], width: number): number | null {
  const body = lines.filter((l) => l.text.trim().length > 1)
  if (body.length < 12) return null
  let best: { x: number; gap: number } | null = null
  for (let x = Math.round(width * 0.18); x <= Math.round(width * 0.82); x += 2) {
    const crossing = body.filter((l) => l.x0 < x - 1 && l.x1 > x + 1).length
    if (crossing > Math.max(2, body.length * 0.06)) continue
    const left = body.filter((l) => l.x1 <= x + 1)
    const right = body.filter((l) => l.x0 >= x - 1)
    if (left.length < body.length * 0.15 || right.length < body.length * 0.15) continue
    const tall = (side: Line[]) => Math.max(...side.map((l) => l.y1)) - Math.min(...side.map((l) => l.y0))
    if (tall(left) < 200 || tall(right) < 200) continue
    const gap = Math.min(...right.map((l) => l.x0)) - Math.max(...left.map((l) => l.x1))
    if (!best || gap > best.gap) best = { x: (Math.max(...left.map((l) => l.x1)) + Math.min(...right.map((l) => l.x0))) / 2, gap }
  }
  return best && best.gap >= 6 ? best.x : null
}

function split(own: Line[], width: number) {
  const x = gutter(own, width)
  if (x === null) return null
  const left = own.filter((l) => l.x1 <= x + 1)
  const right = own.filter((l) => l.x0 >= x - 1)
  const [wide, narrow] = chars(right) >= chars(left) ? [right, left] : [left, right]
  if (narrow.length < 6 || chars(narrow) < chars(own) * 0.12) return null
  const place = /^[\p{Lu}][\p{L} .'’-]{1,28}(?:,\s*[\p{Lu}][\p{L} .'’-]{1,28}){0,2}$/u
  const labels = narrow.filter((l) => findDates(l.text) || sectionOf(l.text) || (l.text.length <= 32 && place.test(l.text.trim()) && l.text.includes(','))).length
  if (labels > narrow.length * 0.4) return null
  return { wide, narrow, spanning: own.filter((l) => !left.includes(l) && !right.includes(l)) }
}

export function columnize(lines: Line[], width: number): { lines: Line[]; columns: number } {
  const pages = [...new Set(lines.map((l) => l.page))].sort((a, b) => a - b)
  const byY = (a: Line, b: Line) => a.y0 - b.y0 || a.x0 - b.x0
  const header: Line[] = []
  const main: Line[] = []
  const side: Line[] = []
  let columns = 1
  let sideFirst = false
  for (const page of pages) {
    const own = lines.filter((l) => l.page === page)
    const parts = split(own, width)
    if (!parts) {
      main.push(...own)
      continue
    }
    const isHeading = (l: Line) => l.text.length <= 48 && (sectionOf(l.text, true) || CONTACT_HEADING.test(l.text.trim()))
    const first = (ls: Line[]) => {
      const hs = ls.filter(isHeading)
      return hs.length ? Math.min(...hs.map((l) => l.y0)) : -Infinity
    }
    const wideTop = first(parts.wide)
    const narrowTop = first(parts.narrow)
    const head =
      page === pages[0]
        ? own.filter((l) => (parts.wide.includes(l) ? l.y0 < wideTop - 1 : parts.narrow.includes(l) ? l.y0 < narrowTop - 1 : l.y0 < Math.min(wideTop, narrowTop) - 1))
        : []
    header.push(...[...head].sort(byY))
    const wide = parts.wide.filter((l) => !head.includes(l))
    const narrow = parts.narrow.filter((l) => !head.includes(l))
    const spanning = parts.spanning.filter((l) => !head.includes(l))
    for (const l of wide) l.col = 0
    for (const l of narrow) l.col = 1
    if (page === pages[0]) {
      columns = 2
      const pageTop = Math.min(...own.map((l) => l.y0))
      const upper = own.filter((l) => l.y0 < pageTop + 260 && !parts.spanning.includes(l))
      const biggest = [...upper].sort((a, b) => b.size - a.size)[0]
      sideFirst = Boolean(biggest && narrow.includes(biggest) && !head.length)
    }
    main.push(...[...wide, ...spanning].sort(byY))
    side.push(...[...narrow].sort(byY))
  }
  return { lines: sideFirst ? [...header, ...side, ...main] : [...header, ...main, ...side], columns }
}
