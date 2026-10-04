import { useEffect, useMemo, useRef, useState } from 'react'
import { analyze, type Reading } from '../ats/analyze'
import { samplePage } from '../ats/measure'
import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { FitPage } from './FitPage'

export function ReadCompare({ doc }: { doc: Doc }) {
  const t = useT()
  const page = useRef<HTMLDivElement | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const run = () => {
      const root = page.current?.querySelector<HTMLElement>('.mb-page')
      if (root && alive) setReading(analyze(doc, samplePage(root), null))
    }
    const timer = setTimeout(() => document.fonts.ready.then(run), 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [doc])

  useEffect(() => {
    const root = page.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => el.classList.toggle('is-lit', el.dataset.block === hover))
  }, [hover])

  const boxes = useMemo(() => reading?.miner ?? [], [reading])

  return (
    <div className="compare">
      <div className="compare-pane" onPointerOver={(e) => setHover((e.target as HTMLElement).closest<HTMLElement>('[data-block]')?.dataset.block ?? null)} onPointerLeave={() => setHover(null)}>
        <p className="compare-label">{t('lp.read.you')}</p>
        <FitPage doc={doc} className="compare-page" pageRef={(el) => { page.current = el }} />
      </div>
      <div className="compare-pane">
        <p className="compare-label">{t('lp.read.they')}</p>
        <ol className="compare-text">
          {boxes.map((b, i) => (
            <li
              key={i}
              className={b.blocks.includes(hover ?? '') ? 'is-lit' : ''}
              onPointerEnter={() => setHover(b.blocks[0] ?? null)}
              onPointerLeave={() => setHover(null)}
            >
              {b.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
