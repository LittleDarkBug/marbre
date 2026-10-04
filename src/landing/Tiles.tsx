import { useT } from '../i18n'
import { useReveal } from './useScroll'

function FreeVisual() {
  return (
    <div className="tv tv-free" aria-hidden="true">
      <div className="tv-sheet">
        <i className="tv-line w60" /><i className="tv-line w40" /><i className="tv-line w80" /><i className="tv-line w70" />
        <div className="tv-block">
          <i className="tv-line w90" /><i className="tv-line w70" />
          <b className="h tl" /><b className="h tr" /><b className="h bl" /><b className="h br" />
        </div>
      </div>
    </div>
  )
}

function ReadVisual() {
  return (
    <div className="tv tv-read" aria-hidden="true">
      <div className="tv-sheet tv-two">
        <div><i className="tv-line w80" /><i className="tv-line w60" /><i className="tv-line w90" /><i className="tv-line w70" /></div>
        <div><i className="tv-line w70" /><i className="tv-line w90" /><i className="tv-line w50" /></div>
        {[1, 2, 3, 4].map((n) => <span key={n} className={`tv-pin p${n}`}>{n}</span>)}
      </div>
    </div>
  )
}

function VariantVisual({ labels }: { labels: string[] }) {
  return (
    <div className="tv tv-var" aria-hidden="true">
      {labels.map((l, i) => (
        <div key={l} className={`tv-card c${i}`}>
          <i className="tv-line w60" /><i className="tv-line w80" /><i className="tv-line w40" />
          <span>{l}</span>
        </div>
      ))}
    </div>
  )
}

function ProofVisual({ found, missing }: { found: string[]; missing: string[] }) {
  return (
    <div className="tv tv-proof" aria-hidden="true">
      {found.map((k) => <span key={k} className="chip ok">{k}</span>)}
      {missing.map((k) => <span key={k} className="chip miss">{k}</span>)}
    </div>
  )
}

function FilesVisual() {
  return (
    <div className="tv tv-files" aria-hidden="true">
      {['camille.marbre.json', 'camille-en.resume.json', 'offres/'].map((f) => (
        <p key={f}><b className={f.endsWith('/') ? 'dir' : 'file'} />{f}</p>
      ))}
    </div>
  )
}

function CliVisual() {
  return (
    <pre className="tv tv-cli" aria-hidden="true">
      <span className="dim">$ </span>marbre export cv.marbre.json --all{'\n'}
      <span className="ok">OK</span>  cv.pdf            pages=1{'\n'}
      <span className="ok">OK</span>  cv_Energie.pdf    pages=1{'\n'}
      <span className="ok">OK</span>  cv_English.pdf    pages=1
    </pre>
  )
}

export function Tiles() {
  const t = useT()
  const [ref, seen] = useReveal<HTMLDivElement>()
  const tiles = [
    { key: 'free', wide: true, visual: <FreeVisual /> },
    { key: 'read', wide: false, visual: <ReadVisual /> },
    { key: 'variants', wide: false, visual: <VariantVisual labels={[t('var.base'), t('lp.tile.variants.offer'), 'English']} /> },
    { key: 'proof', wide: true, visual: <ProofVisual found={['Python', 'MLflow', 'Airflow', 'SQL']} missing={['Kubernetes']} /> },
    { key: 'files', wide: false, visual: <FilesVisual /> },
    { key: 'cli', wide: true, visual: <CliVisual /> },
  ] as const
  return (
    <section className="lp-section tiles-section" aria-labelledby="tiles-title">
      <div className="lp-head">
        <h2 id="tiles-title" className="lp-h2">{t('lp.tiles.title')}</h2>
        <p className="lp-sub">{t('lp.tiles.sub')}</p>
      </div>
      <div ref={ref} className={`tiles${seen ? ' is-seen' : ''}`}>
        {tiles.map((tile, i) => (
          <article key={tile.key} className={`tile${tile.wide ? ' is-wide' : ''}`} style={{ transitionDelay: `${i * 70}ms` }}>
            <div className="tile-copy">
              <h3>{t(`lp.tile.${tile.key}.title`)}</h3>
              <p>{t(`lp.tile.${tile.key}.body`)}</p>
            </div>
            {tile.visual}
          </article>
        ))}
      </div>
    </section>
  )
}
