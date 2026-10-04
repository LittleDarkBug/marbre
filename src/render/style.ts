import type { CSSProperties } from 'react'
import qrcode from 'qrcode-generator'
import type { Block, Decor, Doc } from '../model/schema'
import { nearestWeight } from './fontLibrary'
import { loadFamily, loadThemeFonts, stack } from './fonts'

export function blockStyle(block: Block): CSSProperties | undefined {
  const s = block.style
  if (!s || !Object.keys(s).length) return undefined
  const css: Record<string, string | number> = {}
  if (s.font) {
    css['--mb-f-body'] = stack(s.font)
    css['--mb-w-body'] = nearestWeight(s.font, s.weight ?? 400)
    css['--mb-w-strong'] = nearestWeight(s.font, 700)
    css['--mb-w-semi'] = nearestWeight(s.font, 600)
  }
  if (s.headingFont) {
    css['--mb-f-heading'] = stack(s.headingFont)
    css['--mb-f-display'] = stack(s.headingFont)
    css['--mb-w-heading'] = nearestWeight(s.headingFont, 700)
    css['--mb-w-display'] = nearestWeight(s.headingFont, 700)
  }
  if (s.weight && !s.font) css['--mb-w-body'] = s.weight
  if (s.size) css['--mb-s-body'] = `${s.size}px`
  if (s.color) css['--mb-ink'] = s.color
  if (s.accent) css['--mb-accent'] = s.accent
  if (s.leading) css['--mb-lead'] = s.leading
  if (s.background) css.background = s.background
  if (s.padding) css.padding = `${s.padding}mm`
  if (s.radius) css.borderRadius = `${s.radius}mm`
  if (s.borderWidth) css.border = `${s.borderWidth}mm solid ${s.borderColor || 'currentColor'}`
  if (s.align) css.textAlign = s.align
  if (s.tracking) css.letterSpacing = `${s.tracking}em`
  if (s.uppercase) css.textTransform = 'uppercase'
  if (s.opacity !== undefined && s.opacity < 1) css.opacity = s.opacity
  if (s.color) css.color = s.color
  return css as CSSProperties
}

export async function loadDocFonts(doc: Doc) {
  const extra = doc.blocks.flatMap((b) => [b.style?.font, b.style?.headingFont]).filter((f): f is string => Boolean(f))
  await Promise.all([loadThemeFonts(doc.theme), ...extra.map(loadFamily)])
  if (typeof document !== 'undefined') await document.fonts.ready
}

export const decorColor = (value: string | undefined) =>
  !value ? undefined : value === 'accent' ? 'var(--mb-accent)' : value === 'ink' ? 'var(--mb-ink)' : value === 'panel' ? 'var(--mb-panel)' : value

export function qrSvg(text: string) {
  const qr = qrcode(0, 'M')
  qr.addData(text || ' ')
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`
}

export function lineSvg(d: Decor) {
  const key = d.id.replace(/[^\w-]/g, '')
  const dash = d.dash === 'dashed' ? `stroke-dasharray="${d.stroke * 4} ${d.stroke * 3}"` : d.dash === 'dotted' ? `stroke-dasharray="0 ${d.stroke * 2.4}" stroke-linecap="round"` : ''
  const head = (id: string) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>`
  const start = d.arrow === 'both' ? `marker-start="url(#s${key})"` : ''
  const end = d.arrow !== 'none' ? `marker-end="url(#e${key})"` : ''
  return `<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" style="overflow:visible"><defs>${head(`s${key}`)}${head(`e${key}`)}</defs><line x1="1" y1="5" x2="99" y2="5" stroke="currentColor" stroke-width="${d.stroke}mm" vector-effect="non-scaling-stroke" ${dash} ${start} ${end}/></svg>`
}

const ICON_PATH = /^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/

export const pathIcon = (d: string) => (ICON_PATH.test(d) ? `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>` : '')
