import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './browser'
import { renderDoc } from './render'
import { serve } from './serve'
import { textRuns, type3Fonts, verifyPdf, type Expect } from './verify'
import { checkLines, expectations } from '../src/ats/expect'
import { resolve as resolveVariant } from '../src/model/variants'
import { load } from '../src/model/migrate'
import { diff } from '../src/model/variants'
import { uid } from '../src/model/ids'

const DIST = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

type Args = { _: string[]; [k: string]: string | boolean | string[] }

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        out[a.slice(2)] = next
        i++
      } else out[a.slice(2)] = true
    } else (out._ as string[]).push(a)
  }
  return out
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')

async function exportCmd(args: Args) {
  const file = args._[1]
  if (!file) throw new Error('usage: marbre export doc.marbre.json [--variant id | --all] [--out dossier] [--png]')
  const doc = JSON.parse(readFileSync(file, 'utf8')) as { name: string; variants?: { id: string; name: string }[] }
  const out = String(args.out ?? '.')
  mkdirSync(out, { recursive: true })
  const targets: (string | null)[] = args.all ? [null, ...(doc.variants ?? []).map((v) => v.id)] : [typeof args.variant === 'string' ? args.variant : null]
  const { url, server } = await serve(DIST)
  const browser = await launch()
  let failed = false
  try {
    for (const variant of targets) {
      const name = variant ? (doc.variants ?? []).find((v) => v.id === variant)?.name ?? variant : ''
      const stem = slug([basename(file).replace(/\.marbre\.json$|\.json$/, ''), name].filter(Boolean).join('_'))
      const r = await renderDoc(browser, url, doc, variant, Boolean(args.png))
      const pdfPath = join(out, `${stem}.pdf`)
      writeFileSync(pdfPath, r.pdf)
      if (r.png) writeFileSync(join(out, `${stem}.png`), r.png)
      const slack = r.fit.columns.map((c) => `${c.slack}`).join(' / ')
      const problems: string[] = []
      if (r.fit.overflow) problems.push('page qui déborde')
      const { pages, text } = await textRuns(r.pdf)
      const resolved = resolveVariant(load(doc), variant)
      if (resolved.page.fit === 'one' && pages !== 1) problems.push(`${pages} pages`)
      const t3 = await type3Fonts(r.pdf)
      if (t3.length) problems.push(`polices Type 3 : ${t3.join(', ')}`)
      problems.push(...checkLines(text.split('\n'), expectations(resolved)))
      for (const issue of r.lens?.issues ?? []) if (issue.severity === 'error') problems.push(`lecture ATS : ${issue.code}${issue.block ? ` (${issue.block})` : ''}`)
      const warnings = (r.lens?.issues ?? []).filter((i) => i.severity === 'warning').map((i) => `${i.code}${i.block ? ` (${i.block})` : ''}`)
      console.log(`${problems.length ? 'ECHEC' : 'OK   '}  ${pdfPath}  pages=${pages}  marge=${slack}px${warnings.length ? `  à vérifier : ${warnings.join(', ')}` : ''}`)
      for (const p of problems) console.log(`       ${p}`)
      if (problems.length) failed = true
    }
  } finally {
    await browser.close()
    server.close()
  }
  if (failed) process.exitCode = 1
}

async function verifyCmd(args: Args) {
  const file = args._[1]
  if (!file) throw new Error('usage: marbre verify cv.pdf [--expect attendus.json]')
  const expect = typeof args.expect === 'string' ? (JSON.parse(readFileSync(args.expect, 'utf8')) as Expect) : {}
  const report = await verifyPdf(readFileSync(file), expect)
  for (const line of report.lines) console.log(line)
  if (!report.ok) process.exitCode = 1
}

async function variantCmd(args: Args) {
  const [, baseFile, ...others] = args._
  if (!baseFile || !others.length) throw new Error('usage: marbre variant base.marbre.json autre.json... [--out fichier]')
  const base = load(JSON.parse(readFileSync(baseFile, 'utf8')))
  for (const file of others) {
    const other = load(JSON.parse(readFileSync(file, 'utf8')))
    const overrides = diff(base, other)
    const existing = base.variants.find((v) => v.name === other.name)
    const variant = { id: existing?.id ?? uid('v'), name: other.name, lang: other.lang !== base.lang ? other.lang : undefined, overrides }
    base.variants = existing ? base.variants.map((v) => (v.id === existing.id ? variant : v)) : [...base.variants, variant]
    console.log(`${other.name}  ${overrides.length} différence(s)`)
  }
  writeFileSync(String(args.out ?? baseFile), JSON.stringify(base, null, 1))
}

const args = parseArgs(process.argv.slice(2))
const commands: Record<string, (a: Args) => Promise<void>> = { export: exportCmd, verify: verifyCmd, variant: variantCmd }
const run = commands[args._[0]]
if (!run) {
  console.log('marbre export doc.marbre.json [--variant id | --all] [--out dossier] [--png]\nmarbre verify cv.pdf [--expect attendus.json]
marbre variant base.marbre.json autre.json... [--out fichier]')
} else {
  run(args).catch((e: Error) => {
    console.error(e.message)
    process.exitCode = 1
  })
}
