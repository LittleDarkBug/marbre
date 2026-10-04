import { create } from 'zustand'

export type Panel = 'elements' | 'outline' | 'inspect' | 'ats' | 'proof' | 'variants' | 'export' | null

type EditorUi = {
  zoom: number
  fitZoom: boolean
  lens: boolean
  thread: boolean
  drawer: Panel
  setZoom: (z: number) => void
  setFit: (f: boolean) => void
  toggleLens: () => void
  toggleThread: () => void
  openDrawer: (p: Panel) => void
}

export const useEditorUi = create<EditorUi>((set) => ({
  zoom: 1,
  fitZoom: true,
  lens: false,
  thread: false,
  drawer: null,
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)), fitZoom: false }),
  setFit: (fitZoom) => set({ fitZoom }),
  toggleLens: () => set((s) => ({ lens: !s.lens })),
  toggleThread: () => set((s) => ({ thread: !s.thread })),
  openDrawer: (drawer) => set({ drawer }),
}))
