import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { launch } from '../cli/browser'
import { serve } from '../cli/serve'

const out = process.argv[2] ?? 'shots'
mkdirSync(out, { recursive: true })
const { url, server } = await serve(resolve('dist'))
const browser = await launch()
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.goto(url + '/#/')
  await page.locator('.rail-card').nth(5).click()
  await page.waitForSelector('.mb-page.is-editing')
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/ed-${w}.png` })
  if (w > 700) {
    await page.locator('.mb-page.is-editing .mb-photo').click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/ed-photo-${w}.png` })
  } else {
    await page.locator('.ed-dock-btn').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/ed-elements-${w}.png` })
  }
  await ctx.close()
}
await browser.close()
server.close()
