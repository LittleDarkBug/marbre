import type { Key } from '../i18n'
import type { Doc, Theme } from '../model/schema'
import { sampleDoc } from './sample'

type Lang = 'fr' | 'en'
export type Template = { id: string; name: Key; desc: Key; make: (lang: Lang) => Doc }

const single = (doc: Doc, order: string[]) => {
  doc.layout.columns = [{ id: 'main', width: 1, unit: 'fr', panel: false, blocks: order }]
  return doc
}

const themed = (doc: Doc, patch: Partial<Theme>) => {
  doc.theme = { ...doc.theme, ...patch }
  return doc
}

const ORDER = ['id', 'profile', 'xp', 'skills', 'edu', 'proj', 'langs']

export const TEMPLATES: Template[] = [
  {
    id: 'signal',
    name: 'tpl.signal',
    desc: 'tpl.signal.desc',
    make: (lang) => sampleDoc(lang),
  },
  {
    id: 'colonne',
    name: 'tpl.colonne',
    desc: 'tpl.colonne.desc',
    make: (lang) => {
      const doc = single(sampleDoc(lang), ORDER)
      doc.page.margin = { top: 9, right: 13, bottom: 9, left: 13 }
      return themed(doc, {
        size: { name: 26, title: 15, heading: 15, body: 13.5, small: 12 },
        leading: 1.35,
        spacing: { section: 10, item: 6, line: 1 },
        nameCase: 'none',
        identity: 'inline',
        entry: 'split',
        skills: 'inline',
        pairs: 'inline',
        colors: { ...doc.theme.colors, highlight: '#ffffff' },
        rule: 'under-identity',
      })
    },
  },
  {
    id: 'suisse',
    name: 'tpl.suisse',
    desc: 'tpl.suisse.desc',
    make: (lang) => {
      const doc = single(sampleDoc(lang), ORDER)
      doc.page.margin = { top: 14, right: 14, bottom: 12, left: 14 }
      return themed(doc, {
        fonts: { display: 'Archivo', heading: 'Archivo', body: 'Archivo', accent: 'Archivo' },
        colors: { ink: '#111111', accent: '#d0261d', paper: '#ffffff', panel: '#f2f2f2', highlight: '#ffffff' },
        size: { name: 44, title: 15, heading: 13, body: 12.6, small: 12 },
        weight: { body: 400, strong: 700 },
        leading: 1.42,
        spacing: { section: 16, item: 9, line: 1 },
        headingCase: 'none',
        nameCase: 'none',
        rule: 'under-headings',
        identity: 'stacked',
        skills: 'block',
      })
    },
  },
  {
    id: 'editorial',
    name: 'tpl.editorial',
    desc: 'tpl.editorial.desc',
    make: (lang) => {
      const doc = single(sampleDoc(lang), ORDER)
      doc.page.margin = { top: 16, right: 22, bottom: 14, left: 22 }
      return themed(doc, {
        fonts: { display: 'Source Serif 4', heading: 'Source Serif 4', body: 'Source Serif 4', accent: 'Source Sans 3' },
        colors: { ink: '#1b1a17', accent: '#7a2e1f', paper: '#ffffff', panel: '#f4efe6', highlight: '#ffffff' },
        size: { name: 34, title: 15, heading: 14, body: 12.8, small: 12 },
        weight: { body: 400, strong: 700 },
        leading: 1.45,
        spacing: { section: 14, item: 8, line: 1 },
        headingCase: 'none',
        nameCase: 'none',
        rule: 'under-headings',
        identity: 'stacked',
        skills: 'inline',
        pairs: 'inline',
      })
    },
  },
  {
    id: 'technique',
    name: 'tpl.technique',
    desc: 'tpl.technique.desc',
    make: (lang) => {
      const doc = sampleDoc(lang)
      doc.layout.columns = [
        { id: 'main', width: 1, unit: 'fr', panel: false, blocks: ['id', 'profile', 'xp', 'proj', 'edu'] },
        { id: 'side', width: 58, unit: 'mm', panel: false, blocks: ['skills', 'langs'] },
      ]
      doc.layout.gutter = 16
      doc.page.margin = { top: 13, right: 12, bottom: 11, left: 13 }
      return themed(doc, {
        fonts: { display: 'IBM Plex Mono', heading: 'IBM Plex Mono', body: 'IBM Plex Sans', accent: 'IBM Plex Mono' },
        colors: { ink: '#161616', accent: '#3d6b2f', paper: '#ffffff', panel: '#f4f4f4', highlight: '#eef2ea' },
        size: { name: 28, title: 14, heading: 12.5, body: 12.4, small: 12 },
        weight: { body: 400, strong: 600 },
        leading: 1.42,
        spacing: { section: 13, item: 7, line: 1 },
        headingCase: 'upper',
        nameCase: 'none',
        rule: 'under-headings',
        identity: 'stacked',
      })
    },
  },
]

const SILHOUETTE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#d9d4cc"/><circle cx="100" cy="78" r="38" fill="#b9b1a5"/><path d="M28 200c6-48 38-74 72-74s66 26 72 74z" fill="#b9b1a5"/></svg>')

const photo = (lang: 'fr' | 'en', shape: 'circle' | 'rounded' | 'rect'): Doc['blocks'][number] => ({
  id: 'photo', type: 'photo', heading: '', hidden: false, style: {}, src: SILHOUETTE, alt: lang === 'fr' ? 'Photo de profil' : 'Profile photo',
  shape, focusX: 50, focusY: 50, zoom: 1, grayscale: false, ratio: 1,
})

const levels = (lang: 'fr' | 'en', display: 'dots' | 'bar'): Doc['blocks'][number] => ({
  id: 'langs', type: 'rating', heading: lang === 'fr' ? 'Langues' : 'Languages', hidden: false, style: {}, display, max: 5,
  items: [{ id: 'l1', label: lang === 'fr' ? 'Français' : 'French', level: 5 }, { id: 'l2', label: lang === 'fr' ? 'Anglais' : 'English', level: 4 }, { id: 'l3', label: lang === 'fr' ? 'Espagnol' : 'Spanish', level: 2 }],
})

TEMPLATES.push(
  {
    id: 'portrait',
    name: 'tpl.portrait',
    desc: 'tpl.portrait.desc',
    make: (lang) => {
      const doc = sampleDoc(lang)
      const light = { color: '#f3eee7', accent: '#e2b36a' }
      doc.blocks = [photo(lang, 'circle'), ...doc.blocks.filter((b) => b.id !== 'langs'), levels(lang, 'dots')].map((b) =>
        ['photo', 'skills', 'edu', 'langs'].includes(b.id) ? { ...b, style: { ...b.style, ...light } } : b,
      )
      doc.layout.columns = [
        { id: 'side', width: 66, unit: 'mm', panel: true, blocks: ['photo', 'skills', 'edu', 'langs'] },
        { id: 'main', width: 1, unit: 'fr', panel: false, blocks: ['id', 'profile', 'xp', 'proj'] },
      ]
      doc.layout.gutter = 12
      return themed(doc, {
        fonts: { display: 'Fira Sans', heading: 'Fira Sans', body: 'Fira Sans', accent: 'Fira Sans' },
        colors: { ink: '#1f1b17', accent: '#a5622b', paper: '#ffffff', panel: '#2b2622', highlight: '#f5ede3' },
        size: { name: 32, title: 15, heading: 13.5, body: 12.4, small: 12 },
        weight: { body: 400, strong: 600 },
        leading: 1.42,
        spacing: { section: 14, item: 7, line: 1 },
        headingCase: 'upper',
        nameCase: 'none',
        rule: 'none',
      })
    },
  },
  {
    id: 'affiche',
    name: 'tpl.affiche',
    desc: 'tpl.affiche.desc',
    make: (lang) => {
      const doc = sampleDoc(lang)
      doc.blocks = [...doc.blocks.filter((b) => b.id !== 'langs'), photo(lang, 'rounded'), levels(lang, 'bar')]
      const f = (x: number, y: number, w: number, h: number) => ({ x, y, w, h, rotate: 0, z: 1, locked: false })
      doc.layout.mode = 'free'
      doc.layout.columns = [{ id: 'main', width: 1, unit: 'fr', panel: false, blocks: [] }]
      doc.layout.frames = {
        id: f(22, 14, 118, 40),
        photo: f(152, 14, 42, 42),
        profile: f(22, 64, 172, 20),
        xp: f(22, 94, 112, 60),
        proj: f(22, 162, 112, 24),
        skills: f(144, 94, 50, 50),
        edu: f(144, 150, 50, 36),
        langs: f(144, 194, 50, 24),
      }
      doc.layout.order = ['id', 'profile', 'xp', 'proj', 'skills', 'edu', 'langs', 'photo']
      doc.layout.decor = [
        { id: 'band', kind: 'rect', frame: { x: 0, y: 0, w: 10, h: 297, rotate: 0, z: 0, locked: true }, color: 'accent', stroke: 0, fill: true, radius: 0, opacity: 1, dash: 'solid', arrow: 'none', hidden: false },
        { id: 'line', kind: 'rule', frame: { x: 22, y: 86, w: 172, h: 0.5, rotate: 0, z: 0, locked: false }, color: 'ink', stroke: 0.4, fill: true, radius: 0, opacity: 1, dash: 'solid', arrow: 'none', hidden: false },
      ]
      return themed(doc, {
        fonts: { display: 'Archivo', heading: 'Archivo', body: 'Work Sans', accent: 'Archivo' },
        colors: { ink: '#161616', accent: '#bf4019', paper: '#ffffff', panel: '#f4f1ec', highlight: '#ffffff' },
        size: { name: 46, title: 16, heading: 13, body: 12.2, small: 12 },
        weight: { body: 400, strong: 600 },
        leading: 1.42,
        spacing: { section: 12, item: 7, line: 1 },
        headingCase: 'upper',
        nameCase: 'none',
        rule: 'none',
      })
    },
  },
)
