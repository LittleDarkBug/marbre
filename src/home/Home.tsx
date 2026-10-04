import { useT } from '../i18n'
import { Wordmark } from '../ui/Wordmark'
import { Atelier } from './Atelier'
import './home.css'

export function Home() {
  const t = useT()
  return (
    <div className="home">
      <header className="home-bar">
        <Wordmark />
      </header>
      <main className="home-main">
        <p className="home-tagline">{t('app.tagline')}</p>
        <Atelier />
      </main>
    </div>
  )
}
