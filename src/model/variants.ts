import type { Doc, Override, Variant } from './schema'

type Json = unknown
type Obj = Record<string, Json>

const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const hasIds = (v: Json): v is Obj[] => Array.isArray(v) && v.every((x) => isObj(x) && typeof x.id === 'string')
const clone = <T>(v: T): T => structuredClone(v)

function child(parent: Json, key: string): Json {
  if (Array.isArray(parent)) return parent.find((x) => isObj(x) && x.id === key)
  if (isObj(parent)) return parent[key]
  return undefined
}

function apply(root: Obj, o: Override) {
  const path = o.path
  let parent: Json = root
  for (const key of path.slice(0, -1)) parent = child(parent, key)
  const last = path[path.length - 1]
  if (parent === undefined) return
  if (o.op === 'set') {
    if (Array.isArray(parent)) {
      const i = parent.findIndex((x) => isObj(x) && x.id === last)
      if (i >= 0) parent[i] = clone(o.value)
    } else if (isObj(parent)) parent[last] = clone(o.value)
  } else if (o.op === 'hide') {
    const list = child(parent, last)
    if (Array.isArray(list) && Array.isArray(o.value)) {
      const hidden = new Set(o.value as string[])
      const kept = list.filter((x) => !(isObj(x) && hidden.has(x.id as string)))
      list.splice(0, list.length, ...kept)
    }
  } else if (o.op === 'order') {
    const list = child(parent, last)
    if (Array.isArray(list) && Array.isArray(o.value)) {
      const rank = new Map((o.value as string[]).map((k, i) => [k, i]))
      list.sort((a, b) => (rank.get((a as Obj).id as string) ?? 1e9) - (rank.get((b as Obj).id as string) ?? 1e9))
    }
  }
}

export function resolve(doc: Doc, variantId: string | null): Doc {
  const variant = doc.variants.find((v) => v.id === variantId)
  if (!variant) return doc
  const out = clone(doc) as unknown as Obj
  for (const o of variant.overrides) apply(out, o)
  const resolved = out as unknown as Doc
  return variant.lang ? { ...resolved, lang: variant.lang } : resolved
}

function diffInto(a: Json, b: Json, path: string[], out: Override[]) {
  if (Object.is(a, b)) return
  if (hasIds(a) && hasIds(b)) {
    const aIds = a.map((x) => x.id as string)
    const bIds = b.map((x) => x.id as string)
    if (bIds.some((k) => !aIds.includes(k))) {
      out.push({ path, op: 'set', value: clone(b) })
      return
    }
    const removed = aIds.filter((k) => !bIds.includes(k))
    const parentPath = path.slice(0, -1)
    const key = path[path.length - 1]
    if (removed.length) out.push({ path: [...parentPath, key], op: 'hide', value: removed })
    const kept = aIds.filter((k) => bIds.includes(k))
    if (kept.join() !== bIds.join()) out.push({ path: [...parentPath, key], op: 'order', value: bIds })
    for (const item of b) {
      const before = a.find((x) => x.id === item.id)
      diffInto(before, item, [...path, item.id as string], out)
    }
    return
  }
  if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffInto(a[k], b[k], [...path, k], out)
    return
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, op: 'set', value: clone(b) })
}

const VARIANT_SCOPE = ['blocks', 'theme', 'layout', 'page'] as const

export function diff(base: Doc, edited: Doc): Override[] {
  const out: Override[] = []
  for (const k of VARIANT_SCOPE) diffInto(base[k], edited[k], [k], out)
  return out
}

export function withEdit(doc: Doc, variantId: string | null, edited: Doc): Doc {
  if (!variantId) return { ...edited, variants: doc.variants }
  const variants = doc.variants.map((v): Variant => (v.id === variantId ? { ...v, overrides: diff(doc, edited) } : v))
  return { ...doc, variants }
}
