export type Char = { text: string; x0: number; y0: number; x1: number; y1: number; block?: string; ref?: number }

type Box = { x0: number; y0: number; x1: number; y1: number }
type Line = Box & { chars: Char[] }
type TextBox = Box & { lines: Line[]; index: number }
type Group = Box & { kids: Node[] }
type Node = TextBox | Group

export const LAPARAMS = { lineOverlap: 0.5, charMargin: 2.0, lineMargin: 0.5, wordMargin: 0.1, boxesFlow: 0.5 }

const w = (b: Box) => b.x1 - b.x0
const h = (b: Box) => b.y1 - b.y0
const voverlap = (a: Box, b: Box) => (a.y0 <= b.y1 && b.y0 <= a.y1 ? Math.min(Math.abs(a.y0 - b.y1), Math.abs(a.y1 - b.y0)) : 0)
const isVoverlap = (a: Box, b: Box) => b.y0 <= a.y1 && a.y0 <= b.y1
const hdistance = (a: Box, b: Box) => (b.x0 <= a.x1 && a.x0 <= b.x1 ? 0 : Math.min(Math.abs(a.x0 - b.x1), Math.abs(a.x1 - b.x0)))
const union = (a: Box, b: Box): Box => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })
const overlaps = (o: Box, q: Box) => !(o.x1 <= q.x0 || q.x1 <= o.x0 || o.y1 <= q.y0 || q.y1 <= o.y0)

function newLine(c: Char): Line {
  return { x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, chars: [c] }
}

function addTo(line: Line, c: Char) {
  line.chars.push(c)
  line.x0 = Math.min(line.x0, c.x0)
  line.y0 = Math.min(line.y0, c.y0)
  line.x1 = Math.max(line.x1, c.x1)
  line.y1 = Math.max(line.y1, c.y1)
}

export function groupLines(chars: Char[], p = LAPARAMS): Line[] {
  const lines: Line[] = []
  let line: Line | null = null
  let prev: Char | null = null
  for (const c of chars) {
    if (prev) {
      const halign = isVoverlap(prev, c) && Math.min(h(prev), h(c)) * p.lineOverlap < voverlap(prev, c) && hdistance(prev, c) < Math.max(w(prev), w(c)) * p.charMargin
      if (halign && line) addTo(line, c)
      else if (line) {
        lines.push(line)
        line = null
      } else if (halign) {
        line = newLine(prev)
        addTo(line, c)
      } else lines.push(newLine(prev))
    }
    prev = c
  }
  if (!line && prev) line = newLine(prev)
  if (line) lines.push(line)
  return lines.filter((l) => l.chars.some((c) => c.text.trim()))
}

export function groupBoxes(lines: Line[], p = LAPARAMS): TextBox[] {
  const boxOf = new Map<Line, Line[]>()
  for (const line of lines) {
    const d = p.lineMargin * h(line)
    const q = { x0: line.x0, y0: line.y0 - d, x1: line.x1, y1: line.y1 + d }
    const neighbors = lines.filter(
      (o) =>
        overlaps(o, q) &&
        Math.abs(h(o) - h(line)) <= d &&
        (Math.abs(o.x0 - line.x0) <= d || Math.abs(o.x1 - line.x1) <= d || Math.abs((o.x0 + o.x1) / 2 - (line.x0 + line.x1) / 2) <= d),
    )
    const members: Line[] = [line]
    for (const o of neighbors) {
      members.push(o)
      const existing = boxOf.get(o)
      if (existing) members.push(...existing)
    }
    const box = [...new Set(members)]
    for (const m of box) boxOf.set(m, box)
  }
  const done = new Set<Line[]>()
  const out: TextBox[] = []
  for (const line of lines) {
    const members = boxOf.get(line)
    if (!members || done.has(members)) continue
    done.add(members)
    const sorted = [...members].sort((a, b) => b.y1 - a.y1)
    const bb = sorted.reduce<Box>((acc, l) => union(acc, l), sorted[0])
    out.push({ ...bb, lines: sorted, index: -1 })
  }
  return out
}

export function groupTree(boxes: TextBox[]): Node | null {
  if (!boxes.length) return null
  if (boxes.length === 1) return boxes[0]
  const dist = (a: Box, b: Box) => {
    const u = union(a, b)
    return w(u) * h(u) - w(a) * h(a) - w(b) * h(b)
  }
  const plane = new Set<Node>(boxes)
  const isany = (a: Node, b: Node) => {
    const u = union(a, b)
    for (const o of plane) if (o !== a && o !== b && overlaps(o, u)) return true
    return false
  }
  type Entry = { skip: boolean; d: number; a: Node; b: Node; seq: number }
  let seq = 0
  const heap: Entry[] = []
  const less = (x: Entry, y: Entry) => (x.skip !== y.skip ? !x.skip : x.d !== y.d ? x.d < y.d : x.seq < y.seq)
  const push = (e: Entry) => {
    heap.push(e)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!less(heap[i], heap[parent])) break
      ;[heap[i], heap[parent]] = [heap[parent], heap[i]]
      i = parent
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && less(heap[l], heap[m])) m = l
        if (r < heap.length && less(heap[r], heap[m])) m = r
        if (m === i) break
        ;[heap[i], heap[m]] = [heap[m], heap[i]]
        i = m
      }
    }
    return top
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) push({ skip: false, d: dist(boxes[i], boxes[j]), a: boxes[i], b: boxes[j], seq: seq++ })
  const done = new Set<Node>()
  while (heap.length) {
    const e = pop()
    if (done.has(e.a) || done.has(e.b)) continue
    if (!e.skip && isany(e.a, e.b)) {
      push({ ...e, skip: true })
      continue
    }
    const group: Group = { ...union(e.a, e.b), kids: [e.a, e.b] }
    plane.delete(e.a)
    plane.delete(e.b)
    done.add(e.a)
    done.add(e.b)
    for (const other of plane) push({ skip: false, d: dist(group, other), a: group, b: other, seq: seq++ })
    plane.add(group)
  }
  return [...plane][0]
}

function assign(node: Node, flow: number, counter: { n: number }) {
  if ('lines' in node) {
    node.index = counter.n++
    return
  }
  node.kids.sort((a, b) => (1 - flow) * a.x0 - (1 + flow) * (a.y0 + a.y1) - ((1 - flow) * b.x0 - (1 + flow) * (b.y0 + b.y1)))
  for (const k of node.kids) assign(k, flow, counter)
}

export type ReadBox = { text: string; blocks: string[]; box: Box }

const lineText = (l: Line, p = LAPARAMS) => {
  let out = ''
  let x1 = -Infinity
  for (const c of l.chars) {
    const margin = p.wordMargin * Math.max(w(c), h(c))
    if (out && x1 < c.x0 - margin && !out.endsWith(' ') && c.text !== ' ') out += ' '
    out += c.text
    x1 = c.x1
  }
  return out.replace(/\s+/g, ' ').trim()
}

export function readPdfminer(chars: Char[], p = LAPARAMS): ReadBox[] {
  const boxes = groupBoxes(groupLines(chars, p), p)
  const tree = groupTree(boxes)
  if (tree) assign(tree, p.boxesFlow, { n: 0 })
  return boxes
    .sort((a, b) => a.index - b.index)
    .map((b) => ({
      text: b.lines.map((l) => lineText(l, p)).join('\n'),
      blocks: [...new Set(b.lines.flatMap((l) => l.chars.map((c) => c.block).filter((x): x is string => Boolean(x))))],
      box: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 },
    }))
}

export type LayoutLine = { text: string; chars: Char[]; x0: number; y0: number; x1: number; y1: number }
export type LayoutBox = { lines: LayoutLine[]; x0: number; y0: number; x1: number; y1: number }

export function pdfminerLayout(chars: Char[], p = LAPARAMS): LayoutBox[] {
  const boxes = groupBoxes(groupLines(chars, p), p)
  const tree = groupTree(boxes)
  if (tree) assign(tree, p.boxesFlow, { n: 0 })
  return boxes
    .sort((a, b) => a.index - b.index)
    .map((b) => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, lines: b.lines.map((l) => ({ text: lineText(l, p), chars: l.chars, x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 })) }))
}
