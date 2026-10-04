import type { Key } from '../i18n'
import type { Doc } from '../model/schema'
import { sampleDoc } from './sample'

export type Template = { id: string; name: Key; desc: Key; make: (lang: 'fr' | 'en') => Doc }

export const TEMPLATES: Template[] = [{ id: 'signal', name: 'tpl.signal', desc: 'tpl.signal.desc', make: () => sampleDoc() }]
