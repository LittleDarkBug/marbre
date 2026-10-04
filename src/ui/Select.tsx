import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './kit'

export type SelectOption<T extends string> = { value: T; label: string; group?: string; hint?: string; preview?: ReactNode; style?: CSSProperties }

type Props<T extends string> = {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
  triggerStyle?: CSSProperties
  searchPlaceholder?: string
  searchable?: boolean
  width?: number
  emptyLabel?: string
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Select<T extends string>({ value, options, onChange, label, className, triggerStyle, searchPlaceholder, searchable, width, emptyLabel }: Props<T>) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null)
  const withSearch = searchable ?? options.length > 14
  const current = options.find((o) => o.value === value)
  const shown = useMemo(() => (query ? options.filter((o) => fold(o.label).includes(fold(query))) : options), [options, query])

  const close = useCallback((refocus = true) => {
    setOpen(false)
    setQuery('')
    if (refocus) trigger.current?.focus()
  }, [])

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const pick = (o: SelectOption<T> | undefined) => {
    if (!o) return
    if (o.value !== value) onChange(o.value)
    close()
  }

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom - 12
      const above = r.top - 12
      const up = below < 220 && above > below
      const w = Math.min(Math.max(r.width, width ?? 0, 180), window.innerWidth - 16)
      setPlace({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: up ? r.top - 6 : r.bottom + 6, width: w, maxHeight: Math.min(340, up ? above : below), up })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, width])

  useEffect(() => {
    if (!open) return
    if (withSearch) search.current?.focus()
    else list.current?.focus()
    const outside = (e: PointerEvent) => {
      const t = e.target as Node
      if (!list.current?.contains(t) && !trigger.current?.contains(t)) close(false)
    }
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !list.current?.contains(e.target as Node)) {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape)
    }
  }, [open, withSearch, close])

  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onListKey = (e: KeyboardEvent) => {
    const last = shown.length - 1
    if (e.key === 'ArrowDown') setActive((a) => Math.min(last, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'PageDown') setActive((a) => Math.min(last, a + 8))
    else if (e.key === 'PageUp') setActive((a) => Math.max(0, a - 8))
    else if (e.key === 'Enter' || (e.key === ' ' && !withSearch)) pick(shown[active])
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') close(false)
    else if (!withSearch && e.key.length === 1) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + fold(e.key), at: now }
      const i = shown.findIndex((o) => fold(o.label).startsWith(typed.current.text))
      if (i >= 0) setActive(i)
      return
    } else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`ui-select ${className ?? ''}`}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        style={triggerStyle ?? current?.style}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault()
            openList()
          }
        }}
      >
        {current?.preview && <span className="ui-select-preview">{current.preview}</span>}
        <span className="ui-select-value">{current?.label ?? ''}</span>
        <Icon name="caret-up-down" size={14} />
      </button>
      {open &&
        place &&
        createPortal(
          <div
            ref={list}
            className={`ui-select-pop${place.up ? ' is-up' : ''}`}
            style={{ left: place.left, top: place.top, width: place.width, maxHeight: place.maxHeight }}
            tabIndex={-1}
            onKeyDown={onListKey}
          >
            {withSearch && (
              <div className="ui-select-search">
                <Icon name="magnifying-glass" size={14} />
                <input
                  ref={search}
                  value={query}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder ?? label}
                  aria-controls={`${id}-list`}
                  aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                />
              </div>
            )}
            <div id={`${id}-list`} role="listbox" aria-label={label} className="ui-select-list" aria-activedescendant={!withSearch && shown[active] ? `${id}-${active}` : undefined}>
              {shown.map((o, i) => {
                const head = o.group && o.group !== shown[i - 1]?.group ? o.group : null
                return (
                  <div key={o.value} role="presentation">
                    {head && <div className="ui-select-group">{head}</div>}
                    <div
                      id={`${id}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={o.value === value}
                      className={`ui-select-opt${i === active ? ' is-active' : ''}`}
                      style={o.style}
                      onPointerMove={() => setActive(i)}
                      onClick={() => pick(o)}
                    >
                      {o.preview && <span className="ui-select-preview">{o.preview}</span>}
                      <span className="ui-select-label">{o.label}</span>
                      {o.hint && <span className="ui-select-hint">{o.hint}</span>}
                      {o.value === value && <Icon name="check" size={14} />}
                    </div>
                  </div>
                )
              })}
              {!shown.length && <div className="ui-select-empty">{emptyLabel ?? '∅'}</div>}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
