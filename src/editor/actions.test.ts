import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import type { EntriesBlock } from '../model/schema'
import { sampleDoc } from '../templates/sample'
import { addBlock, detachBlock, duplicateBlock, insertBullet, insertItem, moveBlock, moveInList, removeBlock, setMode } from './actions'

const cols = (d: ReturnType<typeof sampleDoc>) => d.layout.columns.map((c) => c.blocks)

describe('editor actions', () => {
  it('moves a block across columns at an index', () => {
    const d = produce(sampleDoc(), (d) => moveBlock(d, 'langs', 'main', 1))
    expect(cols(d)).toEqual([['id', 'langs', 'profile', 'xp', 'proj'], ['skills', 'edu']])
  })

  it('moves a block down within its column', () => {
    const d = produce(sampleDoc(), (d) => moveBlock(d, 'id', 'main', 3))
    expect(cols(d)[0]).toEqual(['profile', 'xp', 'id', 'proj'])
  })

  it('adds, duplicates and removes blocks', () => {
    let id = ''
    let d = produce(sampleDoc(), (d) => {
      id = addBlock(d, 'text', 'Centres', undefined, 'skills')
    })
    expect(cols(d)[1]).toEqual(['skills', id, 'edu', 'langs'])
    let copy = ''
    d = produce(d, (d) => {
      copy = duplicateBlock(d, 'xp')!
    })
    expect(cols(d)[0]).toEqual(['id', 'profile', 'xp', copy, 'proj'])
    expect((d.blocks.find((b) => b.id === copy) as EntriesBlock).items[0].id).not.toBe('x1')
    d = produce(d, (d) => removeBlock(d, copy))
    expect(d.blocks.some((b) => b.id === copy)).toBe(false)
  })

  it('inserts items and bullets after a given one', () => {
    let bullet = ''
    const d = produce(sampleDoc(), (d) => {
      insertItem(d, 'xp', 'x1')
      bullet = insertBullet(d, 'xp', 'x1', 'x1a')!
      moveInList(d, ['blocks', 'xp', 'items'], 'x2', -1)
    })
    const xp = d.blocks.find((b) => b.id === 'xp') as EntriesBlock
    expect(xp.items).toHaveLength(3)
    expect(xp.items[1].id).toBe('x2')
    expect(xp.items[0].bullets.map((b) => b.id)).toEqual(['x1a', bullet, 'x1b'])
  })

  it('switches to free mode keeping the reading order, and back', () => {
    const frames = Object.fromEntries(sampleDoc().blocks.map((b, i) => [b.id, { x: 10, y: 10 + i * 20, w: 100, h: 15 }]))
    let d = produce(sampleDoc(), (d) => setMode(d, 'free', frames))
    expect(d.layout.order).toEqual(['id', 'profile', 'xp', 'proj', 'skills', 'edu', 'langs'])
    d = produce(d, (d) => setMode(d, 'flow', {}))
    expect(d.layout.mode).toBe('flow')
    expect(Object.keys(d.layout.frames)).toHaveLength(0)
  })

  it('detaches a block out of the flow', () => {
    const d = produce(sampleDoc(), (d) => detachBlock(d, 'proj', { x: 5, y: 5, w: 50, h: 10 }))
    expect(cols(d)[0]).not.toContain('proj')
    expect(d.layout.frames.proj.w).toBe(50)
    expect(d.layout.order).toContain('proj')
  })
})
