import type { Browser } from '@playwright/test'
import type { Reading } from '../src/ats/analyze'
import type { Fit } from '../src/render/Page'

export type Rendered = { pdf: Buffer; png?: Buffer; fit: Fit; lens: Reading | null }

export async function renderDoc(browser: Browser, base: string, doc: unknown, variant: string | null, png = false): Promise<Rendered> {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } })
  await page.emulateMedia({ media: 'print' })
  await page.addInitScript((d) => {
    ;(window as unknown as { __MARBRE_DOC__: unknown }).__MARBRE_DOC__ = d
  }, doc)
  const query = variant ? `?variant=${encodeURIComponent(variant)}` : ''
  await page.goto(`${base}/#/print/cli${query}`)
  await page.waitForFunction(() => (window as unknown as { __MARBRE_READY__?: boolean }).__MARBRE_READY__ === true, null, { timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
  const fit = await page.evaluate(() => (window as unknown as { __MARBRE_FIT__: Fit }).__MARBRE_FIT__)
  const lens = await page.evaluate(() => (window as unknown as { __MARBRE_LENS__: () => Reading | null }).__MARBRE_LENS__())
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const shot = png ? await page.locator('.mb-page').screenshot() : undefined
  await page.close()
  return { pdf, png: shot, fit, lens }
}
