import { sanitizeBlocks } from './rich'
import { Doc, SCHEMA_VERSION } from './schema'

const steps: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

export class DocError extends Error {}

export function load(input: unknown): Doc {
  if (typeof input !== 'object' || input === null) throw new DocError('not-an-object')
  let raw = input as Record<string, unknown>
  let version = typeof raw.version === 'number' ? raw.version : 0
  if (version > SCHEMA_VERSION) throw new DocError('newer-version')
  while (version < SCHEMA_VERSION) {
    const step = steps[version]
    if (!step) throw new DocError('unknown-version')
    raw = step(raw)
    version += 1
  }
  const parsed = Doc.safeParse(raw)
  if (!parsed.success) throw new DocError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  return { ...parsed.data, blocks: sanitizeBlocks(parsed.data.blocks) }
}
