import type { Browser } from '@playwright/test'
import type { Fit } from '../src/render/Page'

export type Rendered = { pdf: Buffer; png?: Buffer; fit: Fit }

export async function renderDoc(browser: Browser, base: string, doc: unknown, variant: string | null, png = false): Promise<Rendered> {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } })
  await page.addInitScript((d) => {
    ;(window as unknown as { __MARBRE_DOC__: unknown }).__MARBRE_DOC__ = d
  }, doc)
  const query = variant ? `?variant=${encodeURIComponent(variant)}` : ''
  await page.goto(`${base}/#/print/cli${query}`)
  await page.waitForFunction(() => (window as unknown as { __MARBRE_READY__?: boolean }).__MARBRE_READY__ === true, null, { timeout: 30000 })
  const fit = await page.evaluate(() => (window as unknown as { __MARBRE_FIT__: Fit }).__MARBRE_FIT__)
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const shot = png ? await page.locator('.mb-page').screenshot() : undefined
  await page.close()
  return { pdf, png: shot, fit }
}
