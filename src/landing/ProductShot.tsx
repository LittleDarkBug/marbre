import { useMemo } from 'react'
import { useT, type Key } from '../i18n'
import { sampleDoc } from '../templates/sample'
import { Icon } from '../ui/kit'
import { Wordmark } from '../ui/Wordmark'
import { FitPage } from './FitPage'

const OUTLINE: Key[] = ['block.identity', 'heading.profile', 'heading.experience', 'kind.project', 'heading.skills', 'kind.education', 'heading.languages']

export function ProductShot({ lang }: { lang: 'fr' | 'en' }) {
  const t = useT()
  const doc = useMemo(() => sampleDoc(lang), [lang])
  return (
    <div className="shot" aria-hidden="true">
      <div className="shot-bar">
        <span className="shot-dots"><i /><i /><i /></span>
        <Wordmark size={14} />
        <span className="shot-name">Camille Martin</span>
        <span className="shot-pill">{t('var.base')}</span>
        <span className="shot-spacer" />
        <span className="shot-btn"><Icon name="scan" size={14} />{t('ats.lens')}</span>
        <span className="shot-btn is-solid"><Icon name="printer" size={14} />{t('nav.print')}</span>
      </div>
      <div className="shot-body">
        <div className="shot-left">
          <p className="shot-label">{t('ol.structure')}</p>
          {OUTLINE.map((k, i) => (
            <p key={k} className={`shot-row${i === 2 ? ' is-on' : ''}`}><span>{String(i + 1).padStart(2, '0')}</span>{t(k)}</p>
          ))}
        </div>
        <div className="shot-canvas">
          <FitPage doc={doc} className="shot-page" />
        </div>
        <div className="shot-right">
          <p className="shot-label">{t('insp.type')}</p>
          <div className="shot-field"><span>{t('font.body')}</span><b>Source Sans 3</b></div>
          <div className="shot-field"><span>{t('size.body')}</span><b>13.0 px</b></div>
          <div className="shot-field"><span>{t('insp.leading')}</span><b>1.40</b></div>
          <p className="shot-label">{t('panel.ats')}</p>
          <p className="shot-ok">{t('ats.verdict.ok')}</p>
          <div className="shot-meter"><i style={{ width: '100%' }} /></div>
        </div>
      </div>
    </div>
  )
}
