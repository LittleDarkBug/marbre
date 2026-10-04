import { ADDRESS, BULLET, CONTACT_HEADING, EMAIL, JOB_WORD, NOT_NAME, fixAccents, GITHUB, LINKEDIN, PHONE, POSTCODE_CITY, URL, detectLang, findDates, fold, respace, sectionOf } from './patterns'
import type { Coverage, Line, ParsedContact, ParsedCv, ParsedEntry, ParsedSection, SectionKind, Source } from './types'

const TIMELINE = new Set<SectionKind>(['experience', 'education', 'projects', 'volunteering'])

const words = (s: string) => fold(s).split(' ').filter((w) => w.length > 1)

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 11
}

const upperRatio = (s: string) => {
  const letters = s.replace(/[^\p{L}]/gu, '')
  return letters ? letters.replace(/[^\p{Lu}]/gu, '').length / letters.length : 0
}

type Row = Line & { full: string }

function normalize(lines: Line[]): Row[] {
  return lines
    .map((l) => {
      let text = fixAccents(l.text).replace(/^(?:INFORMATIONS\s+)?PERSONNELLES\s+(?=\p{Lu})/u, '').replace(/\s+/g, ' ').trim()
      let bullet = l.bullet ?? false
      const m = BULLET.exec(text)
      if (m && text.length > m[0].length + 1 && !/^\d{4}/.test(text) && !/^-\s*\d/.test(text)) {
        bullet = true
        text = text.slice(m[0].length)
      }
      const full = [text, ...(l.side ?? [])].join(' · ')
      return { ...l, text, bullet, full }
    })
    .filter((l) => l.text.length > 0)
}

const LABEL = /(?:^|[\s|·•])(?:t[eé]l(?:[eé]phone)?\.?|phone|mobile|portable|cell|e-?mail(?:-id)?|courriel|mail|adresse|address|linkedin|github|site(?: web)?|website|web|portfolio)\s*[:.]\s*/giu
const LABEL_ONLY = /^(?:(?:business|home|school|permanent|current|campus|local)\s+address|telefon[oe]?|tel[eé]fono|handy|correo|e-post|adress?[ae]?|t[eé]l(?:[eé]phone)?\.?|phone|mobile|portable|cell|e-?mail(?:-id)?|courriel|mail|adresse|address|linkedin|github|site(?: web)?|website|web|portfolio|-?id)\s*[:.]?$/iu
const DOB = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/
const STREET = /^[\p{L}\s.'-]+\s\d+[A-Za-z]?$|^\d+[A-Za-z]?,?\s+\p{L}/u

function titleOk(r: Line & { full: string }, name: string) {
  const t = r.text.trim()
  const letters = t.replace(/[^\p{L}]/gu, '').length
  return (
    Boolean(t) &&
    fold(t) !== fold(name) &&
    !sectionOf(t) &&
    !CONTACT_HEADING.test(t) &&
    t.length < 90 &&
    !r.bullet &&
    !EMAIL.test(r.full) &&
    !PHONE.test(r.full) &&
    !URL.test(r.full) &&
    !POSTCODE_CITY.test(r.full) &&
    !ADDRESS.test(t) &&
    !STREET.test(t) &&
    !DOB.test(t) &&
    !/:\s*$/.test(t) &&
    !/^[\p{L} .'-]+,?\s+[A-Z]{2}$/u.test(t) &&
    !/[§#@]/.test(t) &&
    !/X{3}/.test(t) &&
    !/curriculum|\bvit(?:ae|æ)\b|\br[eé]sum[eé]s?\b|\bcv\b|\bsamples?\b/i.test(t) &&
    letters >= t.replace(/\s/g, '').length * 0.7 &&
    letters >= 3 &&
    t.split(' ').length <= 12 &&
    !findDates(t) &&
    !/^[\p{Ll}]/u.test(t) &&
    !/[.]$/.test(t) &&
    (t.split(' ').length <= 7 || JOB_WORD.test(t))
  )
}

function splitNameTitle(text: string): [string, string] | null {
  const ws = text.split(' ')
  for (let k = Math.min(4, ws.length - 1); k >= 2; k--) {
    const n = ws.slice(0, k).join(' ')
    const t = ws.slice(k).join(' ')
    if (looksLikeName(n) && !JOB_WORD.test(n) && !NOT_NAME.test(n) && JOB_WORD.test(t)) return [n, t]
  }
  return null
}

const KEEP_LINKS = new Set<SectionKind>(['projects', 'experience', 'education', 'publications', 'references', 'certifications', 'awards', 'volunteering'])

function takeContacts(rows: Row[], limit: number, headLimit: number, extra: Set<Row>): ParsedContact[] {
  const contacts: ParsedContact[] = []
  const seen = new Set<string>()
  const add = (c: ParsedContact) => {
    const key = `${c.kind}:${c.text.toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      contacts.push(c)
    }
  }
  const heads = rows
    .filter((r) => !r.bullet && r.text.length <= 48 && (sectionOf(r.text, true) || CONTACT_HEADING.test(r.text)))
    .map((r) => ({ r, kind: CONTACT_HEADING.test(r.text) ? null : sectionOf(r.text, true) }))
  const kindAt = (row: Row) => {
    let best: { kind: SectionKind | null; d: number } | null = null
    for (const h of heads) {
      const d = row.y0 - h.r.y0
      if (h.r.page !== row.page || d <= 0 || Math.abs(h.r.x0 - row.x0) > 60) continue
      if (!best || d < best.d) best = { kind: h.kind, d }
    }
    return best?.kind ?? null
  }
  const pure = (r: Row) => {
    let rest = [r.text, ...(r.side ?? [])].join(' ')
    for (const re of [EMAIL, LINKEDIN, GITHUB, URL, PHONE, POSTCODE_CITY]) rest = rest.replace(new RegExp(re.source, `${re.flags.replace('g', '')}g`), ' ')
    return rest !== [r.text, ...(r.side ?? [])].join(' ') && rest.replace(LABEL, ' ').replace(/[^\p{L}\p{N}]/gu, '').length <= 2
  }
  const scan = rows.filter((r, i) => i < headLimit || extra.has(r) || (i < limit && pure(r) && !KEEP_LINKS.has(kindAt(r) ?? 'other')))
  for (const [index, row] of scan.entries()) {
    const parts = [row.text, ...(row.side ?? [])]
    const kept: string[] = []
    for (const part of parts) {
      let rest = part
      const grab = (re: RegExp, kind: ParsedContact['kind'], href?: (v: string) => string) => {
        const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
        rest = rest.replace(g, (v) => {
          const text = v.trim().replace(/[.,;]$/, '')
          if (kind === 'phone' && text.replace(/\D/g, '').length < 9) return v
          add({ kind, text: text.replace(/^https?:\/\/(www\.)?/, ''), href: href?.(text) })
          return ' '
        })
      }
      grab(EMAIL, 'email', (v) => `mailto:${v}`)
      grab(LINKEDIN, 'linkedin', (v) => (v.startsWith('http') ? v : `https://${v}`))
      grab(GITHUB, 'github', (v) => (v.startsWith('http') ? v : `https://${v}`))
      grab(URL, 'website', (v) => (v.startsWith('http') ? v : `https://${v}`))
      grab(PHONE, 'phone', (v) => `tel:${v.replace(/[^\d+]/g, '')}`)
      if (index < headLimit || extra.has(row)) {
        const loc = POSTCODE_CITY.exec(rest)
        if (loc) {
          add({ kind: 'location', text: loc[0].trim() })
          rest = rest.replace(loc[0], ' ')
        }
      }
      if (rest !== part) {
        rest = rest
          .replace(LABEL, ' ')
          .replace(/(?:\s*[|·•,;/]\s*){2,}/g, ' · ')
          .replace(/^[\s|·•,;/:-]+|[\s|·•,;/:-]+$/g, '')
          .replace(/\s+/g, ' ')
      }
      if (LABEL_ONLY.test(rest)) rest = ''
      if (rest && (rest === part || rest.replace(/[^\p{L}\p{N}]/gu, '').length > 2)) kept.push(rest)
    }
    const [first, ...side] = kept
    row.text = first ?? ''
    row.side = side.length ? side : undefined
    row.full = kept.join(' · ')
  }
  return contacts
}

function looksLikeName(s: string) {
  const bare = s.replace(/\s*\([^),]{1,20}\)$/, '').trim()
  const t = bare.split(/\s+/).length >= 2 ? bare : s.trim()
  if (t.length < 3 || t.length > 48 || /\d|@|https?:/.test(t)) return false
  const ws = t.split(/\s+/)
  return ws.length >= 1 && ws.length <= 5 && ws.every((w) => /^[\p{Lu}][\p{L}'’.-]*$/u.test(w) || /^(?:de|du|des|da|di|do|dos|van|von|der|den|la|le|el|al|bin|ben|y|e)$/.test(w)) && /\p{L}{2}/u.test(t)
}

type Sig = { size: number; bold: boolean; upper: boolean }
const sigOf = (r: Row): Sig => ({ size: r.size, bold: r.bold, upper: upperRatio(r.text) > 0.85 })
const sameSig = (a: Sig, b: Sig) => Math.abs(a.size - b.size) <= Math.max(0.6, a.size * 0.06) && a.bold === b.bold && a.upper === b.upper

function isHeading(row: Row, body: number, sigs: Sig[], next?: Row, inside?: SectionKind): SectionKind | 'style' | null {
  const exact = sectionOf(row.text, true)
  if (row.bullet) return null
  if (/:\s*\S/.test(row.text) || findDates(row.text)) return exact
  if (/,\s*\S/.test(row.text)) return exact ?? (upperRatio(row.text) > 0.85 ? sectionOf(row.text) : null)
  const gated = sigs.length > 0
  const fits = !gated || sigs.some((s) => sameSig(s, sigOf(row)))
  const prominent = gated && (row.bold || sigOf(row).upper) && row.size > body * 1.05 && row.size >= Math.min(...sigs.map((g) => g.size)) * 0.8
  const sublabel = (inside === 'skills' || inside === 'languages') && row.size <= body * 1.05
  if (exact && (fits || prominent || (!sublabel && row.text.split(' ').length <= 3))) return exact
  const loose = sectionOf(row.text)
  if (loose && fits) return loose
  if (gated) return fits && sigOf(row).upper && row.text.length <= 40 && !row.side?.length ? 'style' : null
  if (row.heading && row.heading <= 3 && row.text.length <= 48) return 'style'
  if (row.text.length > 40 || row.side?.length) return null
  const up = upperRatio(row.text) > 0.85 && row.text.replace(/[^\p{L}]/gu, '').length >= 4
  const big = row.size >= body * 1.18
  if (up && (row.bold || big) && row.text.split(' ').length <= 5) {
    if (next && next.size >= row.size * 0.98 && next.bold === row.bold && upperRatio(next.text) > 0.85) return null
    return 'style'
  }
  return null
}

const PLACE = /^[\p{Lu}][\p{L} .'-]{1,30}(?:,\s*[\p{Lu}][\p{L} .'-]{1,30}){1,2}$/u

function splitOrg(text: string): { org: string; meta: string } {
  const parts = text.split(/\s*(?:\||·|•|\u2013|\u2014| - )\s*/).filter(Boolean)
  if (parts.length < 2) {
    const comma = text.split(/,\s*/)
    if (comma.length >= 2 && PLACE.test(comma.slice(1).join(', ')) && !JOB_WORD.test(comma.slice(1).join(' '))) return { org: comma[0], meta: comma.slice(1).join(', ') }
    return { org: text, meta: '' }
  }
  const places = parts.filter((p, i) => i > 0 && (PLACE.test(p) || /^(?:remote|t[eé]l[eé]travail|hybride?|on-?site)$/i.test(p)) && !JOB_WORD.test(p))
  const rest = parts.filter((p) => !places.includes(p))
  return { org: rest[0] ?? parts[0], meta: [...rest.slice(1), ...places].join(', ') }
}

function entries(rows: Row[], kind: SectionKind, body: number): { items: ParsedEntry[]; text: string } {
  const items: ParsedEntry[] = []
  let cur: ParsedEntry | null = null
  let headerLines = 0
  let lastField: 'title' | 'subtitle' | 'org' | 'meta' | null = null
  const fresh = (): ParsedEntry => ({ title: '', subtitle: '', org: '', meta: '', dates: '', body: '', bullets: [] })
  const hasContent = (e: ParsedEntry) => e.bullets.length > 0 || e.body.length > 0
  const anchors = rows.filter((r) => !r.bullet && (r.bold || findDates(r.full)) && r.text.length < 110).map((r) => r.x0)
  const left = anchors.length ? median(anchors) : null
  const wrapped = new Set<Row>()
  if (left !== null && !rows.some((r) => r.bullet)) {
    let prevIndented: Row | null = null
    for (const r of rows) {
      const indented = r.x0 > left + 3 && r.x0 < left + 40 && !r.bold && !findDates(r.full) && (r.full.length >= 20 || prevIndented !== null)
      if (!indented) {
        prevIndented = null
        continue
      }
      if (prevIndented && !hasEnd(prevIndented.full) && Math.abs(r.x0 - prevIndented.x0) < 2) wrapped.add(r)
      else r.bullet = true
      prevIndented = r
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const text = row.full
    const date = findDates(text)
    const next = rows[i + 1]
    const nextDate = next ? findDates(next.full) : null
    const last = cur?.bullets[cur.bullets.length - 1]
    if (last !== undefined && wrapped.has(row)) {
      cur!.bullets[cur!.bullets.length - 1] = `${last} ${text}`
      continue
    }
    if (last !== undefined && !row.bullet && rows[i - 1]?.bullet && !row.bold && !date && /^[\p{Ll}(]/u.test(text) && !hasEnd(last)) {
      cur!.bullets[cur!.bullets.length - 1] = `${last} ${text}`
      continue
    }
    const headerish = !row.bullet && text.length < 110 && (row.bold || Boolean(date) || (row.size > body * 1.05) || (Boolean(nextDate) && !next?.bullet && text.length < 80))
    const above = rows[i - 1]
    const glued =
      cur !== null && lastField !== null && !hasContent(cur) && above !== undefined && !date && !row.bullet && text.length < 60 &&
      above.bold === row.bold && above.italic === row.italic && Math.abs(above.size - row.size) < 0.3 && Math.abs(above.x0 - row.x0) < 2 &&
      row.y0 - above.y0 > 0 && row.y0 - above.y0 < row.size * 1.45 && !hasEnd(above.full) && !findDates(above.full) && lastField !== 'title'
    if (glued && cur && lastField) {
      cur[lastField] = `${cur[lastField]} ${text}`
      continue
    }
    const startNew = !cur || (headerish && (hasContent(cur) || (cur.dates !== '' && Boolean(date) && headerLines >= 1) || (row.bold && cur.title !== '' && cur.org !== '' && (cur.dates !== '' || headerLines >= 3))))
    if (startNew && (headerish || !cur)) {
      if (cur) items.push(cur)
      cur = fresh()
      headerLines = 0
      lastField = null
    }
    const e = cur!
    if (headerish && !hasContent(e)) {
      headerLines++
      let rest = text
      if (date && !e.dates) {
        e.dates = date.dates
        rest = date.rest
      }
      if (!rest) continue
      if (!e.title) {
        e.title = rest
        lastField = 'title'
      } else if (row.italic && !e.subtitle) {
        e.subtitle = rest
        lastField = 'subtitle'
      } else if (!e.org) {
        const split = splitOrg(rest)
        e.org = split.org
        e.meta = split.meta
        lastField = split.meta ? 'meta' : 'org'
      } else {
        e.meta = e.meta ? `${e.meta}, ${rest}` : rest
        lastField = 'meta'
      }
      continue
    }
    if (row.bullet) {
      e.bullets.push(text)
      continue
    }
    const prev = rows[i - 1]
    if (e.bullets.length && prev && (prev.bullet || (e.bullets.length && !hasEnd(e.bullets[e.bullets.length - 1]))) && (/^[\p{Ll}(]/u.test(text) || !hasEnd(e.bullets[e.bullets.length - 1]))) {
      e.bullets[e.bullets.length - 1] += ` ${text}`
      continue
    }
    if (!e.title && text.length < 90) {
      e.title = date ? date.rest : text
      if (date && !e.dates) e.dates = date.dates
      continue
    }
    if (!e.org && text.length < 70 && !e.body && !e.bullets.length && kind !== 'projects') {
      const split = splitOrg(date ? date.rest : text)
      e.org = split.org
      e.meta = split.meta
      if (date && !e.dates) e.dates = date.dates
      continue
    }
    e.body = e.body ? `${e.body} ${text}` : text
  }
  if (cur) items.push(cur)
  const clean = items.filter((e) => e.title || e.org || e.body || e.bullets.length)
  return { items: clean, text: '' }
}

const hasEnd = (s: string) => /[.!?;:)]$/.test(s.trim())

function skills(rows: Row[]): ParsedSection['groups'] {
  const groups: ParsedSection['groups'] = []
  let pendingLabel = ''
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const m = /^([^:]{2,40})\s*:\s*(.+)$/.exec(row.full)
    if (m) {
      groups.push({ label: m[1].trim(), items: m[2].trim() })
      pendingLabel = ''
      continue
    }
    const next = rows[i + 1]
    if (!row.bullet && row.bold && row.text.length < 40 && next && !next.bold) {
      pendingLabel = row.text
      continue
    }
    const items = row.full.replace(/\s*[|·•;]\s*/g, ', ')
    if (pendingLabel) {
      const g = groups.find((x) => x.label === pendingLabel)
      if (g) g.items += `, ${items}`
      else groups.push({ label: pendingLabel, items })
      continue
    }
    const last = groups[groups.length - 1]
    if (last && last.label === '') last.items += `, ${items}`
    else groups.push({ label: '', items })
  }
  return groups.map((g) => ({ ...g, items: g.items.replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '') }))
}

const LEVEL = /\b(?:natif|native|maternelle|mother tongue|bilingue|bilingual|courant|fluent|professional|professionnel|interm[eé]diaire|intermediate|notions|basic|d[eé]butant|beginner|scolaire|lu,? [eé]crit,? parl[eé]|[ABC][12])\b/i

function pairs(rows: Row[]): ParsedSection['pairs'] {
  const out: ParsedSection['pairs'] = []
  for (const row of rows) {
    const halves = row.full.split(/\s+[|·•]\s+/)
    const leveled = halves.length === 2 && (LEVEL.test(halves[1]) || /^[\p{Ll}\d(]/u.test(halves[1]) || halves[1].length <= 3)
    const chunks = leveled ? [`${halves[0]}: ${halves[1]}`] : row.full.split(/\s*[;|·•]\s*|,\s+(?=\p{Lu})/u).filter(Boolean)
    for (const chunk of chunks) {
      const m = /^(.{1,40}?)\s*(?::|\s[-–—]\s|\()\s*(.+?)\)?$/.exec(chunk)
      if (m) out.push({ key: m[1].trim(), value: m[2].trim() })
      else {
        const lvl = LEVEL.exec(chunk)
        if (lvl && lvl.index > 0) out.push({ key: chunk.slice(0, lvl.index).replace(/[\s,-]+$/, ''), value: chunk.slice(lvl.index).trim() })
        else out.push({ key: chunk.trim(), value: '' })
      }
    }
  }
  return out
}

export function parse(source: Source): ParsedCv {
  const rows = normalize(source.lines)
  const body = median(rows.filter((r) => r.text.length > 30).map((r) => r.size)) || 11
  const lang = detectLang(source.raw || rows.map((r) => r.text).join(' '))

  const firstHeading = rows.findIndex((r) => sectionOf(r.text, true))
  const headLimit = firstHeading < 0 ? 12 : Math.min(firstHeading, 16)
  const contactRows = new Set<Row>()
  const contactHeads = new Set<Row>()
  rows.forEach((r, i) => {
    if (!CONTACT_HEADING.test(r.text)) return
    contactHeads.add(r)
    for (const n of rows.slice(i + 1, i + 10)) {
      if (sectionOf(n.text, true) || CONTACT_HEADING.test(n.text)) break
      contactRows.add(n)
    }
  })
  const contacts = takeContacts(rows, Math.max(18, Math.ceil(rows.length * 0.2)), headLimit, contactRows)
  const firstPage = rows.filter((r) => r.page === 1)
  const startPage = firstPage.length >= 6 ? 1 : (rows.find((r) => rows.filter((o) => o.page === r.page).length >= 6)?.page ?? 1)
  const head = rows.filter((r) => r.page === startPage).slice(0, 18)
  const used = new Set<Row>(contactHeads)
  let name = ''
  let title = ''
  let nameRow: Row | undefined
  const nameish = (r: Row) => looksLikeName(r.text) && !ADDRESS.test(r.text) && !sectionOf(r.text) && !CONTACT_HEADING.test(r.text) && !JOB_WORD.test(r.text) && !NOT_NAME.test(r.text) && !EMAIL.test(r.full)
  const partner = (base: Row) => {
    const close = (r: Row) => r !== base && !used.has(r) && r.page === base.page && nameish(r) && Math.abs(r.y0 - base.y0) < base.size * 2.2 && r.size >= base.size * 0.6 && (Math.abs(r.x0 - base.x0) < 8 || Math.abs(r.x0 + r.x1 - base.x0 - base.x1) < 16 || Math.abs(r.y0 - base.y0) < 3)
    return head.filter(close).filter((r) => base.text.split(' ').length === 1 || r.text.split(' ').length === 1).sort((a, b) => Math.abs(a.y0 - base.y0) - Math.abs(b.y0 - base.y0))[0]
  }
  const ranked = head.filter(nameish).sort((a, b) => b.size - a.size)
  for (const r of ranked) {
    if (r.text.split(' ').length >= 2) {
      nameRow = r
      name = r.text
      break
    }
    const mate = partner(r)
    if (mate) {
      nameRow = r
      used.add(mate)
      name = mate.y0 < r.y0 - 3 || (Math.abs(mate.y0 - r.y0) <= 3 && mate.x0 < r.x0) ? `${mate.text} ${r.text}` : `${r.text} ${mate.text}`
      break
    }
  }
  if (!nameRow) {
    for (const r of head.slice(0, 8)) {
      const split = r.size >= body * 0.95 ? splitNameTitle(r.text) : null
      if (split) {
        ;[name, title] = split
        nameRow = r
        break
      }
    }
  }
  if (nameRow) {
    used.add(nameRow)
    if (!title) {
      const idx = rows.indexOf(nameRow)
      const inHead = (r: Row) => firstHeading < 0 || rows.indexOf(r) < firstHeading
      const after = rows.slice(idx + 1, idx + 5).filter((r) => !used.has(r))
      const before = rows.slice(Math.max(0, idx - 3), idx).filter((r) => !used.has(r))
      const cand = after.find((r) => titleOk(r, name) && inHead(r)) ?? before.find((r) => titleOk(r, name) && JOB_WORD.test(r.text))
      if (cand) {
        title = cand.text
        used.add(cand)
      }
    }
  }

  const sections: ParsedSection[] = []
  const highlights: string[] = []
  let current: { kind: SectionKind; heading: string; rows: Row[] } | null = null
  const preface: Row[] = []
  const flush = () => {
    if (!current) return
    sections.push(build(current.kind, current.heading, current.rows, body))
  }
  const sigs: Sig[] = []
  for (const r of rows) {
    if (r.bullet || !sectionOf(r.text, true)) continue
    const sig = sigOf(r)
    if (!sigs.some((s) => sameSig(s, sig)) && rows.filter((o) => sectionOf(o.text, true) && sameSig(sig, sigOf(o))).length >= 2) sigs.push(sig)
  }
  const standout = sigs.filter((g) => g.upper || g.size > body * 1.05)
  if (standout.length && standout.length < sigs.length) sigs.splice(0, sigs.length, ...standout)
  const wraps = (row: Row, n?: Row): n is Row =>
    Boolean(n && !used.has(n) && n.page === row.page && sameSig(sigOf(n), sigOf(row)) && upperRatio(row.text) > 0.85 && (Math.abs(n.x0 - row.x0) < 4 || Math.abs(n.x1 - row.x1) < 4) && n.y0 - row.y0 < row.size * 2 && n.text.length < 30 && !sectionOf(n.text, true))
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (used.has(row) || !row.full.trim()) continue
    const heading = isHeading(row, body, sigs, rows[i + 1], current?.kind)
    if (heading) {
      flush()
      let text = row.text.replace(/\s*:$/, '')
      while (wraps(row, rows[i + 1])) {
        i++
        text += ` ${rows[i].text}`
      }
      const known = heading === 'style' ? sectionOf(text) : heading
      current = { kind: known ?? guessKind(rows.slice(i + 1, i + 8)), heading: respace(text), rows: [] }
      continue
    }
    if (current) current.rows.push(row)
    else preface.push(row)
  }
  flush()

  if (preface.length) {
    const prose = preface.filter((r) => r.text.length > 50 || /[.!?]$/.test(r.text))
    const rest = preface.filter((r) => !prose.includes(r))
    const hasProfile = sections.some((s) => s.kind === 'profile')
    if (prose.length && !hasProfile && prose.reduce((n, r) => n + r.text.length, 0) > 120) sections.unshift(build('profile', lang === 'fr' ? 'Profil' : 'Profile', prose, body))
    else rest.unshift(...prose)
    if (!title) {
      const t = rest.find((r) => titleOk(r, name))
      if (t) {
        title = t.text
        rest.splice(rest.indexOf(t), 1)
      }
    }
    const short = rest.filter((r) => r.full.length <= 60 && !findDates(r.full))
    if (short.length && short.length === rest.length && short.length <= 6) {
      highlights.push(...short.flatMap((r) => r.full.split(/\s*[·|•]\s*/)).filter((h) => h.length > 1).slice(0, 6))
    } else if (rest.length) sections.unshift(build('other', '', rest, body))
  }

  const merged: ParsedSection[] = []
  for (const s of sections) {
    const prev = merged.find((m) => m.kind === s.kind && s.kind !== 'other' && m.heading === s.heading)
    if (prev) {
      prev.entries.push(...s.entries)
      prev.pairs.push(...s.pairs)
      prev.groups.push(...s.groups)
      prev.text = [prev.text, s.text].filter(Boolean).join('\n')
    } else merged.push(s)
  }

  const photo = [...source.images].filter((im) => im.w / im.h > 0.55 && im.w / im.h < 1.6).sort((a, b) => b.w * b.h - a.w * a.h)[0]
  const cv: ParsedCv = { lang, name, title, contacts, highlights, sections: merged.filter((s) => s.entries.length || s.pairs.length || s.groups.length || s.text), photo, leftovers: [] }
  cv.leftovers = leftovers(source, cv)
  return cv
}

function guessKind(rows: Row[]): SectionKind {
  const text = rows.map((r) => r.full).join(' ')
  const dates = rows.filter((r) => findDates(r.full)).length
  if (dates >= 1 && /(?:master|licence|bachelor|dipl|universit|école|ecole|school|bts|dut|mba|bac\b|phd|doctorat)/i.test(text)) return 'education'
  if (dates >= 1) return 'experience'
  if (LEVEL.test(text) && rows.length <= 6) return 'languages'
  if ((text.match(/,/g)?.length ?? 0) >= 4 || rows.every((r) => r.text.length < 60)) return 'skills'
  return 'other'
}

function build(kind: SectionKind, heading: string, rows: Row[], body: number): ParsedSection {
  const s: ParsedSection = { kind, heading, entries: [], pairs: [], groups: [], text: '' }
  if (!rows.length) return s
  if (TIMELINE.has(kind)) {
    const e = entries(rows, kind, body)
    s.entries = e.items
  } else if (kind === 'skills') s.groups = skills(rows)
  else if (kind === 'languages' || kind === 'certifications' || kind === 'awards' || kind === 'references') s.pairs = pairs(rows)
  else {
    const out: string[] = []
    for (const r of rows) {
      if (out.length && !r.bullet && !hasEnd(out[out.length - 1]) && /^[\p{Ll}]/u.test(r.text)) out[out.length - 1] += ` ${r.full}`
      else out.push(r.full)
    }
    s.text = out.join('\n')
  }
  return s
}

export function cvText(cv: ParsedCv) {
  const parts: string[] = [cv.name, cv.title, ...cv.contacts.map((c) => c.text), ...(cv.highlights ?? [])]
  for (const s of cv.sections) {
    parts.push(s.heading, s.text)
    for (const e of s.entries) parts.push(e.title, e.subtitle, e.org, e.meta, e.dates, e.body, ...e.bullets)
    for (const p of s.pairs) parts.push(p.key, p.value)
    for (const g of s.groups) parts.push(g.label, g.items)
  }
  parts.push(...cv.leftovers)
  return parts.filter(Boolean).join(' ')
}

export function coverage(source: Source, cv: ParsedCv): Coverage {
  const src = words(fixAccents(source.lines.map((l) => [l.text, ...(l.side ?? [])].join(' ')).join(' ')))
  const have = new Map<string, number>()
  for (const w of words(cvText(cv))) have.set(w, (have.get(w) ?? 0) + 1)
  const missing: string[] = []
  let found = 0
  for (const w of src) {
    const n = have.get(w) ?? 0
    if (n > 0) {
      have.set(w, n - 1)
      found++
    } else missing.push(w)
  }
  return { ratio: src.length ? found / src.length : 1, missing, total: src.length }
}

function leftovers(source: Source, cv: ParsedCv): string[] {
  const have = new Set(words(cvText({ ...cv, leftovers: [] })))
  const out: string[] = []
  for (const l of source.lines) {
    const full = fixAccents([l.text, ...(l.side ?? [])].join(' ').trim())
    const ws = words(full)
    if (!ws.length) continue
    const lost = ws.filter((w) => !have.has(w))
    if (lost.length / ws.length > 0.5 && !/^[\W\d\s]+$/.test(full) && !CONTACT_HEADING.test(full.trim())) out.push(full)
  }
  return out
}
