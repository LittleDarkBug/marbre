import { useLayoutEffect, useMemo, useRef } from 'react'
import { useT, type Key } from '../i18n'
import type { Doc, IdentityBlock, TextBlock } from '../model/schema'
import { TEMPLATES } from '../templates'
import { FitPage } from './FitPage'
import { reduced, useProgress } from './useScroll'

type Step = { title: Key; body: Key; tag: Key; doc: Doc }

function variantOf(doc: Doc, lang: 'fr' | 'en'): Doc {
  const d = structuredClone(doc)
  const id = d.blocks.find((b) => b.id === 'id') as IdentityBlock
  id.title = lang === 'fr' ? 'Data Scientist, prévision énergétique' : 'Data Scientist, energy forecasting'
  const p = d.blocks.find((b) => b.id === 'profile') as TextBlock
  p.body = lang === 'fr'
    ? "Je prévois la consommation d'énergie à partir de séries temporelles, jusqu'à la mise en production. <strong>Recherche un CDI de Data Scientist dans l'énergie.</strong>"
    : 'I forecast energy consumption from time series, all the way to production. <strong>Seeking a permanent Data Scientist role in energy.</strong>'
  return d
}

export function MorphScene({ lang }: { lang: 'fr' | 'en' }) {
  const t = useT()
  const [ref, progress] = useProgress<HTMLElement>()
  const steps: Step[] = useMemo(() => {
    const make = (id: string, l: 'fr' | 'en' = lang) => TEMPLATES.find((x) => x.id === id)!.make(l)
    const signal = make('signal')
    return [
      { title: 'lp.morph.1.title', body: 'lp.morph.1.body', tag: 'tpl.signal', doc: signal },
      { title: 'lp.morph.2.title', body: 'lp.morph.2.body', tag: 'tpl.colonne', doc: make('colonne') },
      { title: 'lp.morph.3.title', body: 'lp.morph.3.body', tag: 'tpl.editorial', doc: make('editorial') },
      { title: 'lp.morph.4.title', body: 'lp.morph.4.body', tag: 'lp.morph.4.tag', doc: variantOf(signal, lang) },
      { title: 'lp.morph.5.title', body: 'lp.morph.5.body', tag: 'lp.morph.5.tag', doc: make('signal', lang === 'fr' ? 'en' : 'fr') },
    ]
  }, [lang])
  const index = Math.min(steps.length - 1, Math.floor(progress * steps.length * 0.999))
  const step = steps[index]
  const page = useRef<HTMLDivElement | null>(null)
  const last = useRef<Map<string, DOMRect>>(new Map())

  useLayoutEffect(() => {
    const root = page.current
    if (!root) return
    const scale = root.getBoundingClientRect().width / root.offsetWidth || 1
    const now = new Map<string, DOMRect>()
    root.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => now.set(el.dataset.block!, el.getBoundingClientRect()))
    if (!reduced()) {
      root.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => {
        const before = last.current.get(el.dataset.block!)
        const after = now.get(el.dataset.block!)
        if (!before || !after) return
        const dx = (before.left - after.left) / scale
        const dy = (before.top - after.top) / scale
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
        el.animate([{ transform: `translate(${dx}px, ${dy}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 760, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      })
    }
    last.current = now
  }, [index])

  return (
    <section ref={ref} className="morph" style={{ height: `${steps.length * 90 + 60}vh` }} aria-labelledby="morph-title">
      <div className="morph-sticky">
        <div className="morph-text">
          <p className="lp-eyebrow">{t('lp.morph.eyebrow')}</p>
          <h2 id="morph-title" className="lp-h2">{t('lp.morph.title')}</h2>
          <ol className="morph-steps">
            {steps.map((s, i) => (
              <li key={s.title} className={i === index ? 'is-on' : ''} aria-current={i === index ? 'step' : undefined}>
                <h3>{t(s.title)}</h3>
                <p>{t(s.body)}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="morph-stage">
          <span className="morph-tag" key={step.tag}>{t(step.tag)}</span>
          <FitPage doc={step.doc} className="morph-page" pageRef={(el) => { page.current = el }} />
          <div className="morph-progress" aria-hidden="true">
            {steps.map((s, i) => <i key={s.title} className={i <= index ? 'is-on' : ''} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
