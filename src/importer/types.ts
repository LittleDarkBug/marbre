export type Line = {
  text: string
  page: number
  x0: number
  x1: number
  y0: number
  y1: number
  size: number
  bold: boolean
  italic: boolean
  heading?: number
  bullet?: boolean
  side?: string[]
  box?: number
}

export type SourceImage = { src: string; w: number; h: number; page: number; x: number; y: number }

export type Source = {
  kind: 'pdf' | 'ocr' | 'docx' | 'html' | 'text' | 'markdown'
  lines: Line[]
  pages: number
  images: SourceImage[]
  columns: number
  raw: string
  warnings: string[]
}

export type SectionKind =
  | 'profile'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'awards'
  | 'interests'
  | 'volunteering'
  | 'publications'
  | 'references'
  | 'other'

export type ParsedEntry = { title: string; subtitle: string; org: string; meta: string; dates: string; body: string; bullets: string[] }

export type ParsedSection = {
  kind: SectionKind
  heading: string
  entries: ParsedEntry[]
  pairs: { key: string; value: string }[]
  groups: { label: string; items: string }[]
  text: string
}

export type ParsedContact = { kind: 'phone' | 'email' | 'location' | 'linkedin' | 'github' | 'website' | 'other'; text: string; href?: string }

export type ParsedCv = {
  lang: 'fr' | 'en'
  name: string
  title: string
  contacts: ParsedContact[]
  highlights?: string[]
  sections: ParsedSection[]
  photo?: SourceImage
  leftovers: string[]
}

export type Coverage = { ratio: number; missing: string[]; total: number }

export type ImportCode = 'too-big' | 'too-many-pages' | 'password' | 'empty' | 'unsupported' | 'unreadable'

export class ImportError extends Error {
  code: ImportCode
  constructor(code: ImportCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

export const LIMITS = { bytes: 25 * 1024 * 1024, pages: 12, ocrPages: 4, lines: 6000 }
