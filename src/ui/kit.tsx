import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { UI_ICONS, type UiIcon } from './iconSet'
import './ui.css'

export function Icon({ name, size = 16 }: { name: UiIcon; size?: number }) {
  const svg = UI_ICONS[name].replace('<svg', `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"`)
  return <span className="ui-icon" dangerouslySetInnerHTML={{ __html: svg }} />
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: UiIcon; label: string; showLabel?: boolean; pressed?: boolean; tone?: 'plain' | 'solid' | 'proof' }

export function Btn({ icon, label, showLabel = !icon, pressed, tone = 'plain', className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`ui-btn ui-btn-${tone}${showLabel ? '' : ' ui-btn-icon'} ${className ?? ''}`}
      aria-label={showLabel ? undefined : label}
      title={showLabel ? undefined : label}
      aria-pressed={pressed}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {showLabel && <span>{label}</span>}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ui-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="ui-seg-opt" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Scrub({ label, value, onChange, min = 0, max = 999, step = 1, unit }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const start = useRef<{ x: number; v: number } | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0
  return (
    <div className="ui-scrub">
      <label
        htmlFor={id}
        className="ui-scrub-label"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, v: value }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          onChange(clamp(start.current.v + ((e.clientX - start.current.x) / 4) * step))
        }}
        onPointerUp={() => {
          start.current = null
        }}
      >
        {label}
      </label>
      <input
        id={id}
        className="ui-scrub-input"
        inputMode="decimal"
        value={draft ?? value.toFixed(decimals)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number((draft ?? '').replace(',', '.'))
          if (draft !== null && Number.isFinite(n)) onChange(clamp(n))
          setDraft(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(clamp(value + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1)))
          }
        }}
      />
      {unit && <span className="ui-scrub-unit">{unit}</span>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ui-field">
      <span className="ui-field-label">{label}</span>
      {children}
    </label>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  const [prev, setPrev] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setText(value)
  }
  return (
    <div className="ui-color">
      <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} />
      <span className="ui-color-label">{label}</span>
      <input
        className="ui-color-hex"
        aria-label={`${label} hex`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => (/^#[0-9a-f]{6}$/i.test(text) ? onChange(text) : setText(value))}
      />
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ui-section">
      <header className="ui-section-head">
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function Drawer({ open, onClose, title, closeLabel, children }: { open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, onClose])
  return (
    <div className={`ui-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button type="button" className="ui-drawer-scrim" aria-label={title} tabIndex={-1} onClick={onClose} />
      <div className="ui-drawer-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ui-drawer-head">
          <h2>{title}</h2>
          <Btn icon="x" label={closeLabel} onClick={onClose} />
        </header>
        <div className="ui-drawer-body">{children}</div>
      </div>
    </div>
  )
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}
