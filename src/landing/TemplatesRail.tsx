import { useMemo } from 'react'
import { openNew } from '../home/Atelier'
import { useT } from '../i18n'
import { TEMPLATES } from '../templates'
import { FitPage } from './FitPage'

export function TemplatesRail({ lang }: { lang: 'fr' | 'en' }) {
  const t = useT()
  const docs = useMemo(() => TEMPLATES.map((tpl) => tpl.make(lang)), [lang])
  return (
    <section className="lp-section rail-section" id="gabarits" aria-labelledby="rail-title">
      <div className="lp-head">
        <h2 id="rail-title" className="lp-h2">{t('lp.rail.title')}</h2>
        <p className="lp-sub">{t('lp.rail.sub')}</p>
      </div>
      <ul className="rail">
        {TEMPLATES.map((tpl, i) => (
          <li key={tpl.id}>
            <button type="button" className="rail-card" onClick={() => openNew(docs[i])}>
              <FitPage doc={docs[i]} className="rail-page" />
              <span className="rail-name">{t(tpl.name)}</span>
              <span className="rail-desc">{t(tpl.desc)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
