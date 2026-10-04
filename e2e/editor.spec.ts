import { expect, test, type Page } from '@playwright/test'

async function fromTemplate(page: Page) {
  await page.goto('/#/')
  await page.locator('.rail-card').first().click()
  await expect(page.locator('.mb-page.is-editing')).toBeVisible()
}

const field = (page: Page, path: string) => page.locator(`.mb-page.is-editing [data-path="${path}"]`)

test('edits text on the page and keeps it after reload', async ({ page }) => {
  await fromTemplate(page)
  const name = field(page, 'blocks/id/name')
  await name.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Alex Dupont')
  await page.keyboard.press('Enter')
  await expect(name).toHaveText('Alex Dupont')
  await page.waitForTimeout(700)
  await page.reload()
  await expect(field(page, 'blocks/id/name')).toHaveText('Alex Dupont')
})

test('adds a bullet with Enter and removes it with Backspace', async ({ page }) => {
  await fromTemplate(page)
  const bullets = page.locator('[data-item="x2"] .mb-pts li')
  await expect(bullets).toHaveCount(1)
  await bullets.first().click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(bullets).toHaveCount(2)
  await expect(bullets.nth(1)).toBeFocused()
  await page.keyboard.type('Nouvelle ligne')
  await expect(bullets.nth(1)).toHaveText('Nouvelle ligne')
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await expect(bullets).toHaveCount(1)
})

test('moves a section to the other column', async ({ page }) => {
  await fromTemplate(page)
  await page.locator('[data-block="langs"] .mb-h2').click()
  await page.getByRole('button', { name: /autre colonne|other column/i }).click()
  await expect(page.locator('[data-col="main"] [data-block="langs"]')).toBeVisible()
})

test('a variant changes the page without touching the base', async ({ page, isMobile }) => {
  await fromTemplate(page)
  if (isMobile) await page.locator('.ed-dock').getByRole('button', { name: /^variantes$|^variants$/i }).click()
  else await page.getByRole('button', { name: /^variantes$|^variants$/i }).first().click()
  await page.getByLabel(/nom de la variante|variant name/i).fill('Offre Lyon')
  await page.getByRole('button', { name: /créer|create/i }).click()
  if (isMobile) await page.getByRole('dialog').getByRole('button', { name: /fermer|close/i }).click()
  const title = field(page, 'blocks/id/title')
  const original = await title.textContent()
  await title.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Data Scientist senior')
  await page.keyboard.press('Enter')
  await expect(title).toHaveText('Data Scientist senior')
  if (!isMobile) {
    await page.locator('.ed-variant').selectOption({ index: 0 })
    await expect(field(page, 'blocks/id/title')).toHaveText(original!)
  }
})

test('free mode lets a block move and keeps a reading thread', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer drag covered on desktop')
  await fromTemplate(page)
  await page.getByRole('button', { name: /^réglages$|^settings$/i }).first().click()
  await page.getByRole('radio', { name: /libre|free/i }).click()
  await expect(page.locator('.mb-page.is-editing [data-frame]')).toHaveCount(7)
  await expect(page.locator('.thread-pin')).toHaveCount(7)
  const frame = page.locator('[data-frame="proj"]')
  await frame.locator('.mb-h2').click()
  const box = (await frame.boundingBox())!
  const grip = (await page.locator('.ft-grip').boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 40, grip.y + 64, { steps: 8 })
  await page.mouse.up()
  const after = (await frame.boundingBox())!
  expect(after.y).toBeGreaterThan(box.y + 30)
})

test('home lists the document and opens it', async ({ page }) => {
  await fromTemplate(page)
  await page.waitForTimeout(600)
  await page.goto('/#/')
  await expect(page.locator('.atelier-name').first()).toHaveText('Camille Martin')
})

test('adds a free text box, moves it with the keyboard and deletes it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow on desktop')
  await fromTemplate(page)
  await page.getByRole('button', { name: /ajouter un titre|add a title/i }).click()
  const note = page.locator('.mb-page.is-editing .mb-note')
  await expect(note).toHaveCount(1)
  const frame = page.locator('.mb-page.is-editing [data-frame]').last()
  const before = (await frame.boundingBox())!
  await page.locator('.ws').click({ position: { x: 5, y: 5 } })
  await note.click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Escape')
  await note.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  const after = (await frame.boundingBox())!
  expect(after.x).toBeGreaterThan(before.x)
  expect(after.y).toBeGreaterThan(before.y + 10)
  await page.keyboard.press('Delete')
  await expect(note).toHaveCount(0)
})

test('adds an icon and a shape from the elements panel', async ({ page, isMobile }) => {
  test.skip(isMobile, 'panel layout on desktop')
  await fromTemplate(page)
  await page.locator('.els-icon').first().click()
  await expect(page.locator('.mb-page.is-editing .mb-decor-icon')).toHaveCount(1)
  await page.getByRole('button', { name: /^arrondi$|^rounded$/i }).click()
  await expect(page.locator('.mb-page.is-editing .mb-decor-rect')).toHaveCount(1)
})

test('resizing a free element follows the pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer resize on desktop')
  await fromTemplate(page)
  await page.getByRole('button', { name: /^rectangle$/i }).click()
  const shape = page.locator('.mb-page.is-editing [data-decor]').last()
  const before = (await shape.boundingBox())!
  const handle = (await page.locator('.mb-moveable .moveable-control.moveable-se').first().boundingBox())!
  const sx = handle.x + handle.width / 2
  const sy = handle.y + handle.height / 2
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(sx + 4 * i, sy + 3 * i)
  await page.mouse.up()
  const after = (await shape.boundingBox())!
  expect(Math.abs(after.width - before.width - 40)).toBeLessThan(4)
  expect(Math.abs(after.height - before.height - 30)).toBeLessThan(4)
  expect(Math.abs(after.x - before.x)).toBeLessThan(2)
})

test('print opens the dialog without a popup', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'print button on desktop')
  await context.addInitScript(() => {
    window.print = () => {
      ;(window.top as unknown as { __printed?: string }).__printed = document.querySelector('.mb-print .mb-page')?.textContent ?? ''
    }
  })
  await fromTemplate(page)
  await page.getByRole('button', { name: /imprimer en pdf|print to pdf/i }).first().click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed?: string }).__printed ?? null), { timeout: 15000 }).toContain('Camille Martin')
})
