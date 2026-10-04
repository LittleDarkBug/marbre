type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

export function step(parent: unknown, key: string): unknown {
  if (Array.isArray(parent)) return parent.find((x) => isObj(x) && x.id === key)
  if (isObj(parent)) return parent[key]
  return undefined
}

export function getAt(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((node, key) => step(node, key), root)
}

export function setAt(root: unknown, path: string[], value: unknown) {
  const parent = getAt(root, path.slice(0, -1))
  const last = path[path.length - 1]
  if (Array.isArray(parent)) {
    const i = parent.findIndex((x) => isObj(x) && x.id === last)
    if (i >= 0) parent[i] = value
  } else if (isObj(parent)) parent[last] = value
}
