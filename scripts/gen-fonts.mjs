import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('src/render/fontLibrary.ts', 'utf8')
const specs = [...src.matchAll(/pkg: '([^']+)'.*?weights: \[([^\]]+)\], italics: \[([^\]]*)\]/g)]
const lines = ['export const FONT_LOADERS: Record<string, Record<string, () => Promise<unknown>>> = {']
for (const [, pkg, weights, italics] of specs) {
  const entries = [
    ...weights.split(',').map((w) => w.trim()).map((w) => `    '${w}': () => import('@fontsource/${pkg}/${w}.css'),`),
    ...italics.split(',').map((w) => w.trim()).filter(Boolean).map((w) => `    '${w}i': () => import('@fontsource/${pkg}/${w}-italic.css'),`),
  ]
  lines.push(`  '${pkg}': {`, ...entries, '  },')
}
lines.push('}', '')
writeFileSync('src/render/fontLoaders.ts', lines.join('\n'))
