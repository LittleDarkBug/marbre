import { useMemo } from 'react'
import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { FitPage } from '../landing/FitPage'
import { applyTemplate } from './apply'
import { TEMPLATES } from './index'
import './picker.css'

export function TemplatePicker({ content, value, onChange }: { content: Doc; value: string; onChange: (id: string) => void }) {
  const t = useT()
  const docs = useMemo(() => TEMPLATES.map((tpl) => applyTemplate(content, tpl.id)), [content])
  return (
    <div className="tpk" role="radiogroup" aria-label={t('tpk.label')}>
      {TEMPLATES.map((tpl, i) => (
        <button key={tpl.id} type="button" role="radio" aria-checked={value === tpl.id} className="tpk-card" onClick={() => onChange(tpl.id)}>
          <FitPage doc={docs[i]} className="tpk-page" />
          <span className="tpk-name">{t(tpl.name)}</span>
        </button>
      ))}
    </div>
  )
}
