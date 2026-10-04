import { produce } from 'immer'
import { create } from 'zustand'
import { blankDoc } from '../model/factories'
import { uid } from '../model/ids'
import type { Doc } from '../model/schema'
import { resolve, withEdit } from '../model/variants'

export type Selection = { blockId: string; itemId?: string; field?: string } | null

type State = {
  base: Doc
  variantId: string | null
  past: Doc[]
  future: Doc[]
  selection: Selection
  multi: string[]
  toggleMulti: (key: string) => void
  setMulti: (keys: string[]) => void
  open: (doc: Doc) => void
  edit: (recipe: (draft: Doc) => void, opts?: { merge?: string }) => void
  editBase: (recipe: (draft: Doc) => void) => void
  undo: () => void
  redo: () => void
  select: (s: Selection) => void
  setVariant: (id: string | null) => void
  addVariant: (name: string, lang?: 'fr' | 'en') => string
}

const LIMIT = 200
let lastMerge: { key: string; at: number } | null = null

export const useDoc = create<State>((set, get) => ({
  base: blankDoc(),
  variantId: null,
  past: [],
  future: [],
  selection: null,
  multi: [],
  toggleMulti: (key) => {
    const { multi } = get()
    const next = multi.includes(key) ? multi.filter((k) => k !== key) : [...multi, key]
    set({ multi: next, selection: next.length ? { blockId: next[next.length - 1] } : null })
  },
  setMulti: (keys) => set({ multi: keys, selection: keys.length ? { blockId: keys[keys.length - 1] } : null }),
  open: (doc) => set({ base: doc, variantId: null, past: [], future: [], selection: null, multi: [] }),
  edit: (recipe, opts) => {
    const { base, variantId, past } = get()
    const next = produce(resolve(base, variantId), recipe)
    const updated = { ...withEdit(base, variantId, next), updatedAt: new Date().toISOString() }
    const now = Date.now()
    const merging = opts?.merge && lastMerge?.key === opts.merge && now - lastMerge.at < 1200
    lastMerge = opts?.merge ? { key: opts.merge, at: now } : null
    set({ base: updated, past: merging ? past : [...past, base].slice(-LIMIT), future: [] })
  },
  editBase: (recipe) => {
    const { base, past } = get()
    set({ base: { ...produce(base, recipe), updatedAt: new Date().toISOString() }, past: [...past, base].slice(-LIMIT), future: [] })
  },
  undo: () => {
    const { past, base, future } = get()
    const prev = past[past.length - 1]
    if (prev) set({ base: prev, past: past.slice(0, -1), future: [base, ...future] })
  },
  redo: () => {
    const { past, base, future } = get()
    const [next, ...rest] = future
    if (next) set({ base: next, past: [...past, base], future: rest })
  },
  select: (selection) => set({ selection, multi: selection && !selection.itemId ? [selection.blockId] : [] }),
  setVariant: (variantId) => set({ variantId, selection: null }),
  addVariant: (name, lang) => {
    const id = uid('v')
    get().editBase((d) => {
      d.variants.push({ id, name, lang, overrides: [] })
    })
    set({ variantId: id })
    return id
  },
}))

export const useResolved = () => useDoc((s) => resolveCached(s.base, s.variantId))

let cache: { base: Doc; variantId: string | null; out: Doc } | null = null
export function resolveCached(base: Doc, variantId: string | null) {
  if (cache && cache.base === base && cache.variantId === variantId) return cache.out
  const out = resolve(base, variantId)
  cache = { base, variantId, out }
  return out
}
