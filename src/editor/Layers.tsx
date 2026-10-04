import { useT } from '../i18n'
import { plain } from '../model/rich'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { Btn, Section } from '../ui/kit'
import { decorId, frameOf, freeKeys, isDecor, setLocked } from './elements'

export function Layers({ doc }: { doc: Doc }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const multi = useDoc((s) => s.multi)
  const select = useDoc((s) => s.select)
  const toggleMulti = useDoc((s) => s.toggleMulti)
  const keys = freeKeys(doc).sort((a, b) => (frameOf(doc, b)?.z ?? 0) - (frameOf(doc, a)?.z ?? 0))

  const label = (key: string) => {
    if (isDecor(key)) {
      const d = doc.layout.decor.find((x) => x.id === decorId(key))
      return d ? `${t(`decor.${d.kind}`)}${d.icon ? ` · ${d.icon}` : ''}` : key
    }
    const b = doc.blocks.find((x) => x.id === key)
    if (!b) return key
    const text = b.type === 'identity' ? b.name : b.type === 'note' ? plain(b.body) : plain(b.heading)
    return text.slice(0, 32) || t(`block.${b.type}`)
  }

  const hidden = (key: string) => (isDecor(key) ? doc.layout.decor.find((d) => d.id === decorId(key))?.hidden : doc.blocks.find((b) => b.id === key)?.hidden) ?? false

  return (
    <Section title={t('panel.layers')}>
      {keys.length === 0 ? (
        <p className="insp-note">{t('layers.empty')}</p>
      ) : (
        <ol className="ol-list">
          {keys.map((key) => {
            const f = frameOf(doc, key)!
            const isHidden = hidden(key)
            return (
              <li key={key} className={`ol-row layer-row${multi.includes(key) ? ' is-selected' : ''}${isHidden ? ' is-hidden' : ''}`}>
                <span className="ol-num">{f.z}</span>
                <button
                  type="button"
                  className="ol-name"
                  onClick={(e) => (e.shiftKey || e.metaKey || e.ctrlKey ? toggleMulti(key) : select({ blockId: key }))}
                >
                  {label(key)}
                </button>
                <Btn
                  icon={isHidden ? 'eye-slash' : 'eye'}
                  label={t(isHidden ? 'layers.show' : 'layers.hide')}
                  onClick={() =>
                    edit((d) => {
                      if (isDecor(key)) {
                        const x = d.layout.decor.find((dd) => dd.id === decorId(key))
                        if (x) x.hidden = !x.hidden
                      } else {
                        const b = d.blocks.find((bb) => bb.id === key)
                        if (b) b.hidden = !b.hidden
                      }
                    })
                  }
                />
                <Btn icon={f.locked ? 'check' : 'selection-slash'} label={t(f.locked ? 'free.unlock' : 'free.lock')} pressed={f.locked} onClick={() => edit((d) => setLocked(d, [key], !f.locked))} />
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}
