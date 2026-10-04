import { useEffect, useRef, useState } from 'react'
import { go } from '../app/router'
import { useT, useUiLang } from '../i18n'
import { blankDoc } from '../model/factories'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { canOpenFolder, listDocs, openFolder, parseFile, removeDoc, saveDoc, type DocMeta } from '../store/persist'
import { Btn } from '../ui/kit'
import { ImportDialog } from '../importer/ImportDialog'

export async function openNew(doc: Doc) {
  await saveDoc(doc)
  useDoc.getState().open(doc)
  go(`#/edit/${doc.id}`)
}

export function Atelier() {
  const t = useT()
  const lang = useUiLang((s) => s.lang)
  const [docs, setDocs] = useState<DocMeta[] | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    listDocs().then(setDocs)
  }, [])

  const importFile = async (file: File) => {
    try {
      await openNew(parseFile(await file.text(), lang))
    } catch (e) {
      setError(t('error.file', { reason: (e as Error).message }))
    }
  }

  return (
    <section className="atelier" id="atelier" aria-labelledby="atelier-title">
      <header className="atelier-head">
        <h2 id="atelier-title">{t('docs.title')}</h2>
        <div className="atelier-actions">
          <Btn icon="file-plus" showLabel tone="solid" label={t('docs.blank')} onClick={() => openNew(blankDoc(t('docs.untitled'), lang))} />
          <Btn icon="upload-simple" showLabel tone="solid" label={t('imp.open')} onClick={() => setImporting(true)} />
          <Btn icon="file-plus" showLabel label={t('nav.import')} onClick={() => input.current?.click()} />
          {canOpenFolder() && (
            <Btn
              icon="folder-open"
              showLabel
              label={t('docs.folder')}
              onClick={async () => {
                const found = await openFolder().catch(() => [])
                await Promise.all(found.map(saveDoc))
                setDocs(await listDocs())
              }}
            />
          )}
          <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </div>
      </header>
      {error && <p className="atelier-error" role="alert">{error}</p>}
      <ImportDialog open={importing} onClose={() => setImporting(false)} onDone={(r) => { setImporting(false); openNew(r.doc) }} />
      {docs && docs.length > 0 ? (
        <ol className="atelier-list">
          {docs.map((d) => (
            <li key={d.id} className="atelier-item">
              <a href={`#/edit/${d.id}`} className="atelier-link">
                <span className="atelier-name">{d.name}</span>
                <span className="atelier-date">{t('docs.updated', { date: new Date(d.updatedAt).toLocaleDateString(lang) })}</span>
              </a>
              <Btn
                icon="trash"
                tone="proof"
                label={t('docs.delete')}
                onClick={async () => {
                  if (!window.confirm(t('docs.confirmDelete', { name: d.name }))) return
                  await removeDoc(d.id)
                  setDocs(await listDocs())
                }}
              />
            </li>
          ))}
        </ol>
      ) : (
        docs && <p className="atelier-empty">{t('docs.empty')}</p>
      )}
    </section>
  )
}
