import { chromium, type Browser } from '@playwright/test'

export async function launch(): Promise<Browser> {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel })
    } catch {
      continue
    }
  }
  throw new Error('Aucun navigateur Chromium trouvé : installez Chrome, Edge, ou lancez npx playwright install chromium.')
}
