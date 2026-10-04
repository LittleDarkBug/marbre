import { z } from 'zod'

export const SCHEMA_VERSION = 1

const id = z.string().min(1)
const rich = z.string()

export const Contact = z.object({
  id,
  kind: z.enum(['phone', 'email', 'location', 'linkedin', 'github', 'website', 'other']),
  text: z.string(),
  href: z.string().optional(),
})

export const Highlight = z.object({ id, icon: z.string().optional(), text: z.string() })

export const Bullet = z.object({ id, text: rich })

export const Entry = z.object({
  id,
  title: rich,
  subtitle: rich.default(''),
  org: rich.default(''),
  meta: rich.default(''),
  dates: z.string().default(''),
  tags: z.string().default(''),
  body: rich.default(''),
  bullets: z.array(Bullet).default([]),
})

export const SkillGroup = z.object({ id, label: z.string(), items: z.string() })

export const Pair = z.object({ id, key: rich, value: rich })

const base = { id, heading: z.string().default(''), hidden: z.boolean().default(false) }

export const IdentityBlock = z.object({
  ...base,
  type: z.literal('identity'),
  name: z.string(),
  title: z.string().default(''),
  highlights: z.array(Highlight).default([]),
  contacts: z.array(Contact).default([]),
})

export const TextBlock = z.object({ ...base, type: z.literal('text'), body: rich })

export const EntriesBlock = z.object({
  ...base,
  type: z.literal('entries'),
  kind: z.enum(['experience', 'education', 'project', 'other']),
  items: z.array(Entry),
})

export const SkillsBlock = z.object({ ...base, type: z.literal('skills'), groups: z.array(SkillGroup) })

export const PairsBlock = z.object({ ...base, type: z.literal('pairs'), items: z.array(Pair) })

export const Block = z.discriminatedUnion('type', [IdentityBlock, TextBlock, EntriesBlock, SkillsBlock, PairsBlock])

export const FontRole = z.enum(['display', 'heading', 'body', 'accent'])

export const Theme = z.object({
  fonts: z.record(FontRole, z.string()),
  colors: z.object({
    ink: z.string(),
    accent: z.string(),
    paper: z.string(),
    panel: z.string(),
    highlight: z.string(),
  }),
  size: z.object({
    name: z.number(),
    title: z.number(),
    heading: z.number(),
    body: z.number(),
    small: z.number(),
  }),
  weight: z.object({ body: z.number(), strong: z.number() }),
  leading: z.number(),
  spacing: z.object({ section: z.number(), item: z.number(), line: z.number() }),
  headingCase: z.enum(['upper', 'none']),
  nameCase: z.enum(['upper', 'none']).default('upper'),
  datePlacement: z.enum(['inline', 'right']),
  rule: z.enum(['none', 'under-identity', 'under-headings']),
  identity: z.enum(['stacked', 'inline']).default('stacked'),
  entry: z.enum(['stacked', 'split']).default('stacked'),
  skills: z.enum(['block', 'inline']).default('block'),
  pairs: z.enum(['lines', 'inline']).default('lines'),
  headings: z.enum(['stack', 'rail']).default('stack'),
  bullets: z.enum(['drawn', 'text']).default('drawn'),
})

export const Column = z.object({
  id,
  width: z.number().positive(),
  unit: z.enum(['fr', 'mm']),
  panel: z.boolean().default(false),
  blocks: z.array(id),
})

export const Frame = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  rotate: z.number().default(0),
  z: z.number().default(0),
})

export const Decor = z.object({
  id,
  kind: z.enum(['rule', 'rect', 'ellipse', 'icon', 'image']),
  frame: Frame,
  color: z.string().default('accent'),
  stroke: z.number().default(0.4),
  fill: z.boolean().default(true),
  icon: z.string().optional(),
  src: z.string().optional(),
})

export const Layout = z.object({
  mode: z.enum(['flow', 'free']),
  columns: z.array(Column),
  gutter: z.number(),
  frames: z.record(id, Frame).default({}),
  order: z.array(id).default([]),
  decor: z.array(Decor).default([]),
})

export const Page = z.object({
  format: z.enum(['A4', 'Letter']),
  fit: z.enum(['one', 'flow']).default('one'),
  margin: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
})

export const Override = z.object({
  path: z.array(z.string()),
  op: z.enum(['set', 'order', 'hide']),
  value: z.unknown().optional(),
})

export const Variant = z.object({
  id,
  name: z.string(),
  lang: z.enum(['fr', 'en']).optional(),
  overrides: z.array(Override).default([]),
})

export const Rules = z.object({
  forbidden: z.array(z.string()).default([]),
  frenchSpacing: z.boolean().default(false),
  maxParentheses: z.number().default(3),
  keywords: z.array(z.string()).default([]),
})

export const Doc = z.object({
  version: z.literal(SCHEMA_VERSION),
  id,
  name: z.string(),
  lang: z.enum(['fr', 'en']),
  updatedAt: z.string(),
  page: Page,
  theme: Theme,
  layout: Layout,
  blocks: z.array(Block),
  variants: z.array(Variant).default([]),
  rules: Rules.default({ forbidden: [], frenchSpacing: false, maxParentheses: 3, keywords: [] }),
})

export type Contact = z.infer<typeof Contact>
export type Highlight = z.infer<typeof Highlight>
export type Bullet = z.infer<typeof Bullet>
export type Entry = z.infer<typeof Entry>
export type SkillGroup = z.infer<typeof SkillGroup>
export type Pair = z.infer<typeof Pair>
export type IdentityBlock = z.infer<typeof IdentityBlock>
export type TextBlock = z.infer<typeof TextBlock>
export type EntriesBlock = z.infer<typeof EntriesBlock>
export type SkillsBlock = z.infer<typeof SkillsBlock>
export type PairsBlock = z.infer<typeof PairsBlock>
export type Block = z.infer<typeof Block>
export type BlockType = Block['type']
export type FontRole = z.infer<typeof FontRole>
export type Theme = z.infer<typeof Theme>
export type Column = z.infer<typeof Column>
export type Frame = z.infer<typeof Frame>
export type Decor = z.infer<typeof Decor>
export type Layout = z.infer<typeof Layout>
export type Page = z.infer<typeof Page>
export type Override = z.infer<typeof Override>
export type Variant = z.infer<typeof Variant>
export type Rules = z.infer<typeof Rules>
export type Doc = z.infer<typeof Doc>
