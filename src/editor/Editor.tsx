import { useCallback, useEffect, useState } from 'react'
import { go } from '../app/router'
import { useT, useUiLang, type Key } from '../i18n'
import type { Fit } from '../render/Page'
import { loadThemeFonts } from '../render/fonts'
import { useDoc, useResolved } from '../store/doc'
import { readDoc, saveDoc, writeToFolder } from '../store/persist'
import { useTheme } from '../app/theme'
import { Btn, Drawer, useMedia } from '../ui/kit'
import { Wordmark } from '../ui/Wordmark'
import { ExportPanel, printDoc } from './ExportPanel'
import { Inspector } from './Inspector'
import { Outline } from './Outline'
import { useEditorUi, type Panel } from './uiState'
import { Variants } from './Variants'
import { Workspace } from './Workspace'
import { AtsPanel } from '../ats/AtsPanel'
import './editor.css'

function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = useDoc.subscribe((s, prev) => {
      if (s.base === prev.base) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        saveDoc(s.base)
        writeToFolder(s.base)
      }, 400)
    })
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [])
}

function useShortcuts() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const editing = (e.target as HTMLElement)?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      if (mod && e.key.toLowerCase() === 'z' && !editing) {
        e.preventDefault()
        if (e.shiftKey) useDoc.getState().redo()
        else useDoc.getState().undo()
      } else if (mod && e.key.toLowerCase() === 'y' && !editing) {
        e.preventDefault()
        useDoc.getState().redo()
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        const s = useDoc.getState()
        printDoc(s.base, s.variantId)
      } else if (e.key === 'Escape' && !editing) useDoc.getState().select(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
}

function FitGauge({ fit }: { fit: Fit | null }) {
  const t = useT()
  if (!fit) return null
  return (
    <div className={`gauge${fit.overflow ? ' is-over' : ''}`} role="status" aria-live="polite">
      {fit.columns.map((c, i) => (
        <span key={c.id} className="gauge-col">
          <span className="gauge-label">{t('insp.column', { n: i + 1 })}</span>
          <span className="gauge-val">{c.slack < 0 ? t('fit.over', { n: -c.slack }) : t('fit.free', { n: c.slack })}</span>
        </span>
      ))}
      <span className="gauge-col">
        <span className="gauge-label">{t('fit.pages')}</span>
        <span className="gauge-val">{fit.pages}</span>
      </span>
    </div>
  )
}

const DRAWERS: { id: Exclude<Panel, null>; key: Key; icon: 'rows' | 'sliders-horizontal' | 'squares-four' | 'scan' | 'download-simple' }[] = [
  { id: 'outline', key: 'panel.outline', icon: 'rows' },
  { id: 'inspect', key: 'panel.inspect', icon: 'sliders-horizontal' },
  { id: 'variants', key: 'panel.variants', icon: 'squares-four' },
  { id: 'ats', key: 'panel.ats', icon: 'scan' },
  { id: 'export', key: 'panel.export', icon: 'download-simple' },
]

export function Editor({ id }: { id: string }) {
  const t = useT()
  const doc = useResolved()
  const base = useDoc((s) => s.base)
  const variantId = useDoc((s) => s.variantId)
  const setVariant = useDoc((s) => s.setVariant)
  const { undo, redo, past, future } = useDoc()
  const [fit, setFit] = useState<Fit | null>(null)
  const [side, setSide] = useState<'inspect' | 'ats' | 'variants' | 'export'>('inspect')
  const drawer = useEditorUi((s) => s.drawer)
  const openDrawer = useEditorUi((s) => s.openDrawer)
  const lens = useEditorUi((s) => s.lens)
  const toggleLens = useEditorUi((s) => s.toggleLens)
  const wide = useMedia('(min-width: 1100px)')
  const medium = useMedia('(min-width: 760px)')
  const lang = useUiLang((s) => s.lang)
  const setLang = useUiLang((s) => s.setLang)
  const { theme, toggle } = useTheme()

  useAutosave()
  useShortcuts()

  const loaded = base.id === id

  useEffect(() => {
    if (useDoc.getState().base.id === id) return
    readDoc(id).then((d) => {
      if (!d) return go('#/')
      useDoc.getState().open(d)
    })
  }, [id])

  useEffect(() => {
    loadThemeFonts(doc.theme)
  }, [doc.theme])

  const onFit = useCallback((f: Fit) => setFit(f), [])

  if (!loaded) return <div className="ed-loading">{t('app.name')}</div>

  const panels = {
    outline: <Outline doc={doc} />,
    inspect: <Inspector doc={doc} />,
    variants: <Variants doc={base} />,
    ats: <AtsPanel doc={doc} />,
    export: <ExportPanel doc={doc} />,
  }

  return (
    <div className={`ed${wide ? ' is-wide' : medium ? ' is-medium' : ' is-narrow'}${lens ? ' has-lens' : ''}`}>
      <header className="ed-bar">
        <a className="ed-mark" href="#/" aria-label={t('nav.home')}>
          <Wordmark />
        </a>
        <input
          className="ed-name"
          aria-label={t('ed.docName')}
          value={base.name}
          onChange={(e) => useDoc.getState().editBase((d) => { d.name = e.target.value })}
        />
        <select className="ed-variant" aria-label={t('panel.variants')} value={variantId ?? ''} onChange={(e) => setVariant(e.target.value || null)}>
          <option value="">{t('var.base')}</option>
          {base.variants.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <div className="ed-tools">
          <Btn icon="arrow-counter-clockwise" label={t('nav.undo')} disabled={!past.length} onClick={undo} />
          <Btn icon="arrow-clockwise" label={t('nav.redo')} disabled={!future.length} onClick={redo} />
          {medium && <Btn icon="scan" label={t('ats.lens')} showLabel={wide} pressed={lens} onClick={toggleLens} />}
          {medium && <Btn icon="printer" label={t('nav.print')} showLabel={wide} tone="solid" onClick={() => printDoc(base, variantId)} />}
          <Btn icon={theme === 'dark' ? 'sun' : 'moon'} label={t(theme === 'dark' ? 'nav.theme.light' : 'nav.theme.dark')} onClick={toggle} />
          <Btn label={lang === 'fr' ? 'EN' : 'FR'} showLabel onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} aria-label={t('nav.lang')} />
        </div>
      </header>

      {wide && (
        <aside className="ed-left" aria-label={t('panel.outline')}>
          {panels.outline}
        </aside>
      )}

      <main className="ed-main">
        <Workspace doc={doc} onFit={onFit} />
        <FitGauge fit={fit} />
      </main>

      {medium && (
        <aside className="ed-right" aria-label={t('panel.inspect')}>
          <nav className="ed-tabs" aria-label={t('ed.panels')}>
            {(['inspect', 'variants', 'ats', 'export'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={side === p} className="ed-tab" onClick={() => setSide(p)}>
                {t(`panel.${p}`)}
              </button>
            ))}
            {!wide && (
              <button type="button" className="ed-tab" onClick={() => openDrawer('outline')}>
                {t('panel.outline')}
              </button>
            )}
          </nav>
          <div className="ed-panel">{panels[side]}</div>
        </aside>
      )}

      {!medium && (
        <nav className="ed-dock" aria-label={t('ed.panels')}>
          {DRAWERS.map((d) => (
            <button key={d.id} type="button" className="ed-dock-btn" onClick={() => openDrawer(d.id)}>
              <span className="ed-dock-label">{t(d.key)}</span>
            </button>
          ))}
        </nav>
      )}

      {DRAWERS.map((d) => (
        <Drawer key={d.id} open={drawer === d.id} title={t(d.key)} closeLabel={t('ed.close')} onClose={() => openDrawer(null)}>
          {panels[d.id]}
        </Drawer>
      ))}
    </div>
  )
}
