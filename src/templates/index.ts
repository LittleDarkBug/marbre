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
