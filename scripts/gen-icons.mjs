import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const weight = process.argv[2] ?? 'regular'
const dir = `node_modules/@phosphor-icons/core/assets/${weight}`
const out = {}
for (const file of readdirSync(dir)) {
  const svg = readFileSync(`${dir}/${file}`, 'utf8')
  const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const paths = [...body.matchAll(/<path d="([^"]+)"\s*\/>/g)].map((m) => m[1])
  if (!paths.length || body.replace(/<path d="[^"]+"\s*\/>/g, '').trim()) continue
  out[file.replace(/-fill\.svg$/, '')] = paths.join(' ')
}
writeFileSync(`src/render/icons-${weight}.json`, JSON.stringify(out))
console.log(Object.keys(out).length, 'icons')
