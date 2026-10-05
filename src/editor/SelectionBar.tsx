import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { Btn } from '../ui/kit'
import { columnOf, detachBlock, duplicateBlock, duplicateDecor, insertBullet, insertItem, moveBlock, moveInList, removeBlock, removeDecor, removeFromList, restack } from './actions'
import { decorKey, isDecorKey } from './FreeTransform'
import { focusPath } from './EditableField'
import { currentScale, pageEl, pageRect, selectedEl } from './geometry'
import { useSelectionRects } from './Overlay'
import { ItemGrip } from './ItemGrip'

const itemList = (doc: Doc, blockId: string, itemId?: string) => {
  const b = doc.blocks.find((x) => x.id === blockId)
  if (!b) return null
  if (b.type === 'entries') return 'items'
  if (b.type === 'skills') return 'groups'
  if (b.type === 'pairs' || b.type === 'rating') return 'items'
  if (b.type === 'identity') return itemId && b.highlights.some((h) => h.id === itemId) ? 'highlights' : 'contacts'
  return null
}

const horizontal = (sel: { blockId: string; itemId?: string }) => {
  const el = selectedEl(sel)
  const sibs = el?.parentElement ? Array.from(el.parentElement.children).filter((c) => c instanceof HTMLElement && c.dataset.item) : []
  if (sibs.length < 2) return false
  const a = sibs[0].getBoundingClientRect()
  const b = sibs[1].getBoundingClientRect()
  return Math.abs(a.top - b.top) < Math.min(a.height, b.height) / 2
}

export function SelectionBar({ doc, scale }: { doc: Doc; scale: number }) {
  const t = useT()
  const selection = useDoc((s) => s.selection)
  const rects = useSelectionRects(doc)
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  if (!selection || !rects.block) return null
  if (isDecorKey(selection.blockId)) {
    const id = selection.blockId.slice(6)
    const r = rects.block
    return (
      <div className="selbar" role="toolbar" aria-label={t('sel.toolbar')} style={{ left: Math.max(0, r.x * scale), top: Math.max(0, r.y * scale - 46) }} onPointerDown={(e) => e.stopPropagation()}>
        <Btn icon="arrow-up" label={t('sel.forward')} onClick={() => edit((d) => restack(d, id, 1))} />
        <Btn icon="arrow-down" label={t('sel.backward')} onClick={() => edit((d) => restack(d, id, -1))} />
        <Btn
          icon="copy"
          label={t('sel.duplicate')}
          onClick={() => {
            let copy: string | null = null
            edit((d) => {
              copy = duplicateDecor(d, id)
            })
            if (copy) select({ blockId: decorKey(copy) })
          }}
        />
        <Btn
          icon="trash"
          tone="proof"
          label={t('sel.deleteItem')}
          onClick={() => {
            edit((d) => removeDecor(d, id))
            select(null)
          }}
        />
      </div>
    )
  }
  const block = doc.blocks.find((b) => b.id === selection.blockId)
  if (!block) return null
  const r = rects.item ?? rects.block
  const col = columnOf(doc, block.id)
  const cols = doc.layout.columns
  const listKey = itemList(doc, block.id, selection.itemId)
  const row = selection.itemId ? horizontal(selection) : false
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
    <>
    {itemId && listKey && rects.item && <ItemGrip key={itemId} blockId={block.id} itemId={itemId} path={['blocks', block.id, listKey]} rect={rects.item} scale={scale} row={row} />}
    <div className="selbar" role="toolbar" aria-label={t('sel.toolbar')} style={{ left: Math.max(0, r.x * scale), top }} onPointerDown={(e) => e.stopPropagation()}>
      <Btn icon={row ? 'arrow-left' : 'arrow-up'} label={t(row ? 'sel.before' : 'sel.up')} onClick={() => moveVertical(-1)} />
      <Btn icon={row ? 'arrow-right' : 'arrow-down'} label={t(row ? 'sel.after' : 'sel.down')} onClick={() => moveVertical(1)} />
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
    </>
  )
}
