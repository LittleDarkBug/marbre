import { create } from 'zustand'
import { en } from './en'
import { fr, type Key } from './fr'

export type Lang = 'fr' | 'en'
export type { Key }

const stored = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    return
  }
}

const initial = (): Lang => {
  const saved = stored('marbre:lang')
  if (saved === 'fr' || saved === 'en') return saved
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('fr') ? 'fr' : 'en'
}

type Ui = { lang: Lang; setLang: (l: Lang) => void }

export const useUiLang = create<Ui>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    store('marbre:lang', lang)
    document.documentElement.lang = lang
    set({ lang })
  },
}))

const dicts = { fr, en } as Record<Lang, Record<Key, string>>

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  const text = dicts[lang][key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : text
}

export function useT() {
  const lang = useUiLang((s) => s.lang)
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars)
}
