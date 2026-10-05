import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useT } from '../i18n'
import { Btn } from '../ui/kit'

type Target = { id: number; field: HTMLElement; range: Range; href: string }

let opened = 0

const useLink = create<{ target: Target | null; set: (t: Target | null) => void }>((set) => ({ target: null, set: (target) => set({ target }) }))

export function openLinkEditor(field: HTMLElement) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0).cloneRange()
  const node = range.commonAncestorContainer
  const anchor = (node instanceof HTMLElement ? node : node.parentElement)?.closest('a')
  if (anchor && field.contains(anchor) && range.collapsed) range.selectNodeContents(anchor)
  if (range.collapsed) return
  useLink.getState().set({ id: ++opened, field, range, href: anchor?.getAttribute('href') ?? '' })
}

export function normalizeLink(input: string): string | null {
  const v = input.trim()
  if (!v) return null
  if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(v)) return v
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return `mailto:${v}`
  if (/^\+?[\d\s().-]{8,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, '')}`
  if (/^(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[/?#]\S*)?$/i.test(v)) return `https://${v}`
  return null
}

export function LinkEditor({ host }: { host: HTMLElement | null }) {
  const target = useLink((s) => s.target)
  if (!target || !host) return null
  return <LinkForm key={target.id} target={target} host={host} />
}

function LinkForm({ target, host }: { target: Target; host: HTMLElement }) {
  const t = useT()
  const close = useLink((s) => s.set)
  const [value, setValue] = useState(target.href)
  const [invalid, setInvalid] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => input.current?.select())
  }, [])

  const r = target.range.getBoundingClientRect()
  const h = host.getBoundingClientRect()
  const left = Math.min(Math.max(8, r.left + r.width / 2 - h.left + host.scrollLeft - 170), host.scrollWidth - 348)
  const top = r.bottom - h.top + host.scrollTop + 8

  const restore = () => {
    target.field.focus()
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(target.range)
  }
  const finish = (cmd?: 'createLink' | 'unlink', url?: string) => {
    restore()
    if (cmd) {
      document.execCommand(cmd, false, url)
      target.field.dispatchEvent(new Event('input', { bubbles: true }))
    }
    close(null)
  }

  return (
    <form
      className="linkpop"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault()
        const url = normalizeLink(value)
        if (!url) return setInvalid(true)
        finish('createLink', url)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish()
        }
      }}
    >
      <label className="linkpop-field">
        <span className="sr-only">{t('link.label')}</span>
        <input
          ref={input}
          className="ui-input"
          value={value}
          placeholder={t('link.placeholder')}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'linkpop-err' : undefined}
          onChange={(e) => {
            setValue(e.target.value)
            setInvalid(false)
          }}
          onBlur={(e) => {
            if (!e.currentTarget.form?.contains(e.relatedTarget as Node)) close(null)
          }}
        />
      </label>
      <Btn type="submit" label={t('link.apply')} showLabel tone="solid" />
      {target.href && <Btn icon="trash" tone="proof" label={t('link.remove')} onClick={() => finish('unlink')} />}
      {invalid && <p id="linkpop-err" className="linkpop-err" role="alert">{t('link.invalid')}</p>}
    </form>
  )
}
