import { useState } from 'react'
import { useT } from '../i18n'
import { step } from '../model/paths'
import { plain } from '../model/rich'
import type { Doc, Override } from '../model/schema'
import { useDoc } from '../store/doc'
import { Btn, Section } from '../ui/kit'
import { Select } from '../ui/Select'
import { toast } from '../ui/toast'

function describe(doc: Doc, o: Override) {
  const names: string[] = []
  let node: unknown = doc
  o.path.forEach((seg, i) => {
    node = step(node, seg)
    const obj = node && typeof node === 'object' && !Array.isArray(node) ? (node as Record<string, unknown>) : null
    if (obj && 'id' in obj) {
      const name = obj.heading || obj.name || obj.title || obj.label || obj.key || obj.text
      names.push(plain(String(name || seg)).slice(0, 36))
    } else if (i === o.path.length - 1 || i === 0) names.push(seg)
  })
  return names.join(' / ')
}

export function Variants({ doc }: { doc: Doc }) {
  const t = useT()
  const variantId = useDoc((s) => s.variantId)
  const setVariant = useDoc((s) => s.setVariant)
  const addVariant = useDoc((s) => s.addVariant)
  const editBase = useDoc((s) => s.editBase)
  const [name, setName] = useState('')
  const [lang, setLang] = useState<'' | 'fr' | 'en'>('')
  const current = doc.variants.find((v) => v.id === variantId)

  return (
    <div className="var">
      <Section title={t('var.title')}>
        <p className="insp-note">{t('var.help')}</p>
        <ul className="var-list">
          <li>
            <button type="button" className={`var-item${variantId === null ? ' is-active' : ''}`} onClick={() => setVariant(null)}>
              <span>{t('var.base')}</span>
              <span className="var-count">{doc.lang.toUpperCase()}</span>
            </button>
          </li>
          {doc.variants.map((v) => (
            <li key={v.id}>
              <button type="button" className={`var-item${variantId === v.id ? ' is-active' : ''}`} onClick={() => setVariant(v.id)}>
                <span>{v.name}</span>
                <span className="var-count">{(v.lang ?? doc.lang).toUpperCase()} {t('var.changes', { n: v.overrides.length })}</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="var-new"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            addVariant(name.trim(), lang || undefined)
            setName('')
          }}
        >
          <input className="ui-input" placeholder={t('var.namePlaceholder')} aria-label={t('var.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Select<'' | 'fr' | 'en'>
            className="var-lang"
            label={t('var.lang')}
            value={lang}
            options={[{ value: '', label: t('var.sameLang') }, { value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]}
            onChange={setLang}
          />
          <Btn type="submit" icon="plus" label={t('var.add')} showLabel tone="solid" />
        </form>
      </Section>
      {current && (
        <Section
          title={t('var.diff', { name: current.name })}
          aside={
            <Btn
              icon="trash"
              tone="proof"
              label={t('var.delete')}
              onClick={() => {
                const removed = current
                const index = useDoc.getState().base.variants.findIndex((v) => v.id === removed.id)
                setVariant(null)
                editBase((d) => { d.variants = d.variants.filter((v) => v.id !== removed.id) })
                toast(t('var.deleted', { name: removed.name }), {
                  action: {
                    label: t('ui.undo'),
                    run: () => {
                      editBase((d) => { if (!d.variants.some((v) => v.id === removed.id)) d.variants.splice(index, 0, removed) })
                      setVariant(removed.id)
                    },
                  },
                })
              }}
            />
          }
        >
          {current.overrides.length === 0 ? (
            <p className="insp-note">{t('var.empty')}</p>
          ) : (
            <ol className="var-diff">
              {current.overrides.map((o, i) => (
                <li key={i}>
                  <span className="var-op">{t(`var.op.${o.op}`)}</span>
                  <span>{describe(doc, o)}</span>
                  <Btn icon="x" label={t('var.revert')} onClick={() => editBase((d) => { const v = d.variants.find((x) => x.id === current.id); if (v) v.overrides.splice(i, 1) })} />
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}
    </div>
  )
}
