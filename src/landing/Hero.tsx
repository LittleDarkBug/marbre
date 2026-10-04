import { useEffect, useRef, useState } from 'react'

export function HeroCanvas({ word }: { word: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let hero: { destroy: () => void } | null = null
    let cancelled = false
    Promise.all([import('./heroScene'), document.fonts.load("900 120px 'Schibsted Grotesk'")]).then(([m]) => {
      if (cancelled) return
      hero = m.mountHero(canvas, word, reduced)
      if (!hero) setFailed(true)
    })
    return () => {
      cancelled = true
      hero?.destroy()
    }
  }, [word])
  return (
    <div className="hero-stage" aria-hidden="true">
      {failed ? (
        <div className="hero-fallback">
          {word.split('').map((c, i) => (
            <span key={i} className="hero-sort">{c}</span>
          ))}
        </div>
      ) : (
        <canvas ref={ref} className="hero-canvas" />
      )}
    </div>
  )
}
