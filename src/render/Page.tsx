import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Block, Column, Doc } from '../model/schema'
import { BlockView } from './blocks'
import { StyleCtx } from './context'
import { nearestWeight } from './fontLibrary'
import { stack } from './fonts'
import { iconSvg } from './icons'
import { decorColor, lineSvg, pathIcon, qrSvg } from './style'
import './page.css'

export const PAGE_MM = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } } as const
export const MM = 96 / 25.4

export type ColumnFit = { id: string; slack: number }
export type Fit = { columns: ColumnFit[]; pages: number; overflow: boolean }

function vars(doc: Doc): CSSProperties {
  const t = doc.theme
  const size = PAGE_MM[doc.page.format]
  return {
    '--mb-w': `${size.w}mm`,
    '--mb-h': `${size.h * (doc.page.count ?? 1)}mm`,
    ...(doc.page.background ? { background: doc.page.background } : {}),
    ...(doc.page.backgroundImage ? { backgroundImage: `url("${doc.page.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    '--mb-ink': t.colors.ink,
    '--mb-accent': t.colors.accent,
    '--mb-paper': t.colors.paper,
    '--mb-panel': t.colors.panel,
    '--mb-hl': t.colors.highlight,
    '--mb-f-display': stack(t.fonts.display),
    '--mb-f-heading': stack(t.fonts.heading),
    '--mb-f-body': stack(t.fonts.body),
    '--mb-f-accent': stack(t.fonts.accent),
    '--mb-s-name': `${t.size.name}px`,
    '--mb-s-title': `${t.size.title}px`,
    '--mb-s-heading': `${t.size.heading}px`,
    '--mb-s-body': `${t.size.body}px`,
    '--mb-s-small': `${t.size.small}px`,
    '--mb-w-body': nearestWeight(t.fonts.body, t.weight.body),
    '--mb-w-semi': nearestWeight(t.fonts.body, 600),
    '--mb-w-strong': nearestWeight(t.fonts.body, t.weight.strong),
    '--mb-w-display': nearestWeight(t.fonts.display, 700),
    '--mb-w-heading': nearestWeight(t.fonts.heading, 700),
    '--mb-w-accent': nearestWeight(t.fonts.accent, 600),
    '--mb-lead': t.leading,
    '--mb-sp-section': `${t.spacing.section}px`,
    '--mb-sp-item': `${t.spacing.item}px`,
    '--mb-sp-line': `${t.spacing.line}px`,
  } as CSSProperties
}

const template = (cols: Column[]) => cols.map((c) => (c.unit === 'mm' ? `${c.width}mm` : `minmax(0, ${c.width}fr)`)).join(' ')

function columnPadding(doc: Doc, i: number, count: number, panel: boolean) {
  const m = doc.page.margin
  const half = doc.layout.gutter / 2
  const inner = panel ? Math.max(half, 7) : half
  const left = i === 0 ? Math.max(m.left, panel ? 7 : 0) : inner
  const right = i === count - 1 ? Math.max(m.right, panel ? 7 : 0) : inner
  return `${m.top}mm ${right}mm ${m.bottom}mm ${left}mm`
}

function measure(page: HTMLElement, doc: Doc): Fit {
  const columns: ColumnFit[] = []
  for (const col of Array.from(page.querySelectorAll<HTMLElement>('[data-col]'))) {
    const last = col.lastElementChild as HTMLElement | null
    const pad = parseFloat(getComputedStyle(col).paddingBottom) || 0
    const used = last ? last.offsetTop + last.offsetHeight : 0
    columns.push({ id: col.dataset.col!, slack: Math.round(col.clientHeight - pad - used) })
  }
  const pageH = PAGE_MM[doc.page.format].h * MM
  const count = doc.page.count ?? 1
  const pages = Math.max(count, Math.ceil((page.scrollHeight - 1) / pageH))
  const overflow = doc.page.fit === 'one' ? columns.some((c) => c.slack < 0) || page.scrollHeight > pageH * count + 1 : false
  return { columns, pages, overflow }
}

export function blocksInFlow(doc: Doc) {
  return new Set(doc.layout.mode === 'flow' ? doc.layout.columns.flatMap((c) => c.blocks) : [])
}

export function framedBlocks(doc: Doc): Block[] {
  const inFlow = blocksInFlow(doc)
  const byId = new Map(doc.blocks.map((b) => [b.id, b]))
  const order = doc.layout.order.filter((id) => byId.has(id))
  const rest = doc.blocks.map((b) => b.id).filter((id) => !order.includes(id))
  return [...order, ...rest].filter((id) => !inFlow.has(id) && doc.layout.frames[id]).map((id) => byId.get(id)!)
}

export function Page({ doc, onFit, className }: { doc: Doc; onFit?: (fit: Fit) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const byId = new Map(doc.blocks.map((b) => [b.id, b]))
  const cols = doc.layout.mode === 'flow' ? doc.layout.columns : []
  const framed = framedBlocks(doc)

  useLayoutEffect(() => {
    const page = ref.current
    if (!page || !onFit) return
    const run = () => onFit(measure(page, doc))
    run()
    const ro = new ResizeObserver(run)
    ro.observe(page)
    page.querySelectorAll('[data-col]').forEach((c) => ro.observe(c))
    document.fonts?.ready.then(run)
    return () => ro.disconnect()
  }, [doc, onFit])

  return (
    <StyleCtx.Provider value={{ ...doc.theme, lang: doc.lang }}>
    <div
      ref={ref}
      className={`mb-page ${className ?? ''}`}
      style={vars(doc)}
      lang={doc.lang}
      data-fit={doc.page.fit}
      data-dates={doc.theme.datePlacement}
      data-case={doc.theme.headingCase}
      data-name-case={doc.theme.nameCase}
      data-rule={doc.theme.rule}
      data-identity={doc.theme.identity}
      data-entry={doc.theme.entry}
      data-skills={doc.theme.skills}
      data-pairs={doc.theme.pairs}
      data-headings={doc.theme.headings}
      data-bullets={doc.theme.bullets}
    >
      {className?.includes('is-editing') &&
        Array.from({ length: Math.max(0, (doc.page.count ?? 1) - 1) }, (_, i) => (
          <div key={`break${i}`} className="mb-break" aria-hidden="true" style={{ top: `${PAGE_MM[doc.page.format].h * (i + 1)}mm` }} />
        ))}
      {doc.layout.decor.filter((d) => !d.hidden).map((d) => {
        const shape = d.kind === 'rect' || d.kind === 'ellipse'
        const html = d.kind === 'icon' ? (d.src ? pathIcon(d.src) : d.icon ? iconSvg(d.icon) : undefined) : d.kind === 'line' ? lineSvg(d) : d.kind === 'qr' ? qrSvg(d.text ?? '') : undefined
        return (
          <div
            key={d.id}
            className={`mb-decor mb-decor-${d.kind}`}
            aria-hidden="true"
            data-decor={d.id}
            style={{
              left: `${d.frame.x}mm`,
              top: `${d.frame.y}mm`,
              width: `${d.frame.w}mm`,
              height: `${d.frame.h}mm`,
              transform: d.frame.rotate ? `rotate(${d.frame.rotate}deg)` : undefined,
              zIndex: d.frame.z,
              opacity: d.opacity < 1 ? d.opacity : undefined,
              color: decorColor(d.color),
              borderWidth: shape && d.stroke ? `${d.stroke}mm` : undefined,
              borderColor: shape ? decorColor(d.strokeColor) ?? 'currentColor' : undefined,
              borderStyle: shape && d.dash !== 'solid' ? d.dash : undefined,
              borderRadius: d.kind === 'ellipse' ? '50%' : d.radius ? `${d.radius}mm` : undefined,
              background: shape && d.fill ? 'currentColor' : undefined,
              backgroundImage: d.kind === 'image' && d.src ? `url("${d.src}")` : undefined,
            }}
            dangerouslySetInnerHTML={html ? { __html: html } : undefined}
          />
        )
      })}
      {cols.length > 0 && (
        <div className="mb-flow" style={{ gridTemplateColumns: template(cols) }}>
          {cols.map((col, i) => (
            <div
              key={col.id}
              className={`mb-col${col.panel ? ' mb-panel' : ''}`}
              data-col={col.id}
              style={{ padding: columnPadding(doc, i, cols.length, col.panel) }}
            >
              {col.blocks.map((id) => {
                const b = byId.get(id)
                return b ? <BlockView key={id} block={b} /> : null
              })}
            </div>
          ))}
        </div>
      )}
      {framed.map((b) => {
        const f = doc.layout.frames[b.id]
        return (
          <div
            key={b.id}
            className="mb-frame"
            data-frame={b.id}
            style={{
              left: `${f.x}mm`,
              top: `${f.y}mm`,
              width: `${f.w}mm`,
              minHeight: b.type === 'photo' ? undefined : `${f.h}mm`,
              height: b.type === 'photo' ? `${f.h}mm` : undefined,
              transform: f.rotate ? `rotate(${f.rotate}deg)` : undefined,
              zIndex: f.z + 1,
            }}
          >
            <BlockView block={b} />
          </div>
        )
      })}
    </div>
    </StyleCtx.Provider>
  )
}
