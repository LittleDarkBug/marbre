import { createContext, useContext, type ElementType, type HTMLAttributes } from 'react'
import type { Block, Theme } from '../model/schema'
import type { Key } from '../i18n'
import { escape } from '../model/rich'

export type FieldProps = {
  path: string[]
  value: string
  as?: ElementType
  className?: string
  plain?: boolean
  multiline?: boolean
  hint?: Key
}

export function StaticField({ value, as: Tag = 'span', className, plain }: FieldProps) {
  if (!value) return null
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: plain ? escape(value) : value }} />
}

export type RenderApi = {
  editable: boolean
  Field: (p: FieldProps) => React.ReactNode
  blockProps: (block: Block) => HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>
  itemProps: (block: Block, itemId: string) => HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>
}

export const staticApi: RenderApi = {
  editable: false,
  Field: StaticField,
  blockProps: (block) => ({ 'data-block': block.id }),
  itemProps: () => ({}),
}

export const RenderCtx = createContext<RenderApi>(staticApi)
export const useRender = () => useContext(RenderCtx)

export const StyleCtx = createContext<Pick<Theme, 'entry' | 'skills' | 'pairs' | 'identity'> & { lang: string }>({ entry: 'stacked', skills: 'block', pairs: 'lines', identity: 'stacked', lang: 'fr' })
export const useStyle = () => useContext(StyleCtx)
