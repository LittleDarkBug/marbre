import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../app/theme'
import { useT, useUiLang } from '../i18n'
import { MorphScene } from '../landing/MorphScene'
import { ProductShot } from '../landing/ProductShot'
import { ReadCompare } from '../landing/ReadCompare'
import { TemplatesRail } from '../landing/TemplatesRail'
import { Tiles } from '../landing/Tiles'
import { useEntry } from '../landing/useScroll'
import { blankDoc } from '../model/factories'
import { sampleDoc } from '../templates/sample'
import { Btn } from '../ui/kit'
import { Wordmark } from '../ui/Wordmark'
import { Atelier, openNew } from './Atelier'
import './home.css'

const REPO = 'https://github.com/LittleDarkBug/marbre'

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function Home() {
  const t = useT()
  const lang = useUiLang((s) => s.lang)
  const setLang = useUiLang((s) => s.setLang)
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [shotRef, shotIn] = useEntry<HTMLDivElement>()
  const demo = useMemo(() => sampleDoc(lang), [lang])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const start = () => openNew(sampleDoc(lang))
  const k = Math.min(1, shotIn * 1.15)

  return (
    <div className="lp">
      <header className={`lp-nav${scrolled ? ' is-scrolled' : ''}`}>
        <a href="#/" className="lp-logo" aria-label={t('app.name')}>
          <Wordmark size={18} />
        </a>
        <nav className="lp-links" aria-label={t('home.nav')}>
          <button type="button" onClick={() => scrollTo('fonctionnalites')}>{t('lp.nav.features')}</button>
          <button type="button" onClick={() => scrollTo('lecture')}>{t('lp.nav.reading')}</button>
          <button type="button" onClick={() => scrollTo('gabarits')}>{t('lp.nav.templates')}</button>
          <a href={REPO} rel="noreferrer" target="_blank">GitHub</a>
        </nav>
        <div className="lp-nav-end">
          <Btn icon={theme === 'dark' ? 'sun' : 'moon'} label={t(theme === 'dark' ? 'nav.theme.light' : 'nav.theme.dark')} onClick={toggle} />
          <Btn label={lang === 'fr' ? 'EN' : 'FR'} showLabel aria-label={t('nav.lang')} onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} />
          <Btn tone="solid" showLabel label={t('lp.cta.open')} className="lp-nav-cta" onClick={() => scrollTo('atelier')} />
        </div>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="lp-title">
          <p className="lp-eyebrow lp-in">{t('lp.hero.eyebrow')}</p>
          <h1 id="lp-title" className="lp-h1 lp-in">{t('lp.hero.title')}</h1>
          <p className="lp-lead lp-in">{t('lp.hero.lead')}</p>
          <div className="lp-ctas lp-in">
            <button type="button" className="lp-cta" onClick={start}>{t('lp.cta.start')}</button>
            <button type="button" className="lp-cta lp-cta-ghost" onClick={() => scrollTo('fonctionnalites')}>{t('lp.cta.more')}</button>
          </div>
          <p className="lp-fine lp-in">{t('lp.hero.fine')}</p>
          <div ref={shotRef} className="lp-shot" style={{ transform: `perspective(1600px) rotateX(${(1 - k) * 14}deg) scale(${0.9 + k * 0.1})`, opacity: 0.4 + k * 0.6 }}>
            <ProductShot lang={lang} />
          </div>
        </section>

        <div id="fonctionnalites" />
        <MorphScene lang={lang} />

        <section className="lp-section read-section" id="lecture" aria-labelledby="read-title">
          <div className="lp-head">
            <p className="lp-eyebrow">{t('lp.read.eyebrow')}</p>
            <h2 id="read-title" className="lp-h2">{t('lp.read.title')}</h2>
            <p className="lp-sub">{t('lp.read.sub')}</p>
          </div>
          <ReadCompare doc={demo} />
        </section>

        <Tiles />
        <TemplatesRail lang={lang} />
        <Atelier />

        <section className="lp-final" aria-labelledby="final-title">
          <h2 id="final-title" className="lp-h2">{t('lp.final.title')}</h2>
          <p className="lp-sub">{t('lp.final.sub')}</p>
          <div className="lp-ctas">
            <button type="button" className="lp-cta" onClick={start}>{t('lp.cta.start')}</button>
            <button type="button" className="lp-cta lp-cta-ghost" onClick={() => openNew(blankDoc(t('docs.untitled'), lang))}>{t('docs.blank')}</button>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <Wordmark size={15} />
        <p>{t('home.foot')}</p>
        <a href={REPO} rel="noreferrer" target="_blank">{t('home.source')}</a>
      </footer>
    </div>
  )
}
