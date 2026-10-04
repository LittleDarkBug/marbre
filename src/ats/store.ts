import { useEffect } from 'react'
import { create } from 'zustand'
import type { Doc } from '../model/schema'
import type { Fit } from '../render/Page'
import { analyze, type Reading } from './analyze'
import { samplePage } from './measure'

export const useAts = create<{ reading: Reading | null; at: number }>(() => ({ reading: null, at: 0 }))

export function useAtsRunner(doc: Doc, fit: Fit | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => {
      const page = document.querySelector<HTMLElement>('.mb-page.is-editing')
      if (!page) return
      const active = document.activeElement as HTMLElement | null
      if (active?.isContentEditable) return
      useAts.setState({ reading: analyze(doc, samplePage(page), fit), at: Date.now() })
    }, 350)
    return () => clearTimeout(timer)
  }, [doc, fit, enabled])
}
