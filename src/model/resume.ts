import { blankDoc, newBlock } from './factories'
import { uid } from './ids'
import { escape, plain } from './rich'
import type { Block, Doc, EntriesBlock, IdentityBlock, PairsBlock, SkillsBlock, TextBlock } from './schema'

type Lang = 'fr' | 'en'
type R = Record<string, unknown>

const MONTHS: Record<Lang, string[]> = {
  fr: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  en: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const arr = (v: unknown) => (Array.isArray(v) ? (v as R[]) : [])

export function formatDate(iso: string, lang: Lang) {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(iso)
  if (!m) return iso
  return m[2] ? `${MONTHS[lang][Number(m[2]) - 1]} ${m[1]}` : m[1]
}

export function formatRange(start: string, end: string, lang: Lang) {
  const a = start ? formatDate(start, lang) : ''
  const b = end ? formatDate(end, lang) : start ? (lang === 'fr' ? "Aujourd'hui" : 'Present') : ''
  return [a, b].filter(Boolean).join(' – ')
}

const labels = {
  fr: { profile: 'Profil', work: 'Expériences', education: 'Formation', projects: 'Projets', skills: 'Compétences', languages: 'Langues', awards: 'Distinctions' },
  en: { profile: 'Profile', work: 'Experience', education: 'Education', projects: 'Projects', skills: 'Skills', languages: 'Languages', awards: 'Awards' },
}

export function fromJsonResume(input: unknown, lang: Lang = 'en'): Doc {
  const r = (input ?? {}) as R
  const basics = (r.basics ?? {}) as R
  const loc = (basics.location ?? {}) as R
  const L = labels[lang]
  const doc = blankDoc(str(basics.name) || 'CV', lang)
  const identity: IdentityBlock = {
    ...(newBlock('identity') as IdentityBlock),
    name: str(basics.name),
    title: str(basics.label),
    contacts: [
      basics.phone ? { id: uid('k'), kind: 'phone' as const, text: str(basics.phone), href: `tel:${str(basics.phone).replace(/\s/g, '')}` } : null,
      basics.email ? { id: uid('k'), kind: 'email' as const, text: str(basics.email), href: `mailto:${str(basics.email)}` } : null,
      loc.city ? { id: uid('k'), kind: 'location' as const, text: [str(loc.city), str(loc.countryCode)].filter(Boolean).join(', ') } : null,
      basics.url ? { id: uid('k'), kind: 'website' as const, text: str(basics.url).replace(/^https?:\/\//, ''), href: str(basics.url) } : null,
      ...arr(basics.profiles).map((p) => {
        const network = str(p.network).toLowerCase()
        const kind = network === 'linkedin' ? 'linkedin' : network === 'github' ? 'github' : 'website'
        return { id: uid('k'), kind: kind as 'linkedin' | 'github' | 'website', text: str(p.url).replace(/^https?:\/\/(www\.)?/, '') || str(p.username), href: str(p.url) || undefined }
      }),
    ].filter((c) => c !== null),
  }
  const blocks: Block[] = [identity]
  if (basics.summary) blocks.push({ ...(newBlock('text', L.profile) as TextBlock), body: escape(str(basics.summary)) })
  const entries = (heading: string, kind: EntriesBlock['kind'], items: R[], map: (x: R) => Partial<EntriesBlock['items'][number]>) => {
    if (!items.length) return
    blocks.push({
      ...(newBlock('entries', heading) as EntriesBlock),
      kind,
      items: items.map((x) => {
        const e = map(x)
        return { id: uid('e'), title: '', subtitle: '', org: '', meta: '', dates: '', tags: '', body: '', ...e, bullets: arr(x.highlights).map((h) => ({ id: uid('u'), text: escape(String(h)) })) }
      }),
    })
  }
  entries(L.work, 'experience', arr(r.work), (w) => ({
    title: escape(str(w.position)),
    org: escape(str(w.name)),
    meta: escape(str(w.location)),
    dates: formatRange(str(w.startDate), str(w.endDate), lang),
    body: escape(str(w.summary)),
  }))
  entries(L.education, 'education', arr(r.education), (e) => ({
    title: escape([str(e.studyType), str(e.area)].filter(Boolean).join(' ')),
    org: escape(str(e.institution)),
    dates: formatRange(str(e.startDate), str(e.endDate), lang),
  }))
  entries(L.projects, 'project', arr(r.projects), (p) => ({
    title: escape(str(p.name)),
    tags: arr(p.keywords).map(String).join(', '),
    body: escape(str(p.description)),
  }))
  const skills = arr(r.skills)
  if (skills.length) {
    blocks.push({
      ...(newBlock('skills', L.skills) as SkillsBlock),
      groups: skills.map((s) => ({ id: uid('g'), label: str(s.name), items: arr(s.keywords).map(String).join(', ') })),
    })
  }
  const pairs = (heading: string, items: R[], map: (x: R) => [string, string]) => {
    if (!items.length) return
    blocks.push({ ...(newBlock('pairs', heading) as PairsBlock), items: items.map((x) => { const [key, value] = map(x); return { id: uid('p'), key: escape(key), value: escape(value) } }) })
  }
  pairs(L.awards, arr(r.awards), (a) => [str(a.title), [str(a.awarder), str(a.date).slice(0, 4)].filter(Boolean).join(', ')])
  pairs(L.languages, arr(r.languages), (l) => [str(l.language), str(l.fluency)])
  doc.blocks = blocks
  doc.layout.columns = [{ ...doc.layout.columns[0], blocks: blocks.map((b) => b.id) }]
  return doc
}

export function toJsonResume(doc: Doc): R {
  const identity = doc.blocks.find((b): b is IdentityBlock => b.type === 'identity')
  const contact = (kind: string) => identity?.contacts.find((c) => c.kind === kind)
  const entries = (kind: EntriesBlock['kind']) => doc.blocks.filter((b): b is EntriesBlock => b.type === 'entries' && b.kind === kind).flatMap((b) => b.items)
  const summary = doc.blocks.find((b): b is TextBlock => b.type === 'text')
  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: identity?.name ?? '',
      label: identity?.title ?? '',
      email: contact('email')?.text ?? '',
      phone: contact('phone')?.text ?? '',
      url: contact('website')?.href ?? '',
      summary: summary ? plain(summary.body) : '',
      location: { city: contact('location')?.text ?? '' },
      profiles: (identity?.contacts ?? []).filter((c) => c.kind === 'linkedin' || c.kind === 'github').map((c) => ({ network: c.kind === 'linkedin' ? 'LinkedIn' : 'GitHub', url: c.href ?? `https://${c.text}` })),
    },
    work: entries('experience').map((e) => ({ name: plain(e.org), position: plain(e.title), location: plain(e.meta), summary: plain(e.body), highlights: e.bullets.map((b) => plain(b.text)), dateRange: e.dates })),
    education: entries('education').map((e) => ({ institution: plain(e.org), studyType: plain(e.title), area: plain(e.subtitle), dateRange: e.dates })),
    projects: entries('project').map((e) => ({ name: plain(e.title), description: plain(e.body), keywords: e.tags.split(',').map((t) => t.trim()).filter(Boolean) })),
    skills: doc.blocks.filter((b): b is SkillsBlock => b.type === 'skills').flatMap((b) => b.groups.map((g) => ({ name: g.label, keywords: g.items.split(',').map((t) => t.trim()).filter(Boolean) }))),
  }
}
