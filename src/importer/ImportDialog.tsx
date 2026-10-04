import { useEffect, useRef, useState } from 'react'
import { useT, useUiLang, type Key } from '../i18n'
import { Btn } from '../ui/kit'
import { importFile, type ImportResult } from './index'
import { ImportError } from './types'
import './import.css'

type Phase = { name: 'pick' } | { name: 'busy'; step: string; ratio?: number } | { name: 'password'; file: File; wrong: boolean } | { name: 'done'; result: ImportResult } | { name: 'error'; code: string }

const ACCEPT = '.pdf,.docx,.odt,.html,.htm,.txt,.md,.rtf,.json,image/*,application/pdf'

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: ImportResult) => void }) {
  const t = useT()
  const lang = useUiLang((s) => s.lang)
  const [phase, setPhase] = useState<Phase>({ name: 'pick' })
  const [over, setOver] = useState(false)
  const [password, setPassword] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const run = async (file: File, pass?: string) => {
    setPhase({ name: 'busy', step: 'read' })
    try {
      const result = await importFile(file, { lang, password: pass, onProgress: (step, ratio) => setPhase({ name: 'busy', step, ratio }) })
      setPhase({ name: 'done', result })
    } catch (e) {
      if (e instanceof ImportError && e.code === 'password') setPhase({ name: 'password', file, wrong: Boolean(pass) })
      else setPhase({ name: 'error', code: e instanceof ImportError ? e.code : 'unreadable' })
    }
  }

  const close = () => {
    setPhase({ name: 'pick' })
    onClose()
  }

  const count = (n: number, one: Key, many: Key) => (n === 0 ? '' : n === 1 ? t(one) : t(many, { n }))
  const result = phase.name === 'done' ? phase.result : null
  const pct = result?.coverage ? Math.round(result.coverage.ratio * 1000) / 10 : 100
  const sections = result?.cv?.sections ?? []

  return (
    <dialog ref={dialog} className="imp" aria-labelledby="imp-title" onClose={close} onCancel={close}>
      <header className="imp-head">
        <h2 id="imp-title">{t('imp.title')}</h2>
        <Btn icon="x" label={t('ed.close')} onClick={close} />
      </header>

      {phase.name === 'pick' && (
        <div
          className={`imp-drop${over ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) run(f)
          }}
        >
          <p className="imp-big">{t('imp.drop')}</p>
          <p className="imp-note">{t('imp.formats')}</p>
          <button type="button" className="lp-cta" onClick={() => input.current?.click()}>{t('imp.choose')}</button>
          <p className="imp-note">{t('imp.private')}</p>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
        </div>
      )}

      {phase.name === 'busy' && (
        <div className="imp-busy" role="status" aria-live="polite">
          <p className="imp-big">{t(`imp.step.${phase.step}` as Key)}</p>
          <div className="imp-bar"><i style={{ width: `${Math.round((phase.ratio ?? (phase.step === 'parse' ? 0.7 : phase.step === 'build' ? 0.9 : 0.3)) * 100)}%` }} /></div>
          {phase.step === 'ocr' && <p className="imp-note">{t('imp.ocrNote')}</p>}
        </div>
      )}

      {phase.name === 'password' && (
        <form
          className="imp-busy"
          onSubmit={(e) => {
            e.preventDefault()
            run(phase.file, password)
          }}
        >
          <p className="imp-big">{t(phase.wrong ? 'imp.passwordWrong' : 'imp.password')}</p>
          <input className="ui-input" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} aria-label={t('imp.password')} />
          <button type="submit" className="lp-cta">{t('imp.unlock')}</button>
        </form>
      )}

      {phase.name === 'error' && (
        <div className="imp-busy" role="alert">
          <p className="imp-big">{t(`imp.error.${phase.code}` as Key)}</p>
          <Btn label={t('imp.retry')} showLabel tone="solid" onClick={() => setPhase({ name: 'pick' })} />
        </div>
      )}

      {result && (
        <div className="imp-report">
          <div className={`imp-score${pct >= 97 ? ' is-good' : pct >= 85 ? '' : ' is-low'}`}>
            <b>{pct}&#8239;%</b>
            <span>{t('imp.coverage', { n: result.coverage?.total ?? 0 })}</span>
          </div>
          {result.cv && (
            <dl className="imp-facts">
              <div><dt>{t('hint.name')}</dt><dd>{result.cv.name || t('imp.notFound')}</dd></div>
              <div><dt>{t('hint.title')}</dt><dd>{result.cv.title || t('imp.notFound')}</dd></div>
              <div><dt>{t('insp.contacts')}</dt><dd>{result.cv.contacts.map((c) => c.text).join(' · ') || t('imp.notFound')}</dd></div>
              {result.cv.photo && <div><dt>{t('block.photo')}</dt><dd><img className="imp-photo" src={result.cv.photo.src} alt="" /></dd></div>}
            </dl>
          )}
          {sections.length > 0 && (
            <ol className="imp-sections">
              {sections.map((s, i) => (
                <li key={i}>
                  <span className="imp-kind">{t(`imp.kind.${s.kind}` as Key)}</span>
                  <span className="imp-heading">{s.heading}</span>
                  <span className="imp-count">{count(s.entries.length, 'imp.entry', 'imp.entries') || count(s.groups.length, 'imp.group', 'imp.groups') || count(s.pairs.length, 'imp.line', 'imp.lines')}</span>
                </li>
              ))}
            </ol>
          )}
          {result.cv && result.cv.leftovers.length > 0 && <p className="imp-note imp-warn">{count(result.cv.leftovers.length, 'imp.leftover', 'imp.leftovers')}</p>}
          {result.kind === 'ocr' && <p className="imp-note imp-warn">{t('imp.ocrDone')}</p>}
          <div className="imp-actions">
            <Btn label={t('imp.other')} showLabel onClick={() => setPhase({ name: 'pick' })} />
            <button type="button" className="lp-cta" onClick={() => { onDone(result); setPhase({ name: 'pick' }) }}>{t('imp.create')}</button>
          </div>
        </div>
      )}
    </dialog>
  )
}
