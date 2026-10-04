import { useEffect } from 'react'
import { resolveCached, useDoc } from '../store/doc'
import { copy, frameOf, nudge, paste, removeKeys, restackKeys, setLocked, type Clip } from './elements'
import { printDoc } from './ExportPanel'

let clip: Clip | null = null

const selectedKeys = () => {
  const s = useDoc.getState()
  if (s.multi.length) return s.multi
  return s.selection && !s.selection.itemId ? [s.selection.blockId] : []
}

export function useShortcuts() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const editing = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
      const s = useDoc.getState()
      const k = e.key.toLowerCase()
      if (mod && k === 'p') {
        e.preventDefault()
        printDoc(s.base, s.variantId)
        return
      }
      if (editing) return
      const keys = selectedKeys()
      const doc = resolveCached(s.base, s.variantId)
      if (mod && k === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
      } else if (mod && k === 'y') {
        e.preventDefault()
        s.redo()
      } else if (e.key === 'Escape') s.select(null)
      else if ((e.key === 'Delete' || e.key === 'Backspace') && keys.length) {
        e.preventDefault()
        s.edit((d) => removeKeys(d, keys))
        s.select(null)
      } else if (mod && k === 'c' && keys.length) {
        clip = copy(doc, keys)
      } else if (mod && (k === 'v' || k === 'd') && (clip || keys.length)) {
        e.preventDefault()
        const source = k === 'd' ? copy(doc, keys) : clip!
        let made: string[] = []
        s.edit((d) => {
          made = paste(d, source)
        })
        s.setMulti(made)
      } else if (e.key.startsWith('Arrow') && keys.some((x) => frameOf(doc, x))) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        s.edit((d) => nudge(d, keys, dx, dy), { merge: 'nudge' })
      } else if (mod && (e.key === ']' || e.key === '[') && keys.length) {
        e.preventDefault()
        s.edit((d) => restackKeys(d, keys, e.key === ']' ? 'front' : 'back'))
      } else if (mod && k === 'l' && keys.length) {
        e.preventDefault()
        const locked = keys.every((x) => frameOf(doc, x)?.locked)
        s.edit((d) => setLocked(d, keys, !locked))
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
}
