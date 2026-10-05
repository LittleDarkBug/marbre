import { useLayoutEffect, useRef, type ElementType, type KeyboardEvent } from 'react'
import { translate, useUiLang } from '../i18n'
import { setAt } from '../model/paths'
import { escape, sanitize } from '../model/rich'
import type { FieldProps } from '../render/context'
import { useDoc } from '../store/doc'
import { insertBullet, removeFromList } from './actions'
import { openLinkEditor } from './LinkEditor'

export const focusPath = (path: string[], atEnd = true) =>
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-path="${CSS.escape(path.join('/'))}"]`)
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(!atEnd)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  })

const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value)

export function EditableField({ path, value, as = 'span', className, plain, multiline, hint }: FieldProps) {
  const ref = useRef<HTMLElement>(null)
  const lang = useUiLang((s) => s.lang)
  const visible = useDoc((s) => {
    if (value) return true
    const sel = s.selection
    if (!sel || sel.blockId !== path[1]) return false
    return path.length <= 3 || path[2] === 'heading' || sel.itemId === path[3]
  })
  const html = plain ? escape(value) : value

  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html
  }, [html, visible])

  if (!visible) return null

  const read = (el: HTMLElement) => (plain ? (el.textContent ?? '').replace(/\n/g, ' ') : sanitize(el.innerHTML).replace(/^<br>$/, ''))

  const commit = (el: HTMLElement) => {
    const next = read(el)
    if (next === value) return
    useDoc.getState().edit((d) => setAt(d, path, next), { merge: path.join('/') })
  }

  const isBullet = path[path.length - 3] === 'bullets'

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget
    const mod = e.metaKey || e.ctrlKey
    if (mod && !plain && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault()
      exec(e.key === 'b' ? 'bold' : 'italic')
      commit(el)
      return
    }
    if (mod && !plain && e.key === 'k') {
      e.preventDefault()
      openLinkEditor(el)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isBullet) {
        commit(el)
        const [, blockId, , entryId, , bulletId] = path
        let created: string | null = null
        useDoc.getState().edit((d) => {
          created = insertBullet(d, blockId, entryId, bulletId)
        })
        if (created) focusPath(['blocks', blockId, 'items', entryId, 'bullets', created, 'text'])
      } else if (multiline && e.shiftKey) {
        exec('insertLineBreak')
      } else el.blur()
      return
    }
    if (e.key === 'Backspace' && isBullet && !el.textContent) {
      e.preventDefault()
      const [, blockId, , entryId, , bulletId] = path
      const listPath = ['blocks', blockId, 'items', entryId, 'bullets']
      const doc = useDoc.getState()
      const entry = doc.base.blocks.find((b) => b.id === blockId)
      const bullets = entry && entry.type === 'entries' ? entry.items.find((i) => i.id === entryId)?.bullets ?? [] : []
      const prev = bullets[bullets.findIndex((b) => b.id === bulletId) - 1]
      doc.edit((d) => removeFromList(d, listPath, bulletId))
      if (prev) focusPath([...listPath, prev.id, 'text'])
      return
    }
    if (e.key === 'Escape') el.blur()
  }

  const onPaste = (e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const rich = e.clipboardData.getData('text/html')
    if (plain || !rich) exec('insertText', text.replace(/\s*\n\s*/g, ' '))
    else exec('insertHTML', sanitize(rich))
    commit(e.currentTarget)
  }

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget
    commit(el)
    const clean = read(el)
    el.innerHTML = plain ? escape(clean) : clean
  }

  const Tag = as as ElementType
  const label = hint ? translate(lang, hint) : undefined
  return (
    <Tag
      ref={ref}
      className={`${className ?? ''} mb-editable`}
      contentEditable={plain ? 'plaintext-only' : true}
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={label}
      aria-multiline={multiline ? true : undefined}
      data-path={path.join('/')}
      data-hint={label ?? ''}
      onInput={(e: React.FormEvent<HTMLElement>) => commit(e.currentTarget)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  )
}
