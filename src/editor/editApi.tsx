import type { RenderApi } from '../render/context'
import { useDoc } from '../store/doc'
import { EditableField } from './EditableField'

export const editApi: RenderApi = {
  editable: true,
  Field: EditableField,
  blockProps: (block) => ({
    'data-block': block.id,
    onPointerDown: () => {
      const s = useDoc.getState()
      if (s.selection?.blockId !== block.id) s.select({ blockId: block.id })
    },
  }),
  itemProps: (block, itemId) => ({
    'data-item': itemId,
    onPointerDown: (e) => {
      e.stopPropagation()
      const s = useDoc.getState()
      if (s.selection?.itemId !== itemId) s.select({ blockId: block.id, itemId })
    },
  }),
}
