import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const mark = (size, pad, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20">${bg ? `<rect width="20" height="20" fill="${bg}"/>` : ''}<g transform="translate(${pad} ${pad}) scale(${(20 - 2 * pad) / 20})"><rect x="1.5" y="1.5" width="17" height="17" rx="4.5" fill="#111"/><rect x="5" y="5.5" width="5.4" height="9" rx="1" fill="#fff"/><rect x="11.8" y="5.5" width="3.2" height="4" rx="1" fill="#fff"/><rect x="11.8" y="10.5" width="3.2" height="4" rx="1" fill="#fff" opacity=".55"/></g></svg>`
const full = (size, k) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20"><rect width="20" height="20" fill="#111"/><g transform="translate(10 10) scale(${k}) translate(-10 -10)"><rect x="5" y="5.5" width="5.4" height="9" rx="1" fill="#fff"/><rect x="11.8" y="5.5" width="3.2" height="4" rx="1" fill="#fff"/><rect x="11.8" y="10.5" width="3.2" height="4" rx="1" fill="#fff" opacity=".55"/></g></svg>`

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
const page = await browser.newPage()
const shot = async (svg, size, file) => {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  const png = await page.locator('svg').screenshot({ omitBackground: true })
  if (file) writeFileSync(file, png)
  return png
}
await shot(full(180, 1.3), 180, 'public/apple-touch-icon.png')
await shot(mark(192, 0, null), 192, 'public/icon-192.png')
await shot(mark(512, 0, null), 512, 'public/icon-512.png')
await shot(full(512, 1.1), 512, 'public/icon-maskable-512.png')
const ico = [await shot(mark(16, 0, null), 16), await shot(mark(32, 0, null), 32), await shot(mark(48, 0, null), 48)]
const head = Buffer.alloc(6 + 16 * ico.length)
head.writeUInt16LE(0, 0)
head.writeUInt16LE(1, 2)
head.writeUInt16LE(ico.length, 4)
let offset = head.length
ico.forEach((png, i) => {
  const size = [16, 32, 48][i]
  const at = 6 + 16 * i
  head.writeUInt8(size, at)
  head.writeUInt8(size, at + 1)
  head.writeUInt16LE(1, at + 4)
  head.writeUInt16LE(32, at + 6)
  head.writeUInt32LE(png.length, at + 8)
  head.writeUInt32LE(offset, at + 12)
  offset += png.length
})
writeFileSync('public/favicon.ico', Buffer.concat([head, ...ico]))
await browser.close()
