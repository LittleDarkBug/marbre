import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { Btn } from '../ui/kit'

type Spot = { x: number; y: number; field: HTMLElement } | null

const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value)

export function TextToolbar({ host, palette }: { host: HTMLElement | null; palette: string[] }) {
  const t = useT()
  const [spot, setSpot] = useState<Spot>(null)

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount || !host) return setSpot(null)
      const node = sel.anchorNode
      const field = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLElement>('.mb-editable')
      if (!field || field.getAttribute('contenteditable') !== 'true') return setSpot(null)
      const r = sel.getRangeAt(0).getBoundingClientRect()
      const h = host.getBoundingClientRect()
      setSpot({ x: r.left + r.width / 2 - h.left + host.scrollLeft, y: r.top - h.top + host.scrollTop, field })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [host])

  if (!spot) return null
  const run = (cmd: string, value?: string) => {
    exec(cmd, value)
    spot.field.dispatchEvent(new Event('input', { bubbles: true }))
  }
  return (
    <div className="fmtbar" role="toolbar" aria-label={t('fmt.color')} style={{ left: spot.x, top: Math.max(4, spot.y - 46) }} onPointerDown={(e) => e.preventDefault()}>
      <Btn icon="text-b" label={t('fmt.bold')} onClick={() => run('bold')} />
      <Btn icon="text-italic" label={t('fmt.italic')} onClick={() => run('italic')} />
      <Btn label="U" showLabel aria-label={t('fmt.underline')} className="fmt-u" onClick={() => run('underline')} />
      <Btn
        icon="link"
        label={t('fmt.link')}
        onClick={() => {
          const url = window.prompt(t('edit.link'))
          if (url && /^(https?:|mailto:|tel:)/i.test(url)) run('createLink', url)
        }}
      />
      <span className="fmt-sep" aria-hidden="true" />
      {palette.map((c) => (
        <button key={c} type="button" className="fmt-swatch" style={{ background: c }} aria-label={`${t('fmt.color')} ${c}`} onClick={() => run('foreColor', c)} />
      ))}
      <label className="fmt-swatch fmt-custom" aria-label={t('fmt.color')}>
        <input type="color" onChange={(e) => run('foreColor', e.target.value)} />
      </label>
    </div>
  )
}
