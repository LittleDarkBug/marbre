import { del, get, set } from 'idb-keyval'
import { load } from '../model/migrate'
import { fromJsonResume } from '../model/resume'
import type { Doc } from '../model/schema'

export type DocMeta = { id: string; name: string; updatedAt: string }

const INDEX = 'marbre:index'
const key = (id: string) => `marbre:doc:${id}`

export async function listDocs(): Promise<DocMeta[]> {
  return ((await get<DocMeta[]>(INDEX)) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveDoc(doc: Doc) {
  await set(key(doc.id), doc)
  const index = (await get<DocMeta[]>(INDEX)) ?? []
  const meta = { id: doc.id, name: doc.name, updatedAt: doc.updatedAt }
  await set(INDEX, [meta, ...index.filter((m) => m.id !== doc.id)])
}

export async function readDoc(id: string): Promise<Doc | null> {
  const raw = await get(key(id))
  return raw ? load(raw) : null
}

export async function removeDoc(id: string) {
  await del(key(id))
  await set(INDEX, ((await get<DocMeta[]>(INDEX)) ?? []).filter((m) => m.id !== id))
}

export function parseFile(text: string, lang: 'fr' | 'en'): Doc {
  const raw = JSON.parse(text) as Record<string, unknown>
  return 'basics' in raw && !('blocks' in raw) ? fromJsonResume(raw, lang) : load(raw)
}

export function download(name: string, content: string | Blob, type = 'application/json') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fileName = (doc: Doc) => `${doc.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'cv'}.marbre.json`

type DirHandle = FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemHandle> }
type Picker = { showDirectoryPicker?: (o?: { mode: 'readwrite' }) => Promise<DirHandle> }

export const canOpenFolder = () => typeof (window as unknown as Picker).showDirectoryPicker === 'function'

let folder: DirHandle | null = null

export async function openFolder(): Promise<Doc[]> {
  folder = await (window as unknown as Picker).showDirectoryPicker!({ mode: 'readwrite' })
  const docs: Doc[] = []
  for await (const handle of folder.values()) {
    if (handle.kind !== 'file' || !handle.name.endsWith('.marbre.json')) continue
    const file = await (handle as FileSystemFileHandle).getFile()
    try {
      docs.push(load(JSON.parse(await file.text())))
    } catch {
      continue
    }
  }
  return docs
}

export async function writeToFolder(doc: Doc) {
  if (!folder) return false
  const handle = await folder.getFileHandle(fileName(doc), { create: true })
  const stream = await handle.createWritable()
  await stream.write(JSON.stringify(doc, null, 2))
  await stream.close()
  return true
}

export const hasFolder = () => folder !== null
