import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { launch } from '../cli/browser'
import { renderDoc } from '../cli/render'
import { serve } from '../cli/serve'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const docFile = process.argv[2]
const { url, server } = await serve(resolve('dist'))
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(url + '/#/')
let doc: unknown
if (docFile) {
  const { readFileSync } = await import('node:fs')
  doc = JSON.parse(readFileSync(docFile, 'utf8'))
  await page.evaluate(async (d) => {
    const w = window as unknown as { marbre: { store: { getState(): { open(d: unknown): void } } } }
    w.marbre.store.getState().open(d)
    location.hash = `#/edit/${(d as { id: string }).id}`
  }, doc)
} else {
  await page.locator('.tpl').first().click()
}
await page.waitForSelector('.mb-page.is-editing')
doc = await page.evaluate(() => (window as unknown as { marbre: { store: { getState(): { base: unknown } } } }).marbre.store.getState().base)
await page.getByRole('button', { name: /lentille ats|ats lens/i }).first().click()
await page.waitForFunction(() => (window as unknown as { marbre: { ats: { getState(): { reading: unknown } } } }).marbre.ats.getState().reading !== null)
const lens = await page.evaluate(() => (window as unknown as { marbre: { ats: { getState(): { reading: { miner: { text: string }[] } } } } }).marbre.ats.getState().reading.miner.map((b) => b.text))
const dir = mkdtempSync(join(tmpdir(), 'marbre-'))
const r = await renderDoc(browser, url, doc, null)
const pdf = join(dir, 'doc.pdf')
writeFileSync(pdf, r.pdf)
execFileSync('python', ['scripts/pdfminer-fixture.py', pdf, join(dir, 'f.json')])
const real = (JSON.parse((await import('node:fs')).readFileSync(join(dir, 'f.json'), 'utf8')) as { boxes: string[] }).boxes.map(norm)
const ours = lens.map(norm)
let same = 0
for (let i = 0; i < Math.max(real.length, ours.length); i++) if (real[i] === ours[i]) same++
console.log(`boxes: lens ${ours.length}, pdfminer ${real.length}, identical positions ${same}`)
for (let i = 0; i < Math.max(real.length, ours.length); i++) if (real[i] !== ours[i]) console.log(`#${i}\n  lens: ${ours[i]?.slice(0, 90)}\n  real: ${real[i]?.slice(0, 90)}`)
await browser.close()
server.close()
