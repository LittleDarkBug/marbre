import type { Line, Source } from './types'

type Bbox = { x0: number; y0: number; x1: number; y1: number }
type OcrLine = { text: string; bbox: Bbox; confidence: number }

export async function ocrImages(images: (HTMLCanvasElement | HTMLImageElement)[], onProgress?: (p: number) => void): Promise<Source> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['fra', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  const lines: Line[] = []
  let raw = ''
  try {
    for (let p = 0; p < images.length; p++) {
      const { data } = await worker.recognize(images[p], {}, { blocks: true })
      const ocrLines: OcrLine[] = (data.blocks ?? []).flatMap((b: { paragraphs: { lines: OcrLine[] }[] }) => b.paragraphs.flatMap((para) => para.lines))
      const heights = ocrLines.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b)
      const median = heights[Math.floor(heights.length / 2)] || 20
      for (const l of ocrLines) {
        const text = l.text.replace(/\s+/g, ' ').trim()
        if (!text || l.confidence < 35) continue
        const h = l.bbox.y1 - l.bbox.y0
        lines.push({ text, page: p + 1, x0: l.bbox.x0, x1: l.bbox.x1, y0: l.bbox.y0 + p * 10000, y1: l.bbox.y1 + p * 10000, size: (h / median) * 11, bold: h > median * 1.35, italic: false })
        raw += text + '\n'
      }
    }
  } finally {
    await worker.terminate()
  }
  return { kind: 'ocr', lines, pages: images.length, images: [], columns: 1, raw, warnings: ['ocr'] }
}
