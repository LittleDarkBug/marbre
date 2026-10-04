import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { launch } from '../cli/browser'
import { serve } from '../cli/serve'

const out = process.argv[2] ?? 'shots'
const widths = (process.argv[3] ?? '1440,390').split(',').map(Number)
mkdirSync(out, { recursive: true })
const { url, server } = await serve(resolve('dist'))
const browser = await launch()
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, isMobile: w < 700, hasTouch: w < 700 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.goto(url + '/#/')
  await page.waitForTimeout(1500)
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = w < 700 ? 844 : 900
  let i = 0
  for (let y = 0; y < H; y += vh * 0.9) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${out}/lp-${w}-${String(i++).padStart(2, '0')}.png` })
  }
  await ctx.close()
}
await browser.close()
server.close()
