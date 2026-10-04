import { translate, useUiLang } from '../i18n'
import type { RenderApi } from '../render/context'
import { useDoc } from '../store/doc'
import { EditableField } from './EditableField'
import { pickImage, readImage } from './images'

const choose = (e: React.PointerEvent, key: string) => {
  const s = useDoc.getState()
  if (e.shiftKey) {
    e.preventDefault()
    s.toggleMulti(key)
  } else if (s.selection?.blockId !== key || s.multi.length > 1) s.select({ blockId: key })
}

export const editApi: RenderApi = {
  editable: true,
  Field: EditableField,
  blockProps: (block) => ({
    'data-block': block.id,
    onPointerDown: (e) => choose(e, block.id),
  }),
  itemProps: (block, itemId) => ({
    'data-item': itemId,
    onPointerDown: (e) => {
      if (e.shiftKey) return
      e.stopPropagation()
      const s = useDoc.getState()
      if (s.selection?.itemId !== itemId) s.select({ blockId: block.id, itemId })
    },
  }),
  photo: (block) => (
    <button
      type="button"
      className="mb-photo-empty"
      onClick={async () => {
        const file = await pickImage()
        if (!file) return
        const { src, ratio } = await readImage(file)
        useDoc.getState().edit((d) => {
          const b = d.blocks.find((x) => x.id === block.id)
          if (b && b.type === 'photo') {
            b.src = src
            b.ratio = ratio
          }
        })
      }}
    >
      {translate(useUiLang.getState().lang, 'photo.placeholder')}
    </button>
  ),
}
