import { useT } from '../i18n'
import type { Block, Contact, Doc, FontRole, Frame, IdentityBlock } from '../model/schema'
import { uid } from '../model/ids'
import { FONTS, fontSpec } from '../render/fontLibrary'
import { loadFamily } from '../render/fonts'
import { ICONS } from '../render/icons'
import { useDoc } from '../store/doc'
import { Btn, ColorField, Field, Scrub, Section, Segmented } from '../ui/kit'
import { addColumn, removeColumn, setMode } from './actions'
import { currentScale, pageEl, pageRect } from './geometry'

const CATEGORY_ORDER = ['sans', 'condensed', 'serif', 'mono'] as const

function FontSelect({ role, value }: { role: FontRole; value: string }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  return (
    <Field label={t(`font.${role}`)}>
      <select
        value={value}
        style={{ fontFamily: `'${value}'` }}
        onChange={(e) => {
          const family = e.target.value
          loadFamily(family).then(() => edit((d) => { d.theme.fonts[role] = family }))
        }}
      >
        {CATEGORY_ORDER.map((cat) => (
          <optgroup key={cat} label={t(`font.cat.${cat}`)}>
            {FONTS.filter((f) => f.category === cat).map((f) => (
              <option key={f.family} value={f.family}>{f.family}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  )
}

function DocumentPanel({ doc }: { doc: Doc }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const th = doc.theme
  const bodyWeights = fontSpec(th.fonts.body)?.weights ?? [400, 700]
  return (
    <>
      <Section title={t('insp.page')}>
        <Field label={t('insp.format')}>
          <Segmented label={t('insp.format')} value={doc.page.format} options={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Letter' }]} onChange={(v) => edit((d) => { d.page.format = v })} />
        </Field>
        <Field label={t('insp.length')}>
          <Segmented label={t('insp.length')} value={doc.page.fit} options={[{ value: 'one', label: t('insp.onePage') }, { value: 'flow', label: t('insp.severalPages') }]} onChange={(v) => edit((d) => { d.page.fit = v })} />
        </Field>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Scrub key={side} label={t(`insp.margin.${side}`)} unit="mm" value={doc.page.margin[side]} min={0} max={40} onChange={(v) => edit((d) => { d.page.margin[side] = v }, { merge: `m-${side}` })} />
        ))}
      </Section>
      <Section title={t('insp.layout')}>
        <Field label={t('insp.mode')}>
          <Segmented
            label={t('insp.mode')}
            value={doc.layout.mode}
            options={[{ value: 'flow', label: t('mode.flow') }, { value: 'free', label: t('mode.free') }]}
            onChange={(v) => {
              const page = pageEl()
              const frames: Record<string, { x: number; y: number; w: number; h: number }> = {}
              if (page) {
                const scale = currentScale(page)
                const mm = 25.4 / 96
                page.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => {
                  const r = pageRect(el, page, scale)
                  frames[el.dataset.block!] = { x: r.x * mm, y: r.y * mm, w: r.w * mm, h: Math.max(5, r.h * mm) }
                })
              }
              edit((d) => setMode(d, v, frames))
            }}
          />
        </Field>
        {doc.layout.mode === 'free' && <p className="insp-note">{t('mode.freeWarning')}</p>}
        {doc.layout.mode === 'flow' && (
          <>
            {doc.layout.columns.map((c, i) => (
              <div key={c.id} className="insp-col">
                <span className="insp-col-name">{t('insp.column', { n: i + 1 })}</span>
                <Scrub label={t('insp.width')} unit={c.unit} step={c.unit === 'fr' ? 0.1 : 1} min={c.unit === 'fr' ? 0.1 : 20} max={c.unit === 'fr' ? 10 : 200} value={c.width} onChange={(v) => edit((d) => { d.layout.columns[i].width = v }, { merge: `cw${i}` })} />
                <div className="insp-row">
                  <Segmented label={t('insp.unit')} value={c.unit} options={[{ value: 'fr', label: t('insp.flex') }, { value: 'mm', label: 'mm' }]} onChange={(v) => edit((d) => { const col = d.layout.columns[i]; col.unit = v; col.width = v === 'mm' ? 60 : 1 })} />
                  <Btn label={t('insp.panel')} pressed={c.panel} onClick={() => edit((d) => { d.layout.columns[i].panel = !c.panel })} />
                  {doc.layout.columns.length > 1 && <Btn icon="trash" tone="proof" label={t('insp.removeColumn')} onClick={() => edit((d) => removeColumn(d, c.id))} />}
                </div>
              </div>
            ))}
            {doc.layout.columns.length < 3 && <Btn icon="plus" label={t('insp.addColumn')} showLabel onClick={() => edit((d) => addColumn(d))} />}
            <Scrub label={t('insp.gutter')} unit="mm" value={doc.layout.gutter} min={0} max={30} onChange={(v) => edit((d) => { d.layout.gutter = v }, { merge: 'gutter' })} />
          </>
        )}
      </Section>
      <Section title={t('insp.type')}>
        {(['display', 'heading', 'body', 'accent'] as const).map((r) => (
          <FontSelect key={r} role={r} value={th.fonts[r]} />
        ))}
        <Field label={t('insp.weightBody')}>
          <select value={th.weight.body} onChange={(e) => edit((d) => { d.theme.weight.body = Number(e.target.value) })}>
            {bodyWeights.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
        <Field label={t('insp.weightStrong')}>
          <select value={th.weight.strong} onChange={(e) => edit((d) => { d.theme.weight.strong = Number(e.target.value) })}>
            {bodyWeights.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
        {(['name', 'title', 'heading', 'body', 'small'] as const).map((k) => (
          <Scrub key={k} label={t(`size.${k}`)} unit="px" step={0.1} min={7} max={k === 'name' ? 96 : 40} value={th.size[k]} onChange={(v) => edit((d) => { d.theme.size[k] = v }, { merge: `s-${k}` })} />
        ))}
        <Scrub label={t('insp.leading')} step={0.01} min={1} max={2} value={th.leading} onChange={(v) => edit((d) => { d.theme.leading = v }, { merge: 'lead' })} />
        <Field label={t('insp.case')}>
          <Segmented label={t('insp.case')} value={th.headingCase} options={[{ value: 'upper', label: t('insp.upper') }, { value: 'none', label: t('insp.asTyped') }]} onChange={(v) => edit((d) => { d.theme.headingCase = v })} />
        </Field>
      </Section>
      <Section title={t('insp.spacing')}>
        {(['section', 'item', 'line'] as const).map((k) => (
          <Scrub key={k} label={t(`space.${k}`)} unit="px" min={0} max={48} value={th.spacing[k]} onChange={(v) => edit((d) => { d.theme.spacing[k] = v }, { merge: `sp-${k}` })} />
        ))}
        <Field label={t('insp.dates')}>
          <Segmented label={t('insp.dates')} value={th.datePlacement} options={[{ value: 'inline', label: t('insp.datesInline') }, { value: 'right', label: t('insp.datesRight') }]} onChange={(v) => edit((d) => { d.theme.datePlacement = v })} />
        </Field>
        {th.datePlacement === 'right' && <p className="insp-note">{t('insp.datesRightWarning')}</p>}
        <Field label={t('insp.rule')}>
          <select value={th.rule} onChange={(e) => edit((d) => { d.theme.rule = e.target.value as Doc['theme']['rule'] })}>
            <option value="none">{t('rule.none')}</option>
            <option value="under-identity">{t('rule.identity')}</option>
            <option value="under-headings">{t('rule.headings')}</option>
          </select>
        </Field>
      </Section>
      <Section title={t('insp.colors')}>
        {(['ink', 'accent', 'paper', 'panel', 'highlight'] as const).map((k) => (
          <ColorField key={k} label={t(`color.${k}`)} value={th.colors[k]} onChange={(v) => edit((d) => { d.theme.colors[k] = v }, { merge: `c-${k}` })} />
        ))}
      </Section>
    </>
  )
}

const CONTACT_KINDS: Contact['kind'][] = ['phone', 'email', 'location', 'linkedin', 'github', 'website', 'other']

function IdentityPanel({ block }: { block: IdentityBlock }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const at = (d: Doc) => d.blocks.find((b) => b.id === block.id) as IdentityBlock
  return (
    <>
      <Section title={t('insp.highlights')} aside={<Btn icon="plus" label={t('insp.addHighlight')} onClick={() => edit((d) => { at(d).highlights.push({ id: uid('h'), icon: 'star', text: '' }) })} />}>
        {block.highlights.map((h, i) => (
          <div key={h.id} className="insp-row insp-line">
            <select aria-label={t('insp.icon')} value={h.icon ?? ''} onChange={(e) => edit((d) => { at(d).highlights[i].icon = e.target.value || undefined })}>
              <option value="">{t('insp.noIcon')}</option>
              {Object.keys(ICONS).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input className="ui-input" aria-label={t('insp.text')} value={h.text} onChange={(e) => edit((d) => { at(d).highlights[i].text = e.target.value }, { merge: h.id })} />
            <Btn icon="trash" tone="proof" label={t('sel.deleteItem')} onClick={() => edit((d) => { at(d).highlights.splice(i, 1) })} />
          </div>
        ))}
      </Section>
      <Section title={t('insp.contacts')} aside={<Btn icon="plus" label={t('sel.addLine')} onClick={() => edit((d) => { at(d).contacts.push({ id: uid('k'), kind: 'other', text: '' }) })} />}>
        {block.contacts.map((c, i) => (
          <div key={c.id} className="insp-contact">
            <div className="insp-row insp-line">
              <select aria-label={t('insp.kind')} value={c.kind} onChange={(e) => edit((d) => { at(d).contacts[i].kind = e.target.value as Contact['kind'] })}>
                {CONTACT_KINDS.map((k) => <option key={k} value={k}>{t(`contact.${k}`)}</option>)}
              </select>
              <input className="ui-input" aria-label={t('insp.text')} value={c.text} onChange={(e) => edit((d) => { at(d).contacts[i].text = e.target.value }, { merge: c.id })} />
              <Btn icon="trash" tone="proof" label={t('sel.deleteItem')} onClick={() => edit((d) => { at(d).contacts.splice(i, 1) })} />
            </div>
            <input className="ui-input insp-href" aria-label={t('insp.href')} placeholder="https://" value={c.href ?? ''} onChange={(e) => edit((d) => { at(d).contacts[i].href = e.target.value || undefined }, { merge: `${c.id}h` })} />
          </div>
        ))}
      </Section>
    </>
  )
}

function BlockPanel({ block }: { block: Block }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const at = (d: Doc) => d.blocks.find((b) => b.id === block.id)!
  return (
    <>
      <Section title={t(`block.${block.type}`)} aside={<Btn label={t('insp.document')} showLabel onClick={() => select(null)} />}>
        {block.type !== 'identity' && (
          <Field label={t('hint.heading')}>
            <input type="text" value={block.heading} onChange={(e) => edit((d) => { at(d).heading = e.target.value }, { merge: `${block.id}-h` })} />
          </Field>
        )}
        {block.type === 'entries' && (
          <Field label={t('insp.entryKind')}>
            <select value={block.kind} onChange={(e) => edit((d) => { const b = at(d); if (b.type === 'entries') b.kind = e.target.value as typeof b.kind })}>
              {(['experience', 'education', 'project', 'other'] as const).map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
            </select>
          </Field>
        )}
        <Btn label={t(block.hidden ? 'insp.show' : 'insp.hide')} icon={block.hidden ? 'eye' : 'eye-slash'} showLabel onClick={() => edit((d) => { at(d).hidden = !block.hidden })} />
      </Section>
      {block.type === 'identity' && <IdentityPanel block={block} />}
    </>
  )
}

const FRAME_KEYS = ['x', 'y', 'w', 'h', 'rotate'] as const

function FrameScrubs({ frame, onChange }: { frame: Frame; onChange: (k: (typeof FRAME_KEYS)[number], v: number) => void }) {
  const t = useT()
  return (
    <>
      {FRAME_KEYS.map((k) => (
        <Scrub key={k} label={t(`frame.${k}`)} unit={k === 'rotate' ? 'deg' : 'mm'} step={k === 'rotate' ? 1 : 0.5} min={k === 'rotate' ? -180 : 0} max={k === 'rotate' ? 180 : 300} value={frame[k]} onChange={(v) => onChange(k, v)} />
      ))}
    </>
  )
}

function DecorPanel({ doc, id }: { doc: Doc; id: string }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const decor = doc.layout.decor.find((d) => d.id === id)
  if (!decor) return null
  const at = (d: Doc) => d.layout.decor.find((x) => x.id === id)!
  const named = ['accent', 'ink', 'panel']
  return (
    <Section title={t(`decor.${decor.kind}`)} aside={<Btn label={t('insp.document')} showLabel onClick={() => select(null)} />}>
      <Field label={t('decor.color')}>
        <select value={named.includes(decor.color) ? decor.color : 'custom'} onChange={(e) => edit((d) => { at(d).color = e.target.value === 'custom' ? '#15120e' : e.target.value })}>
          <option value="accent">{t('color.accent')}</option>
          <option value="ink">{t('color.ink')}</option>
          <option value="panel">{t('color.panel')}</option>
          <option value="custom">{t('decor.custom')}</option>
        </select>
      </Field>
      {!named.includes(decor.color) && <ColorField label={t('decor.custom')} value={decor.color} onChange={(v) => edit((d) => { at(d).color = v }, { merge: `${id}c` })} />}
      {(decor.kind === 'rect' || decor.kind === 'ellipse') && (
        <>
          <Btn label={t('decor.fill')} pressed={decor.fill} onClick={() => edit((d) => { at(d).fill = !decor.fill })} />
          <Scrub label={t('decor.stroke')} unit="mm" step={0.1} min={0} max={5} value={decor.stroke} onChange={(v) => edit((d) => { at(d).stroke = v }, { merge: `${id}s` })} />
        </>
      )}
      {decor.kind === 'icon' && (
        <Field label={t('insp.icon')}>
          <select value={decor.icon} onChange={(e) => edit((d) => { at(d).icon = e.target.value })}>
            {Object.keys(ICONS).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      )}
      <FrameScrubs frame={decor.frame} onChange={(k, v) => edit((d) => { at(d).frame[k] = v }, { merge: `${id}${k}` })} />
      <p className="insp-note">{t('decor.note')}</p>
    </Section>
  )
}

function FramePanel({ doc, id }: { doc: Doc; id: string }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const frame = doc.layout.frames[id]
  if (!frame) return null
  return (
    <Section title={t('frame.title')}>
      <FrameScrubs frame={frame} onChange={(k, v) => edit((d) => { d.layout.frames[id][k] = v }, { merge: `${id}${k}` })} />
      {frame.rotate !== 0 && <p className="insp-note">{t('frame.rotateWarning')}</p>}
    </Section>
  )
}

export function Inspector({ doc }: { doc: Doc }) {
  const selection = useDoc((s) => s.selection)
  if (selection && selection.blockId.startsWith('decor:')) {
    return (
      <div className="insp">
        <DecorPanel doc={doc} id={selection.blockId.slice(6)} />
      </div>
    )
  }
  const block = selection ? doc.blocks.find((b) => b.id === selection.blockId) : null
  return (
    <div className="insp">
      {block ? <BlockPanel block={block} /> : <DocumentPanel doc={doc} />}
      {block && doc.layout.frames[block.id] && <FramePanel doc={doc} id={block.id} />}
    </div>
  )
}
