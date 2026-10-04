import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { Btn } from '../ui/kit'
import { columnOf, detachBlock, duplicateBlock, insertBullet, insertItem, moveBlock, moveInList, removeBlock, removeFromList } from './actions'
import { focusPath } from './EditableField'
import { currentScale, pageEl, pageRect, selectedEl } from './geometry'
import { useSelectionRects } from './Overlay'

const itemList = (doc: Doc, blockId: string) => {
  const b = doc.blocks.find((x) => x.id === blockId)
  if (!b) return null
  if (b.type === 'entries') return 'items'
  if (b.type === 'skills') return 'groups'
  if (b.type === 'pairs') return 'items'
  if (b.type === 'identity') return 'contacts'
  return null
}

export function SelectionBar({ doc, scale }: { doc: Doc; scale: number }) {
  const t = useT()
  const selection = useDoc((s) => s.selection)
  const rects = useSelectionRects(doc)
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  if (!selection || !rects.block) return null
  const block = doc.blocks.find((b) => b.id === selection.blockId)
  if (!block) return null
  const r = rects.item ?? rects.block
  const col = columnOf(doc, block.id)
  const cols = doc.layout.columns
  const listKey = itemList(doc, block.id)
  const itemId = selection.itemId
  const isEntry = block.type === 'entries' && itemId
  const top = Math.max(0, r.y * scale - 46)

  const moveItem = (delta: number) => listKey && itemId && edit((d) => moveInList(d, ['blocks', block.id, listKey], itemId, delta))

  const moveVertical = (delta: number) => {
    if (itemId) return moveItem(delta)
    if (!col) return
    const i = col.blocks.indexOf(block.id)
    edit((d) => moveBlock(d, block.id, col.id, delta > 0 ? i + 2 : i - 1))
  }

  const otherColumn = col && cols.length > 1 ? cols[(cols.indexOf(col) + 1) % cols.length] : null

  return (
    <div className="selbar" role="toolbar" aria-label={t('sel.toolbar')} style={{ left: Math.max(0, r.x * scale), top }} onPointerDown={(e) => e.stopPropagation()}>
      <Btn icon="arrow-up" label={t('sel.up')} onClick={() => moveVertical(-1)} />
      <Btn icon="arrow-down" label={t('sel.down')} onClick={() => moveVertical(1)} />
      {!itemId && otherColumn && (
        <Btn icon="columns" label={t('sel.column')} onClick={() => edit((d) => moveBlock(d, block.id, otherColumn.id, otherColumn.blocks.length))} />
      )}
      {listKey && (
        <Btn
          icon="plus"
          label={t(block.type === 'entries' ? 'sel.addEntry' : 'sel.addLine')}
          onClick={() => {
            let id: string | null = null
            edit((d) => {
              id = insertItem(d, block.id, itemId)
            })
            if (id) select({ blockId: block.id, itemId: id })
          }}
        />
      )}
      {isEntry && (
        <Btn
          icon="list"
          label={t('sel.addBullet')}
          onClick={() => {
            let id: string | null = null
            edit((d) => {
              id = insertBullet(d, block.id, itemId)
            })
            if (id) focusPath(['blocks', block.id, 'items', itemId, 'bullets', id, 'text'])
          }}
        />
      )}
      {!itemId && <Btn icon="copy" label={t('sel.duplicate')} onClick={() => edit((d) => { duplicateBlock(d, block.id) })} />}
      {!itemId && doc.layout.mode === 'flow' && (
        <Btn
          icon="arrows-out-cardinal"
          label={t('sel.detach')}
          onClick={() => {
            const page = pageEl()
            const el = selectedEl({ blockId: block.id })
            if (!page || !el) return
            const rr = pageRect(el, page, currentScale(page))
            const mm = 25.4 / 96
            edit((d) => detachBlock(d, block.id, { x: rr.x * mm, y: rr.y * mm, w: rr.w * mm, h: Math.max(5, rr.h * mm) }))
          }}
        />
      )}
      {!itemId && <Btn icon="eye-slash" label={t('sel.hide')} onClick={() => edit((d) => { const b = d.blocks.find((x) => x.id === block.id); if (b) b.hidden = true })} />}
      <Btn
        icon="trash"
        tone="proof"
        label={t(itemId ? 'sel.deleteItem' : 'sel.delete')}
        onClick={() => {
          if (itemId && listKey) edit((d) => removeFromList(d, ['blocks', block.id, listKey], itemId))
          else edit((d) => removeBlock(d, block.id))
          select(itemId ? { blockId: block.id } : null)
        }}
      />
    </div>
  )
}
