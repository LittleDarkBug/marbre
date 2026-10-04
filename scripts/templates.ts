import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TEMPLATES } from '../src/templates'

const out = process.argv[2] ?? 'templates-out'
mkdirSync(out, { recursive: true })
for (const t of TEMPLATES) for (const lang of ['fr', 'en'] as const) writeFileSync(join(out, `${t.id}-${lang}.marbre.json`), JSON.stringify(t.make(lang)))
