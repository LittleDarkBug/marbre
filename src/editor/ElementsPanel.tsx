import { useEffect, useMemo, useState } from 'react'
import { useT, type Key } from '../i18n'
import { newBlock } from '../model/factories'
import type { BlockType, Decor, Doc, NoteBlock, PhotoBlock } from '../model/schema'
import { MM, PAGE_MM } from '../render/Page'
import { pathIcon } from '../render/style'
import { useDoc } from '../store/doc'
import { Btn, Section } from '../ui/kit'
import { addBlock, addDecor } from './actions'
import { placeFree } from './elements'
import { decorKey } from './FreeTransform'
import { currentScale, pageEl } from './geometry'
import { pickImage, readImage } from './images'

function dropPoint(doc: Doc, w: number, h: number) {
  const page = pageEl()
  const size = PAGE_MM[doc.page.format]
  if (!page) return { x: (size.w - w) / 2, y: 30 }
  const r = page.getBoundingClientRect()
  const scale = currentScale(page)
  const cx = (Math.min(window.innerWidth, r.right) + Math.max(0, r.left)) / 2
  const cy = (Math.min(window.innerHeight, r.bottom) + Math.max(0, r.top)) / 2
  const x = (cx - r.left) / scale / MM - w / 2
  const y = (cy - r.top) / scale / MM - h / 2
  return { x: Math.round(Math.max(0, Math.min(size.w - w, x))), y: Math.round(Math.max(0, y)) }
}

const SECTIONS: { type: BlockType; key: Key; heading: Key }[] = [
  { type: 'text', key: 'block.text', heading: 'heading.profile' },
  { type: 'entries', key: 'block.entries', heading: 'heading.experience' },
  { type: 'skills', key: 'block.skills', heading: 'heading.skills' },
  { type: 'rating', key: 'block.rating', heading: 'heading.languages' },
  { type: 'pairs', key: 'block.pairs', heading: 'heading.languages' },
  { type: 'identity', key: 'block.identity', heading: 'block.identity' },
]

const SHAPES: { kind: Decor['kind']; key: Key; extra?: Partial<Decor>; preview: string }[] = [
  { kind: 'rect', key: 'decor.rect', preview: 'el-rect' },
  { kind: 'rect', key: 'el.rounded', extra: { radius: 4 }, preview: 'el-rounded' },
  { kind: 'ellipse', key: 'decor.ellipse', extra: { fill: true }, preview: 'el-ellipse' },
  { kind: 'line', key: 'decor.line', extra: { stroke: 0.5 }, preview: 'el-line' },
  { kind: 'line', key: 'el.arrow', extra: { stroke: 0.5, arrow: 'end' }, preview: 'el-arrow' },
  { kind: 'rule', key: 'decor.rule', preview: 'el-rule' },
]

export function ElementsPanel() {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    let alive = true
    import('../render/iconLibrary.json').then((m) => alive && setIcons(m.default as Record<string, string>))
    return () => {
      alive = false
    }
  }, [])

  const found = useMemo(() => {
    if (!icons) return []
    const q = query.trim().toLowerCase()
    const names = Object.keys(icons)
    return (q ? names.filter((n) => n.includes(q)) : names).slice(0, 96)
  }, [icons, query])

  const addText = (role: NoteBlock['role']) => {
    const block = { ...(newBlock('note') as NoteBlock), role, body: t(role === 'h1' ? 'el.sample.h1' : role === 'h2' ? 'el.sample.h2' : 'el.sample.p') }
    const size = role === 'p' ? { w: 80, h: 18 } : { w: 110, h: role === 'h1' ? 22 : 14 }
    edit((d) => placeFree(d, block, dropPoint(d, size.w, size.h), size))
    select({ blockId: block.id })
  }

  const addPhoto = async () => {
    const file = await pickImage()
    if (!file) return
    const { src, ratio } = await readImage(file)
    const block = { ...(newBlock('photo') as PhotoBlock), src, ratio, alt: t('el.photoAlt') }
    const w = 38
    const h = Math.round((w / ratio) * 10) / 10
    edit((d) => placeFree(d, { ...block, shape: ratio > 0.9 && ratio < 1.1 ? 'circle' : 'rounded' }, dropPoint(d, w, h), { w, h }))
    select({ blockId: block.id })
  }

  const addImage = async () => {
    const file = await pickImage()
    if (!file) return
    const { src, ratio } = await readImage(file)
    let id = ''
    edit((d) => {
      const w = 60
      id = addDecor(d, 'image', { src, fill: false }, dropPoint(d, w, w / ratio))
      const f = d.layout.decor.find((x) => x.id === id)!.frame
      f.w = w
      f.h = Math.round((w / ratio) * 10) / 10
    })
    select({ blockId: decorKey(id) })
  }

  const addShape = (kind: Decor['kind'], extra: Partial<Decor> = {}) => {
    let id = ''
    edit((d) => {
      id = addDecor(d, kind, extra, dropPoint(d, kind === 'line' || kind === 'rule' ? 60 : 30, 30))
    })
    select({ blockId: decorKey(id) })
  }

  return (
    <div className="els">
      <Section title={t('el.text')}>
        <div className="els-text">
          <button type="button" className="els-text-h1" onClick={() => addText('h1')}>{t('el.h1')}</button>
          <button type="button" className="els-text-h2" onClick={() => addText('h2')}>{t('el.h2')}</button>
          <button type="button" className="els-text-p" onClick={() => addText('p')}>{t('el.p')}</button>
        </div>
      </Section>
      <Section title={t('el.media')}>
        <div className="els-grid">
          <button type="button" className="els-tile" onClick={addPhoto}><span className="el-photo" />{t('block.photo')}</button>
          <button type="button" className="els-tile" onClick={addImage}><span className="el-image" />{t('decor.image')}</button>
          <button type="button" className="els-tile" onClick={() => addShape('qr', { text: 'https://', color: 'ink', fill: false })}><span className="el-qr" />{t('decor.qr')}</button>
        </div>
      </Section>
      <Section title={t('el.shapes')}>
        <div className="els-grid">
          {SHAPES.map((s) => (
            <button key={s.key} type="button" className="els-tile" onClick={() => addShape(s.kind, s.extra)}>
              <span className={s.preview} />
              {t(s.key)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('el.icons')}>
        <input className="ui-input" type="search" placeholder={t('el.search')} aria-label={t('el.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="els-icons">
          {icons === null && <p className="insp-note">{t('ats.reading')}</p>}
          {found.map((name) => (
            <button
              key={name}
              type="button"
              className="els-icon"
              title={name}
              aria-label={name}
              onClick={() => addShape('icon', { icon: name, src: icons![name] })}
              dangerouslySetInnerHTML={{ __html: pathIcon(icons![name]) }}
            />
          ))}
        </div>
      </Section>
      <Section title={t('ol.add')}>
        <div className="ol-add">
          {SECTIONS.map((a) => (
            <Btn
              key={a.type}
              icon="plus"
              showLabel
              label={t(a.key)}
              onClick={() => {
                let id = ''
                edit((d) => {
                  id = addBlock(d, a.type, a.type === 'identity' ? '' : t(a.heading))
                  if (a.type === 'rating') {
                    const b = d.blocks.find((x) => x.id === id)
                    if (b && b.type === 'rating') b.items = [{ id: `${id}a`, label: t('el.sample.lang1'), level: 4 }, { id: `${id}b`, label: t('el.sample.lang2'), level: 2 }]
                  }
                })
                select({ blockId: id })
              }}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}
