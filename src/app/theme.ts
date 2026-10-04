import { create } from 'zustand'

type Mode = 'light' | 'dark'

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

const initial = (): Mode => {
  try {
    const saved = localStorage.getItem('marbre:theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    return systemDark() ? 'dark' : 'light'
  }
  return systemDark() ? 'dark' : 'light'
}

const apply = (mode: Mode) => {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = mode
}

export const useTheme = create<{ theme: Mode; toggle: () => void }>((set, get) => {
  const theme = initial()
  apply(theme)
  return {
    theme,
    toggle: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark'
      apply(next)
      try {
        localStorage.setItem('marbre:theme', next)
      } catch {
        return set({ theme: next })
      }
      set({ theme: next })
    },
  }
})
