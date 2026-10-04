import { expect, test, type Page } from '@playwright/test'

async function fromTemplate(page: Page) {
  await page.goto('/#/')
  await page.locator('.tpl').first().click()
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
  if (isMobile) await page.locator('.ed-dock-btn').nth(2).click()
  else await page.getByRole('button', { name: /^variantes$|^variants$/i }).first().click()
  await page.getByLabel(/nom de la variante|variant name/i).fill('Offre Lyon')
  await page.getByRole('button', { name: /créer|create/i }).click()
  if (isMobile) await page.getByRole('dialog').getByRole('button', { name: /fermer|close/i }).click()
  const title = field(page, 'blocks/id/title')
  await title.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Data Scientist senior')
  await page.keyboard.press('Enter')
  await expect(title).toHaveText('Data Scientist senior')
  if (!isMobile) {
    await page.locator('.ed-variant').selectOption({ index: 0 })
    await expect(field(page, 'blocks/id/title')).toHaveText('Ingénieure Data et Machine Learning')
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
