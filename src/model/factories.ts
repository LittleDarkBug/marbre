import { uid } from './ids'
import { SCHEMA_VERSION, type Block, type BlockType, type Doc, type Entry, type Theme } from './schema'

export const defaultTheme = (): Theme => ({
  fonts: { display: 'Barlow Condensed', heading: 'Barlow Condensed', body: 'Source Sans 3', accent: 'Barlow Condensed' },
  colors: { ink: '#141110', accent: '#aa3217', paper: '#ffffff', panel: '#f6f1ec', highlight: '#f7e6df' },
  size: { name: 36, title: 16, heading: 16, body: 13, small: 12 },
  weight: { body: 400, strong: 700 },
  leading: 1.4,
  spacing: { section: 12, item: 6, line: 3 },
  headingCase: 'upper',
  nameCase: 'upper',
  datePlacement: 'inline',
  rule: 'under-identity',
  identity: 'stacked',
  entry: 'stacked',
  skills: 'block',
  pairs: 'lines',
})

export const newEntry = (title = ''): Entry => ({
  id: uid('e'),
  title,
  subtitle: '',
  org: '',
  meta: '',
  dates: '',
  tags: '',
  body: '',
  bullets: [],
})

export function newBlock(type: BlockType, heading = ''): Block {
  const common = { id: uid('b'), heading, hidden: false }
  switch (type) {
    case 'identity':
      return { ...common, type, name: '', title: '', highlights: [], contacts: [] }
    case 'text':
      return { ...common, type, body: '' }
    case 'entries':
      return { ...common, type, kind: 'experience', items: [newEntry()] }
    case 'skills':
      return { ...common, type, groups: [{ id: uid('g'), label: '', items: '' }] }
    case 'pairs':
      return { ...common, type, items: [{ id: uid('p'), key: '', value: '' }] }
  }
}

export function blankDoc(name = 'CV', lang: 'fr' | 'en' = 'fr'): Doc {
  const identity = newBlock('identity')
  const profile = newBlock('text', lang === 'fr' ? 'Profil' : 'Profile')
  const xp = newBlock('entries', lang === 'fr' ? 'Expériences' : 'Experience')
  return {
    version: SCHEMA_VERSION,
    id: uid('d'),
    name,
    lang,
    updatedAt: new Date().toISOString(),
    page: { format: 'A4', fit: 'one', margin: { top: 12, right: 12, bottom: 10, left: 12 } },
    theme: defaultTheme(),
    layout: {
      mode: 'flow',
      columns: [{ id: uid('c'), width: 1, unit: 'fr', panel: false, blocks: [identity.id, profile.id, xp.id] }],
      gutter: 8,
      frames: {},
      order: [],
      decor: [],
    },
    blocks: [identity, profile, xp],
    variants: [],
    rules: { forbidden: [], frenchSpacing: lang === 'fr', maxParentheses: 3, keywords: [] },
  }
}
