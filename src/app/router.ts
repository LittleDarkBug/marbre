import { useSyncExternalStore } from 'react'

export type Route = { name: 'home' } | { name: 'edit'; id: string } | { name: 'print'; id: string; variant: string | null; auto: boolean }

export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const params = new URLSearchParams(query)
  if (parts[0] === 'edit' && parts[1]) return { name: 'edit', id: parts[1] }
  if (parts[0] === 'print') return { name: 'print', id: parts[1] ?? '', variant: params.get('variant'), auto: params.get('auto') === '1' }
  return { name: 'home' }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export const useRoute = () => parse(useSyncExternalStore(subscribe, () => window.location.hash))

export const go = (hash: string) => {
  window.location.hash = hash
}
