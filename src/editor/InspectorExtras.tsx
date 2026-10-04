import { useT } from '../i18n'
import { uid } from '../model/ids'
import type { Block, BlockStyle, Doc, Frame, NoteBlock, PhotoBlock, RatingBlock } from '../model/schema'
import { FONTS } from '../render/fontLibrary'
import { loadFamily } from '../render/fonts'
import { PAGE_MM } from '../render/Page'
import { useDoc } from '../store/doc'
import { Btn, ColorField, Field, Scrub, Section, Segmented } from '../ui/kit'
import { Select } from '../ui/Select'
import { align, frameOf, removeKeys, restackKeys, setLocked, type Align } from './elements'
import { pickImage, readImage } from './images'

const blockAt = <T extends Block>(d: Doc, id: string) => d.blocks.find((b) => b.id === id) as T

function FontPick({ label, value, onPick }: { label: string; value?: string; onPick: (v?: string) => void }) {
  const t = useT()
  return (
    <Field label={label}>
      <Select
        label={label}
        value={value ?? ''}
        searchable
        searchPlaceholder={t('ui.searchFont')}
        options={[{ value: '', label: t('style.inherit') }, ...FONTS.map((f) => ({ value: f.family, label: f.family, style: { fontFamily: `'${f.family}'` } }))]}
        onChange={(v) => { if (v) loadFamily(v).then(() => onPick(v)); else onPick(undefined) }}
      />
    </Field>
  )
}

export function BlockStylePanel({ block }: { block: Block }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const s = block.style ?? {}
  const set = <K extends keyof BlockStyle>(k: K, v: BlockStyle[K], merge = true) =>
    edit((d) => { const b = blockAt(d, block.id); b.style = { ...(b.style ?? {}), [k]: v } }, merge ? { merge: `${block.id}-${k}` } : undefined)
  const hasStyle = Object.values(s).some((v) => v !== undefined)
  return (
    <Section title={t('style.title')} aside={hasStyle ? <Btn label={t('style.reset')} showLabel onClick={() => edit((d) => { blockAt(d, block.id).style = {} })} /> : undefined}>
      <FontPick label={t('font.body')} value={s.font} onPick={(v) => set('font', v, false)} />
      {block.type !== 'photo' && <FontPick label={t('font.heading')} value={s.headingFont} onPick={(v) => set('headingFont', v, false)} />}
      <Scrub label={t('size.body')} unit="px" step={0.5} min={6} max={72} value={s.size ?? 0} onChange={(v) => set('size', v || undefined)} />
      <Field label={t('style.align')}>
        <Segmented label={t('style.align')} value={s.align ?? 'left'} options={(['left', 'center', 'right', 'justify'] as const).map((a) => ({ value: a, label: t(`style.align.${a}`) }))} onChange={(v) => set('align', v === 'left' ? undefined : v, false)} />
      </Field>
      <ColorField label={t('color.ink')} value={s.color ?? '#000000'} onChange={(v) => set('color', v)} />
      <ColorField label={t('color.accent')} value={s.accent ?? '#000000'} onChange={(v) => set('accent', v)} />
      <ColorField label={t('style.background')} value={s.background ?? '#ffffff'} onChange={(v) => set('background', v)} />
      <Scrub label={t('style.padding')} unit="mm" step={0.5} min={0} max={30} value={s.padding ?? 0} onChange={(v) => set('padding', v || undefined)} />
      <Scrub label={t('style.radius')} unit="mm" step={0.5} min={0} max={30} value={s.radius ?? 0} onChange={(v) => set('radius', v || undefined)} />
      <Scrub label={t('style.border')} unit="mm" step={0.1} min={0} max={5} value={s.borderWidth ?? 0} onChange={(v) => set('borderWidth', v || undefined)} />
      {s.borderWidth ? <ColorField label={t('style.borderColor')} value={s.borderColor ?? '#000000'} onChange={(v) => set('borderColor', v)} /> : null}
      <Scrub label={t('insp.leading')} step={0.05} min={0} max={3} value={s.leading ?? 0} onChange={(v) => set('leading', v || undefined)} />
      <Scrub label={t('style.tracking')} unit="em" step={0.01} min={-0.1} max={0.5} value={s.tracking ?? 0} onChange={(v) => set('tracking', v || undefined)} />
      {s.tracking ? <p className="insp-note">{t('style.trackingWarning')}</p> : null}
      <Scrub label={t('style.opacity')} step={0.05} min={0.1} max={1} value={s.opacity ?? 1} onChange={(v) => set('opacity', v >= 1 ? undefined : v)} />
      <Btn label={t('insp.upper')} pressed={Boolean(s.uppercase)} onClick={() => set('uppercase', s.uppercase ? undefined : true, false)} />
    </Section>
  )
}

export function NotePanel({ block }: { block: NoteBlock }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  return (
    <Section title={t('block.note')}>
      <Field label={t('note.role')}>
        <Segmented label={t('note.role')} value={block.role} options={(['h1', 'h2', 'h3', 'p'] as const).map((r) => ({ value: r, label: t(`note.role.${r}`) }))} onChange={(v) => edit((d) => { blockAt<NoteBlock>(d, block.id).role = v })} />
      </Field>
    </Section>
  )
}

export function PhotoPanel({ block }: { block: PhotoBlock }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const set = <K extends keyof PhotoBlock>(k: K, v: PhotoBlock[K], merge = true) => edit((d) => { blockAt<PhotoBlock>(d, block.id)[k] = v }, merge ? { merge: `${block.id}-${String(k)}` } : undefined)
  return (
    <Section title={t('block.photo')}>
      <div className="insp-row">
        <Btn
          icon="upload-simple"
          showLabel
          tone="solid"
          label={t(block.src ? 'photo.replace' : 'photo.add')}
          onClick={async () => {
            const file = await pickImage()
            if (!file) return
            const { src, ratio } = await readImage(file)
            edit((d) => { const b = blockAt<PhotoBlock>(d, block.id); b.src = src; b.ratio = ratio; b.focusX = 50; b.focusY = 50; b.zoom = 1 })
          }}
        />
        {block.src && <Btn icon="trash" tone="proof" label={t('photo.remove')} onClick={() => set('src', '', false)} />}
      </div>
      <Field label={t('photo.shape')}>
        <Segmented label={t('photo.shape')} value={block.shape} options={(['circle', 'rounded', 'rect'] as const).map((v) => ({ value: v, label: t(`photo.shape.${v}`) }))} onChange={(v) => set('shape', v, false)} />
      </Field>
      <Scrub label={t('photo.zoom')} step={0.05} min={1} max={3} value={block.zoom} onChange={(v) => set('zoom', v)} />
      <Scrub label={t('photo.x')} unit="%" min={0} max={100} value={block.focusX} onChange={(v) => set('focusX', v)} />
      <Scrub label={t('photo.y')} unit="%" min={0} max={100} value={block.focusY} onChange={(v) => set('focusY', v)} />
      <Scrub label={t('photo.ratio')} step={0.05} min={0.4} max={2.5} value={block.ratio} onChange={(v) => set('ratio', v)} />
      <Btn label={t('photo.grayscale')} pressed={block.grayscale} onClick={() => set('grayscale', !block.grayscale, false)} />
      <Field label={t('photo.alt')}>
        <input type="text" value={block.alt} onChange={(e) => set('alt', e.target.value)} />
      </Field>
      <p className="insp-note">{t('photo.note')}</p>
    </Section>
  )
}

export function RatingPanel({ block }: { block: RatingBlock }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const at = (d: Doc) => blockAt<RatingBlock>(d, block.id)
  return (
    <Section title={t('block.rating')} aside={<Btn icon="plus" label={t('sel.addLine')} onClick={() => edit((d) => { at(d).items.push({ id: uid('r'), label: '', level: Math.ceil(block.max / 2) }) })} />}>
      <Field label={t('rating.display')}>
        <Segmented label={t('rating.display')} value={block.display} options={(['dots', 'bar', 'text'] as const).map((v) => ({ value: v, label: t(`rating.${v}`) }))} onChange={(v) => edit((d) => { at(d).display = v })} />
      </Field>
      <Scrub label={t('rating.max')} min={3} max={10} value={block.max} onChange={(v) => edit((d) => { at(d).max = v }, { merge: `${block.id}max` })} />
      {block.items.map((r, i) => (
        <div key={r.id} className="insp-row insp-line">
          <input className="ui-input" aria-label={t('hint.label')} value={r.label} onChange={(e) => edit((d) => { at(d).items[i].label = e.target.value }, { merge: r.id })} />
          <Scrub label={t('rating.level')} min={0} max={block.max} value={r.level} onChange={(v) => edit((d) => { at(d).items[i].level = v }, { merge: `${r.id}l` })} />
          <Btn icon="trash" tone="proof" label={t('sel.deleteItem')} onClick={() => edit((d) => { at(d).items.splice(i, 1) })} />
        </div>
      ))}
      {block.display !== 'text' && <p className="insp-note">{t('rating.note')}</p>}
    </Section>
  )
}

export function FreePanel({ doc, keys }: { doc: Doc; keys: string[] }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const frames = keys.map((k) => frameOf(doc, k)).filter((f): f is Frame => Boolean(f))
  if (!frames.length) return null
  const locked = frames.every((f) => f.locked)
  const size = PAGE_MM[doc.page.format]
  const page = { w: size.w, h: size.h * (doc.page.count ?? 1) }
  const many = keys.length > 1
  const one = frames[0]
  const ALIGN: { how: Align; key: 'align.left' | 'align.hcenter' | 'align.right' | 'align.top' | 'align.vcenter' | 'align.bottom' | 'align.hspace' | 'align.vspace' }[] = [
    { how: 'left', key: 'align.left' },
    { how: 'hcenter', key: 'align.hcenter' },
    { how: 'right', key: 'align.right' },
    { how: 'top', key: 'align.top' },
    { how: 'vcenter', key: 'align.vcenter' },
    { how: 'bottom', key: 'align.bottom' },
    ...(keys.length > 2 ? ([{ how: 'hspace', key: 'align.hspace' }, { how: 'vspace', key: 'align.vspace' }] as const) : []),
  ]
  return (
    <Section title={many ? t('free.multi', { n: keys.length }) : t('frame.title')}>
      <p className="insp-note">{t(many ? 'free.alignGroup' : 'free.alignPage')}</p>
      <div className="insp-align">
        {ALIGN.map((a) => (
          <button key={a.how} type="button" className={`align-btn align-${a.how}`} title={t(a.key)} aria-label={t(a.key)} onClick={() => edit((d) => align(d, keys, a.how, page))}>
            <i /><i /><i />
          </button>
        ))}
      </div>
      {!many && (
        <>
          {(['x', 'y', 'w', 'h', 'rotate'] as const).map((k) => (
            <Scrub key={k} label={t(`frame.${k}`)} unit={k === 'rotate' ? 'deg' : 'mm'} step={k === 'rotate' ? 1 : 0.5} min={k === 'rotate' ? -180 : 0} max={k === 'rotate' ? 180 : 600} value={one[k]} onChange={(v) => edit((d) => { const f = frameOf(d, keys[0]); if (f) f[k] = v }, { merge: `${keys[0]}${k}` })} />
          ))}
          {one.rotate !== 0 && !keys[0].startsWith('decor:') && <p className="insp-note">{t('frame.rotateWarning')}</p>}
        </>
      )}
      <div className="insp-row">
        <Btn icon={locked ? 'check' : 'selection-slash'} showLabel label={t(locked ? 'free.unlock' : 'free.lock')} pressed={locked} onClick={() => edit((d) => setLocked(d, keys, !locked))} />
        <Btn showLabel label={t('free.front')} onClick={() => edit((d) => restackKeys(d, keys, 'front'))} />
        <Btn showLabel label={t('free.back')} onClick={() => edit((d) => restackKeys(d, keys, 'back'))} />
        {many && <Btn icon="trash" tone="proof" showLabel label={t('sel.deleteItem')} onClick={() => { edit((d) => removeKeys(d, keys)); select(null) }} />}
      </div>
    </Section>
  )
}

export function PagePanel({ doc }: { doc: Doc }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  return (
    <Section title={t('pagebg.title')}>
      <ColorField label={t('pagebg.color')} value={doc.page.background || doc.theme.colors.paper} onChange={(v) => edit((d) => { d.page.background = v }, { merge: 'pagebg' })} />
      <div className="insp-row">
        <Btn
          icon="upload-simple"
          showLabel
          label={t(doc.page.backgroundImage ? 'pagebg.replace' : 'pagebg.image')}
          onClick={async () => {
            const file = await pickImage()
            if (!file) return
            const { src } = await readImage(file, 2000)
            edit((d) => { d.page.backgroundImage = src })
          }}
        />
        {(doc.page.backgroundImage || doc.page.background) && <Btn icon="x" showLabel label={t('pagebg.clear')} onClick={() => edit((d) => { d.page.backgroundImage = ''; d.page.background = '' })} />}
      </div>
      <Scrub label={t('pagebg.count')} min={1} max={4} value={doc.page.count ?? 1} onChange={(v) => edit((d) => { d.page.count = v }, { merge: 'pagecount' })} />
    </Section>
  )
}
