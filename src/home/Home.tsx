import { useMemo } from 'react'
import { useTheme } from '../app/theme'
import { useT, useUiLang } from '../i18n'
import { HeroCanvas } from '../landing/Hero'
import { LensDemo } from '../landing/LensDemo'
import { sampleDoc } from '../templates/sample'
import { Btn } from '../ui/kit'
import { Wordmark } from '../ui/Wordmark'
import { Atelier } from './Atelier'
import './home.css'

const REPO = 'https://github.com/LittleDarkBug/marbre'

export function Home() {
  const t = useT()
  const lang = useUiLang((s) => s.lang)
  const setLang = useUiLang((s) => s.setLang)
  const { theme, toggle } = useTheme()
  const demo = useMemo(() => sampleDoc(lang), [lang])
  const points = [
    { title: t('home.modes.title'), body: t('home.modes.body') },
    { title: t('home.variants.title'), body: t('home.variants.body') },
    { title: t('home.files.title'), body: t('home.files.body') },
  ]
  return (
    <div className="home">
      <header className="home-bar">
        <a href="#/" className="home-mark" aria-label={t('app.name')}>
          <Wordmark />
        </a>
        <nav className="home-nav" aria-label={t('home.nav')}>
          <a href="#atelier" onClick={(e) => { e.preventDefault(); document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' }) }}>{t('home.nav.atelier')}</a>
          <a href={REPO} rel="noreferrer" target="_blank">GitHub</a>
          <Btn icon={theme === 'dark' ? 'sun' : 'moon'} label={t(theme === 'dark' ? 'nav.theme.light' : 'nav.theme.dark')} onClick={toggle} />
          <Btn label={lang === 'fr' ? 'EN' : 'FR'} showLabel aria-label={t('nav.lang')} onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} />
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="hero-kicker">{t('home.kicker')}</p>
          <HeroCanvas word="MARBRE" />
          <div className="hero-copy">
            <h1 id="hero-title" className="hero-title">{t('home.title')}</h1>
            <p className="hero-lead">{t('home.lead')}</p>
            <div className="hero-cta">
              <Btn tone="solid" showLabel label={t('home.cta.open')} onClick={() => document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' })} />
              <Btn showLabel label={t('home.cta.read')} onClick={() => document.getElementById('lecture')?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
          </div>
        </section>

        <section className="band lecture" id="lecture" aria-labelledby="lecture-title">
          <div className="band-text">
            <p className="band-label">{t('home.reading.label')}</p>
            <h2 id="lecture-title" className="band-title">{t('home.reading.title')}</h2>
            <p className="band-body">{t('home.reading.body')}</p>
            <p className="band-body">{t('home.reading.body2')}</p>
          </div>
          <LensDemo doc={demo} caption={t('home.reading.caption')} />
        </section>

        <section className="band points" aria-label={t('home.points')}>
          {points.map((p) => (
            <article key={p.title} className="point">
              <h2 className="point-title">{p.title}</h2>
              <p className="point-body">{p.body}</p>
            </article>
          ))}
        </section>

        <Atelier />
      </main>

      <footer className="home-foot">
        <Wordmark size={16} />
        <p>{t('home.foot')}</p>
        <a href={REPO} rel="noreferrer" target="_blank">{t('home.source')}</a>
      </footer>
    </div>
  )
}
