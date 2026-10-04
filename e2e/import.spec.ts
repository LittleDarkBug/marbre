import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const fixture = (name: string) => fileURLToPath(new URL(`../src/importer/fixtures/${name}`, import.meta.url))

test('imports an existing PDF CV and opens it in the editor', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: /importer un cv existant|import an existing cv/i }).first().click()
  const dialog = page.locator('dialog.imp')
  await expect(dialog).toBeVisible()
  await dialog.locator('input[type=file]').setInputFiles(fixture('affiche_en.pdf'))
  await expect(dialog.locator('.imp-score b')).toHaveText(/^(9[5-9]|100)/, { timeout: 30000 })
  await expect(dialog.locator('.imp-sections li')).toHaveCount(6)
  await dialog.getByRole('button', { name: /choisir la mise en page|choose the layout/i }).click()
  await expect(dialog.locator('.tpk-card')).toHaveCount(7)
  await dialog.locator('.tpk-card').filter({ has: page.locator('.tpk-name', { hasText: /Portrait/ }) }).click()
  await dialog.getByRole('button', { name: /créer le cv|create the cv/i }).click()
  await expect(page.locator('.mb-page.is-editing')).toBeVisible()
  await expect(page.locator('.mb-page.is-editing .mb-name')).toHaveText(/camille martin/i)
  await expect(page.locator('.mb-page.is-editing .mb-col.is-panel, .mb-page.is-editing [data-col]')).not.toHaveCount(0)
})

test('reports unreadable files without crashing', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: /importer un cv existant|import an existing cv/i }).first().click()
  const dialog = page.locator('dialog.imp')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 broken') })
  await expect(dialog.getByRole('alert')).toBeVisible({ timeout: 30000 })
  await dialog.getByRole('button', { name: /choisir un autre fichier|choose another file/i }).click()
  await expect(dialog.locator('.imp-drop')).toBeVisible()
})
