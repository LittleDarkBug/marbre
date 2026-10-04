export type FontCategory = 'sans' | 'serif' | 'condensed' | 'mono'

export type FontSpec = { family: string; pkg: string; category: FontCategory; weights: number[]; italics: number[] }

export const FONTS: FontSpec[] = [
  { family: 'Source Sans 3', pkg: 'source-sans-3', category: 'sans', weights: [400, 500, 600, 700, 900], italics: [400, 600] },
  { family: 'Public Sans', pkg: 'public-sans', category: 'sans', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'IBM Plex Sans', pkg: 'ibm-plex-sans', category: 'sans', weights: [400, 500, 600, 700], italics: [400, 600] },
  { family: 'Fira Sans', pkg: 'fira-sans', category: 'sans', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'Libre Franklin', pkg: 'libre-franklin', category: 'sans', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'Work Sans', pkg: 'work-sans', category: 'sans', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'Archivo', pkg: 'archivo', category: 'sans', weights: [400, 500, 600, 700, 800, 900], italics: [400, 600] },
  { family: 'Barlow', pkg: 'barlow', category: 'sans', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'Barlow Condensed', pkg: 'barlow-condensed', category: 'condensed', weights: [500, 600, 700, 800], italics: [600] },
  { family: 'Archivo Narrow', pkg: 'archivo-narrow', category: 'condensed', weights: [400, 500, 600, 700], italics: [400] },
  { family: 'Source Serif 4', pkg: 'source-serif-4', category: 'serif', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'IBM Plex Serif', pkg: 'ibm-plex-serif', category: 'serif', weights: [400, 500, 600, 700], italics: [400, 600] },
  { family: 'Charis SIL', pkg: 'charis-sil', category: 'serif', weights: [400, 700], italics: [400, 700] },
  { family: 'EB Garamond', pkg: 'eb-garamond', category: 'serif', weights: [400, 500, 600, 700, 800], italics: [400, 600] },
  { family: 'IBM Plex Mono', pkg: 'ibm-plex-mono', category: 'mono', weights: [400, 500, 600, 700], italics: [400] },
]

export const fontSpec = (family: string) => FONTS.find((f) => f.family === family)

export function nearestWeight(family: string, wanted: number) {
  const spec = fontSpec(family)
  if (!spec) return wanted
  return spec.weights.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), spec.weights[0])
}
