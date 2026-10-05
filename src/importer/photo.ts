import type { SourceImage } from './types'

export type ImageStats = { dominant: number; colors: number; detail: number }

export async function imageStats(src: string): Promise<ImageStats | undefined> {
  if (typeof document === 'undefined') return undefined
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const n = 48
    const canvas = document.createElement('canvas')
    canvas.width = n
    canvas.height = n
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, n, n)
    ctx.drawImage(img, 0, 0, n, n)
    const data = ctx.getImageData(0, 0, n, n).data
    const counts = new Map<number, number>()
    const lum: number[] = []
    for (let i = 0; i < data.length; i += 4) {
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
      counts.set(key, (counts.get(key) ?? 0) + 1)
      lum.push(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2])
    }
    let diff = 0
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) diff += Math.abs(lum[y * n + x] - lum[y * n + x + 1]) + Math.abs(lum[y * n + x] - lum[(y + 1) * n + x])
    }
    return { dominant: Math.max(...counts.values()) / (n * n), colors: counts.size, detail: diff / (2 * (n - 1) * (n - 1)) }
  } catch {
    return undefined
  }
}

export function looksLikePhoto(im: SourceImage) {
  const ratio = im.w / im.h
  if (ratio < 0.55 || ratio > 1.6 || Math.min(im.w, im.h) < 80) return false
  if (im.w * im.h > 2.5e6 && ratio > 0.65 && ratio < 0.8) return false
  const s = im.stats
  if (!s) return true
  return s.detail >= 5 && s.colors >= 8 && !(s.dominant > 0.72 && s.detail < 6)
}
