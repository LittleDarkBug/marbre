import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useT, type Key } from '../i18n'
import type { Block, BlockType, Doc } from '../model/schema'
import { plain } from '../model/rich'
import { useDoc } from '../store/doc'
import { Btn, Icon, Section } from '../ui/kit'
import { addBlock, addDecor, moveBlock } from './actions'
import { decorKey } from './FreeTransform'

const label = (b: Block, t: (k: Key) => string) => (b.type === 'identity' ? b.name || t('block.identity') : plain(b.heading) || t(`block.${b.type}`))

function Row({ block, index }: { block: Block; index: number }) {
  const t = useT()
  const selected = useDoc((s) => s.selection?.blockId === block.id)
  const select = useDoc((s) => s.select)
  const edit = useDoc((s) => s.edit)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  return (
    <li
      ref={setNodeRef}
      className={`ol-row${selected ? ' is-selected' : ''}${block.hidden ? ' is-hidden' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <span className="ol-grip" {...attributes} {...listeners} aria-label={t('ol.drag')}>
        <Icon name="dots-six-vertical" />
      </span>
      <span className="ol-num">{String(index + 1).padStart(2, '0')}</span>
      <button type="button" className="ol-name" onClick={() => select({ blockId: block.id })}>
        {label(block, t)}
      </button>
      <Btn icon={block.hidden ? 'eye-slash' : 'eye'} label={t(block.hidden ? 'insp.show' : 'insp.hide')} onClick={() => edit((d) => { const b = d.blocks.find((x) => x.id === block.id); if (b) b.hidden = !b.hidden })} />
    </li>
  )
}

function ColumnList({ id, title, ids, byId, offset }: { id: string; title: string; ids: string[]; byId: Map<string, Block>; offset: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` })
  return (
    <div className={`ol-col${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      <h4 className="ol-col-title">{title}</h4>
      <SortableContext id={id} items={ids} strategy={verticalListSortingStrategy}>
        <ol className="ol-list">
          {ids.map((bid, i) => {
            const b = byId.get(bid)
            return b ? <Row key={bid} block={b} index={offset + i} /> : null
          })}
        </ol>
      </SortableContext>
    </div>
  )
}

const ADDABLE: { type: BlockType; key: Key; heading: Key }[] = [
  { type: 'text', key: 'block.text', heading: 'heading.profile' },
  { type: 'entries', key: 'block.entries', heading: 'heading.experience' },
  { type: 'skills', key: 'block.skills', heading: 'heading.skills' },
  { type: 'pairs', key: 'block.pairs', heading: 'heading.languages' },
  { type: 'identity', key: 'block.identity', heading: 'block.identity' },
]

export function Outline({ doc }: { doc: Doc }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const [active, setActive] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const byId = new Map(doc.blocks.map((b) => [b.id, b]))
  const free = doc.layout.mode === 'free'
  const containers = free
    ? [{ id: 'order', title: t('ol.readingOrder'), ids: [...doc.layout.order.filter((id) => byId.has(id)), ...doc.blocks.map((b) => b.id).filter((id) => !doc.layout.order.includes(id))] }]
    : doc.layout.columns.map((c, i) => ({ id: c.id, title: t('insp.column', { n: i + 1 }), ids: c.blocks }))
  const detached = free ? [] : Object.keys(doc.layout.frames).filter((id) => byId.has(id))

  const findContainer = (id: string) => (id.startsWith('col:') ? id.slice(4) : containers.find((c) => c.ids.includes(id))?.id)

  const onEnd = (e: DragEndEvent) => {
    setActive(null)
    const from = String(e.active.id)
    const over = e.over ? String(e.over.id) : null
    if (!over || from === over) return
    const target = findContainer(over)
    if (!target) return
    if (free) {
      edit((d) => {
        const order = containers[0].ids.filter((x) => x !== from)
        order.splice(order.indexOf(over) < 0 ? order.length : order.indexOf(over), 0, from)
        d.layout.order = order
      })
      return
    }
    const list = containers.find((c) => c.id === target)!.ids
    const sameColumn = findContainer(from) === target
    let index = over.startsWith('col:') ? list.length : list.indexOf(over)
    if (sameColumn && list.indexOf(from) < index) index += 1
    edit((d) => moveBlock(d, from, target, index))
  }

  const offsets = containers.map((_, i) => containers.slice(0, i).reduce((n, c) => n + c.ids.length, 0))
  return (
    <div className="ol">
      <Section title={t(free ? 'ol.thread' : 'ol.structure')}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActive(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
          {containers.map((c, i) => (
            <ColumnList key={c.id} id={c.id} title={c.title} ids={c.ids} byId={byId} offset={offsets[i]} />
          ))}
          <DragOverlay>{active && byId.get(active) ? <div className="ol-row ol-ghost">{label(byId.get(active)!, t)}</div> : null}</DragOverlay>
        </DndContext>
        {detached.length > 0 && (
          <div className="ol-col">
            <h4 className="ol-col-title">{t('ol.detached')}</h4>
            <ol className="ol-list">
              {detached.map((id) => (
                <li key={id} className="ol-row">
                  <button type="button" className="ol-name" onClick={() => select({ blockId: id })}>{label(byId.get(id)!, t)}</button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Section>
      <Section title={t('ol.decor')}>
        <div className="ol-add">
          {(['rule', 'rect', 'ellipse', 'icon'] as const).map((kind) => (
            <Btn
              key={kind}
              icon="plus"
              showLabel
              label={t(`decor.${kind}`)}
              onClick={() => {
                let id = ''
                edit((d) => {
                  id = addDecor(d, kind, kind === 'icon' ? { icon: 'star' } : {})
                })
                select({ blockId: decorKey(id) })
              }}
            />
          ))}
        </div>
      </Section>
      <Section title={t('ol.add')}>
        <div className="ol-add">
          {ADDABLE.map((a) => (
            <Btn
              key={a.type}
              icon="plus"
              showLabel
              label={t(a.key)}
              onClick={() => {
                let id = ''
                edit((d) => {
                  id = addBlock(d, a.type, a.type === 'identity' ? '' : t(a.heading))
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
