import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { launch } from '../cli/browser'
import { serve } from '../cli/serve'

const out = process.argv[2] ?? 'shots'
const widths = (process.argv[3] ?? '1440,1024,390,320').split(',').map(Number)
const theme = process.argv[4] ?? 'light'
mkdirSync(out, { recursive: true })
const { url, server } = await serve(resolve('dist'))
const browser = await launch()
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 }, deviceScaleFactor: 1, hasTouch: w < 700, isMobile: w < 700, colorScheme: theme === 'dark' ? 'dark' : 'light' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.goto(url + '/#/')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/home-${w}-${theme}.png`, fullPage: false })
  await page.locator('.tpl').first().click()
  await page.waitForSelector('.mb-page.is-editing')
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/editor-${w}-${theme}.png` })
  await page.locator('[data-block="xp"] [data-item="x1"]').first().click({ position: { x: 30, y: 8 } })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/editor-sel-${w}-${theme}.png` })
  if (w >= 760) {
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /lentille ats|ats lens/i }).first().click()
    await page.getByRole('button', { name: /^lecture ats$|^ats reading$/i }).first().click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/editor-lens-${w}-${theme}.png` })
  }
  await ctx.close()
}
await browser.close()
server.close()
