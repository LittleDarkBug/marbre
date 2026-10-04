import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { autoFit } from '../render/autofit'
import { applyTemplate } from '../templates/apply'
import { TEMPLATES } from '../templates'
import { TemplatePicker } from '../templates/TemplatePicker'
import { useDoc } from '../store/doc'
import { Btn } from '../ui/kit'
import '../importer/import.css'

export function LayoutTools({ doc }: { doc: Doc }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [choice, setChoice] = useState(TEMPLATES[0].id)
  const dialog = useRef<HTMLDialogElement>(null)
  const base = useDoc((s) => s.base)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const fit = async () => {
    setBusy(true)
    setNote('')
    const r = await autoFit(doc)
    setBusy(false)
    if (!r.fitted) setNote(t('ed.fitFail'))
    else if (r.scale === 1 && r.pages === (doc.page.count ?? 1) && doc.page.fit === r.doc.page.fit) {
      setNote(t('ed.fitNone'))
      return
    } else setNote(t('ed.fitDone', { pct: Math.round(r.scale * 100), pages: r.pages }))
    useDoc.getState().edit((d) => {
      d.theme.size = r.doc.theme.size
      d.theme.spacing = r.doc.theme.spacing
      d.theme.leading = r.doc.theme.leading
      d.page = r.doc.page
    })
  }

  const apply = async () => {
    setOpen(false)
    const next = applyTemplate(base, choice)
    const r = await autoFit(next)
    useDoc.getState().edit((d) => {
      d.theme = r.doc.theme
      d.page = r.doc.page
      d.layout = r.doc.layout
      d.blocks = r.doc.blocks
    })
  }

  return (
    <div className="lt">
      <div className="lt-row">
        <Btn icon="arrows-in-simple" label={t('ed.fit')} showLabel disabled={busy || doc.layout.mode !== 'flow'} onClick={fit} />
        <Btn icon="layout" label={t('ed.template')} showLabel onClick={() => setOpen(true)} />
      </div>
      {note && <p className="lt-note" role="status">{note}</p>}
      <dialog ref={dialog} className="imp is-wide" aria-labelledby="lt-title" onClose={() => setOpen(false)} onCancel={() => setOpen(false)}>
        <header className="imp-head">
          <h2 id="lt-title">{t('ed.template')}</h2>
          <Btn icon="x" label={t('ed.close')} onClick={() => setOpen(false)} />
        </header>
        {open && (
          <div className="imp-report">
            <p className="imp-note">{t('ed.templateNote')}</p>
            <TemplatePicker content={base} value={choice} onChange={setChoice} />
            <div className="imp-actions">
              <Btn label={t('imp.back')} showLabel onClick={() => setOpen(false)} />
              <button type="button" className="lp-cta" onClick={apply}>{t('ed.apply')}</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
