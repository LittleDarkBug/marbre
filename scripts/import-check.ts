import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { launch } from '../cli/browser'
import { serve } from '../cli/serve'
import type { ImportResult } from '../src/importer'

const inputs = process.argv.slice(2).flatMap((p) => (statSync(p).isDirectory() ? readdirSync(p).map((f) => join(p, f)) : [p])).filter((f) => !statSync(f).isDirectory())
const verbose = process.env.V === '1'
const { url, server } = await serve(resolve('dist'))
const browser = await launch()
const page = await browser.newPage()
await page.goto(url + '/#/')
await page.waitForFunction(() => Boolean((window as unknown as { marbre?: unknown }).marbre))
for (const file of inputs) {
  const b64 = readFileSync(file).toString('base64')
  const out = await page.evaluate(async ({ b64, name }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    try {
      const r = await (window as unknown as { marbre: { importFile: (f: File) => Promise<ImportResult> } }).marbre.importFile(new File([bytes], name))
      const cv = r.cv
      return {
        ok: true,
        kind: r.kind,
        cov: r.coverage ? Math.round(r.coverage.ratio * 1000) / 10 : 100,
        missing: r.coverage?.missing.slice(0, 12),
        name: cv?.name,
        title: cv?.title,
        contacts: cv?.contacts.map((c) => `${c.kind}:${c.text}`),
        sections: cv?.sections.map((s) => `${s.kind}[${s.heading}] e${s.entries.length} g${s.groups.length} p${s.pairs.length}${s.text ? ' t' : ''}`),
        entries: cv?.sections.flatMap((s) => s.entries.map((e) => `${e.title} | ${e.org} | ${e.meta} | ${e.dates} | b${e.bullets.length}`)),
        leftovers: cv?.leftovers,
        photo: Boolean(cv?.photo),
        warnings: r.warnings,
        lines: r.source?.lines.map((l) => `${Math.round(l.x0)},${Math.round(l.y0)} s${Math.round(l.size*10)/10}${l.bold?'b':''}${l.italic?'i':''} ${l.text}${l.side?' >> '+l.side.join(' / '):''}`),
        columns: r.source?.columns,
      }
    } catch (e) {
      return { ok: false, error: String((e as Error).message ?? e) }
    }
  }, { b64, name: basename(file) })
  console.log(`\n== ${basename(file)}`)
  if (!out.ok) {
    console.log('  ERREUR', out.error)
    continue
  }
  console.log(`  ${out.kind} cols=${out.columns} couverture=${out.cov}% photo=${out.photo} restes=${out.leftovers?.length}`)
  if (process.env.V) console.log('  warnings', out.warnings)
  console.log(`  nom=${out.name} | titre=${out.title}`)
  console.log(`  contacts=${out.contacts?.join(' ; ')}`)
  console.log(`  sections=${out.sections?.join(' ; ')}`)
  if (process.env.V === '2') for (const l of out.lines ?? []) console.log('   ', l)
  if (verbose) {
    for (const e of out.entries ?? []) console.log(`    - ${e}`)
    for (const l of out.leftovers ?? []) console.log(`    ? ${l}`)
    console.log(`  manquants=${out.missing?.join(' ')}`)
  }
}
await browser.close()
server.close()
