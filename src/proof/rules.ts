import { plain } from '../model/rich'
import type { Block, Doc } from '../model/schema'

export type TextField = { path: string[]; value: string; rich: boolean }
export type ProofCode = 'forbidden' | 'emoji' | 'spacing' | 'double' | 'parentheses'
export type ProofIssue = { code: ProofCode; path: string[]; excerpt: string; params?: Record<string, string | number> }

const RICH = new Set(['body', 'title', 'subtitle', 'org', 'meta', 'text', 'key', 'value'])

export function fields(doc: Doc): TextField[] {
  const out: TextField[] = []
  const push = (path: string[], value: string, rich: boolean) => value && out.push({ path, value, rich })
  const each = (b: Block) => {
    const p = ['blocks', b.id]
    if (b.hidden) return
    push([...p, 'heading'], b.heading, false)
    switch (b.type) {
      case 'identity':
        push([...p, 'name'], b.name, false)
        push([...p, 'title'], b.title, false)
        b.highlights.forEach((h) => push([...p, 'highlights', h.id, 'text'], h.text, false))
        b.contacts.forEach((c) => push([...p, 'contacts', c.id, 'text'], c.text, false))
        break
      case 'text':
        push([...p, 'body'], b.body, true)
        break
      case 'entries':
        for (const e of b.items) {
          for (const k of ['title', 'subtitle', 'org', 'meta', 'body'] as const) push([...p, 'items', e.id, k], e[k], RICH.has(k))
          push([...p, 'items', e.id, 'dates'], e.dates, false)
          push([...p, 'items', e.id, 'tags'], e.tags, false)
          e.bullets.forEach((u) => push([...p, 'items', e.id, 'bullets', u.id, 'text'], u.text, true))
        }
        break
      case 'skills':
        b.groups.forEach((g) => {
          push([...p, 'groups', g.id, 'label'], g.label, false)
          push([...p, 'groups', g.id, 'items'], g.items, false)
        })
        break
      case 'pairs':
        b.items.forEach((x) => {
          push([...p, 'items', x.id, 'key'], x.key, true)
          push([...p, 'items', x.id, 'value'], x.value, true)
        })
    }
  }
  doc.blocks.forEach(each)
  return out
}

const NBSP = String.fromCharCode(160)
const EMOJI = /\p{Extended_Pictographic}/u
const excerpt = (text: string, at: number) => text.slice(Math.max(0, at - 18), at + 18).replace(/\s+/g, ' ')

export function proofread(doc: Doc): ProofIssue[] {
  const issues: ProofIssue[] = []
  const forbidden = doc.rules.forbidden.filter(Boolean)
  for (const f of fields(doc)) {
    const text = plain(f.value)
    for (const word of forbidden) {
      const at = text.indexOf(word)
      if (at >= 0) issues.push({ code: 'forbidden', path: f.path, excerpt: excerpt(text, at), params: { word } })
    }
    const emoji = text.search(EMOJI)
    if (emoji >= 0) issues.push({ code: 'emoji', path: f.path, excerpt: excerpt(text, emoji) })
    if (doc.lang === 'fr' && doc.rules.frenchSpacing) {
      const m = /(\S)( ?)([:;?!])(?=\s|$)/.exec(text.replace(/https?:\/\/\S+/g, ''))
      if (m && m[2] !== ' ' && m[2] !== ' ') issues.push({ code: 'spacing', path: f.path, excerpt: excerpt(text, m.index), params: { mark: m[3] } })
    }
    const dbl = text.search(/ {2,}/)
    if (dbl >= 0) issues.push({ code: 'double', path: f.path, excerpt: excerpt(text, dbl) })
  }
  const parens = fields(doc).reduce((n, f) => n + (plain(f.value).match(/\(/g)?.length ?? 0), 0)
  if (parens > doc.rules.maxParentheses) issues.push({ code: 'parentheses', path: [], excerpt: '', params: { n: parens, max: doc.rules.maxParentheses } })
  return issues
}

export function fixText(value: string, lang: string) {
  let out = value.split('&nbsp;').join(NBSP).replace(/ {2,}/g, ' ')
  if (lang === 'fr') out = out.replace(/(\S) ?([:;?!])(?=\s|<|$)/g, (m, a: string, mark: string) => (/https?$/.test(a) ? m : `${a}${NBSP}${mark}`))
  return out
}

export function keywordCoverage(doc: Doc, keywords: string[]) {
  const text = fields(doc).map((f) => plain(f.value)).join(' ').toLocaleLowerCase(doc.lang)
  return keywords.filter(Boolean).map((k) => ({ keyword: k, found: text.includes(k.toLocaleLowerCase(doc.lang)) }))
}
