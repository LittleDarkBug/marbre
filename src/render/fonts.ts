import type { Theme } from '../model/schema'
import { FONT_LOADERS } from './fontLoaders'
import { fontSpec } from './fontLibrary'

const loaded = new Set<string>()

export async function loadFamily(family: string) {
  const spec = fontSpec(family)
  if (!spec || loaded.has(family)) return
  loaded.add(family)
  await Promise.all(Object.values(FONT_LOADERS[spec.pkg] ?? {}).map((load) => load()))
}

export async function loadThemeFonts(theme: Theme) {
  await Promise.all(Object.values(theme.fonts).map(loadFamily))
  if (typeof document !== 'undefined') await document.fonts.ready
}

export const stack = (family: string) => {
  const category = fontSpec(family)?.category
  const fallback = category === 'serif' ? 'Georgia, serif' : category === 'mono' ? 'ui-monospace, monospace' : 'Arial, sans-serif'
  return `'${family}', ${fallback}`
}
