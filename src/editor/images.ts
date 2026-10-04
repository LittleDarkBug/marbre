export async function readImage(file: File, max = 1600): Promise<{ src: string; ratio: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const webp = canvas.toDataURL('image/webp', 0.86)
    const src = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88)
    return { src, ratio: w / h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' })
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
