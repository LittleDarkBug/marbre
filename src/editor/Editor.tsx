import { useCallback, useEffect, useState } from 'react'
import { go } from '../app/router'
import { useT, useUiLang, type Key } from '../i18n'
import type { Fit } from '../render/Page'
import { loadDocFonts } from '../render/style'
import { useDoc, useResolved } from '../store/doc'
import { readDoc, saveDoc, writeToFolder } from '../store/persist'
import { useTheme } from '../app/theme'
import { Btn, Drawer, Icon, useMedia } from '../ui/kit'
import { Wordmark } from '../ui/Wordmark'
import { ExportPanel, printDoc } from './ExportPanel'
import { Inspector } from './Inspector'
import { Outline } from './Outline'
import { useShortcuts } from './shortcuts'
import { ElementsPanel } from './ElementsPanel'
import { Layers } from './Layers'
import { useEditorUi, type Panel } from './uiState'
import { Variants } from './Variants'
import { Workspace } from './Workspace'
import { AtsPanel } from '../ats/AtsPanel'
import { ProofPanel } from '../proof/ProofPanel'
import { useAtsRunner } from '../ats/store'
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

const DRAWERS: { id: Exclude<Panel, null>; key: Key; icon: 'plus' | 'rows' | 'sliders-horizontal' | 'squares-four' | 'scan' | 'check' | 'download-simple' }[] = [
  { id: 'elements', key: 'panel.elements', icon: 'plus' },
  { id: 'outline', key: 'panel.outline', icon: 'rows' },
  { id: 'inspect', key: 'panel.inspect', icon: 'sliders-horizontal' },
  { id: 'variants', key: 'panel.variants', icon: 'squares-four' },
  { id: 'ats', key: 'panel.ats', icon: 'scan' },
  { id: 'proof', key: 'panel.proof', icon: 'check' },
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
  const [left, setLeft] = useState<'elements' | 'outline'>('elements')
  const [side, setSide] = useState<'inspect' | 'ats' | 'proof' | 'variants' | 'export'>('inspect')
  const drawer = useEditorUi((s) => s.drawer)
  const openDrawer = useEditorUi((s) => s.openDrawer)
  const lens = useEditorUi((s) => s.lens)
  const toggleLens = useEditorUi((s) => s.toggleLens)
  const thread = useEditorUi((s) => s.thread)
  const toggleThread = useEditorUi((s) => s.toggleThread)
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
    loadDocFonts(doc)
  }, [doc])

  const onFit = useCallback((f: Fit) => setFit(f), [])
  useAtsRunner(doc, fit, lens || (medium && side === 'ats') || drawer === 'ats')

  if (!loaded) return <div className="ed-loading">{t('app.name')}</div>

  const panels = {
    elements: <ElementsPanel />,
    outline: (
      <>
        <Outline doc={doc} />
        <Layers doc={doc} />
      </>
    ),
    inspect: <Inspector doc={doc} />,
    variants: <Variants doc={base} />,
    ats: <AtsPanel doc={doc} />,
    proof: <ProofPanel key={`${base.id}-${variantId}`} doc={doc} />,
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
          {medium && <Btn icon="path" label={t('thread.toggle')} pressed={thread} onClick={toggleThread} />}
          {medium && <Btn icon="scan" label={t('ats.lens')} showLabel={wide} pressed={lens} onClick={toggleLens} />}
          {medium && <Btn icon="printer" label={t('nav.print')} showLabel={wide} tone="solid" onClick={() => printDoc(base, variantId)} />}
          <Btn icon={theme === 'dark' ? 'sun' : 'moon'} label={t(theme === 'dark' ? 'nav.theme.light' : 'nav.theme.dark')} onClick={toggle} />
          <Btn label={lang === 'fr' ? 'EN' : 'FR'} showLabel onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} aria-label={t('nav.lang')} />
        </div>
      </header>

      {wide && (
        <aside className="ed-left" aria-label={t('panel.elements')}>
          <nav className="ed-tabs" aria-label={t('ed.panels')}>
            {(['elements', 'outline'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={left === p} className="ed-tab" onClick={() => setLeft(p)}>
                {t(`panel.${p}`)}
              </button>
            ))}
          </nav>
          {panels[left]}
        </aside>
      )}

      <main className="ed-main">
        <Workspace doc={doc} onFit={onFit} />
        <FitGauge fit={fit} />
      </main>

      {medium && (
        <aside className="ed-right" aria-label={t('panel.inspect')}>
          <nav className="ed-tabs" aria-label={t('ed.panels')}>
            {(['inspect', 'variants', 'ats', 'proof', 'export'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={side === p} className="ed-tab" onClick={() => setSide(p)}>
                {t(`panel.${p}`)}
              </button>
            ))}
            {!wide && (
              <>
                <button type="button" className="ed-tab" onClick={() => openDrawer('elements')}>
                  {t('panel.elements')}
                </button>
                <button type="button" className="ed-tab" onClick={() => openDrawer('outline')}>
                  {t('panel.outline')}
                </button>
              </>
            )}
          </nav>
          <div className="ed-panel">{panels[side]}</div>
        </aside>
      )}

      {!medium && (
        <nav className="ed-dock" aria-label={t('ed.panels')}>
          {DRAWERS.map((d) => (
            <button key={d.id} type="button" className="ed-dock-btn" aria-label={t(d.key)} onClick={() => openDrawer(d.id)}>
              <Icon name={d.icon} size={18} />
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
