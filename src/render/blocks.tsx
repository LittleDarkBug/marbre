import type { Block, EntriesBlock, Entry, IdentityBlock, PairsBlock, SkillsBlock, TextBlock } from '../model/schema'
import { useRender } from './context'
import { CONTACT_ICON, iconSvg } from './icons'

const Icon = ({ name }: { name?: string }) =>
  name ? <span className="mb-ico" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg(name) }} /> : null

function Heading({ block }: { block: Block }) {
  const { Field, editable } = useRender()
  if (!block.heading && !editable) return null
  return <Field as="h2" className="mb-h2" path={['blocks', block.id, 'heading']} value={block.heading} plain hint="hint.heading" />
}

function Identity({ block }: { block: IdentityBlock }) {
  const { Field, blockProps, itemProps, editable } = useRender()
  const p = ['blocks', block.id]
  return (
    <header className="mb-block mb-id" {...blockProps(block)}>
      <Field as="h1" className="mb-name" path={[...p, 'name']} value={block.name} plain hint="hint.name" />
      <Field as="p" className="mb-title" path={[...p, 'title']} value={block.title} plain hint="hint.title" />
      {(block.highlights.length > 0 || editable) && (
        <ul className="mb-keys">
          {block.highlights.map((h) => (
            <li key={h.id} {...itemProps(block, h.id)}>
              <Icon name={h.icon} />
              <Field path={[...p, 'highlights', h.id, 'text']} value={h.text} plain />
            </li>
          ))}
        </ul>
      )}
      {block.contacts.length > 0 && (
        <ul className="mb-contacts">
          {block.contacts.map((c) => (
            <li key={c.id} {...itemProps(block, c.id)}>
              <Icon name={CONTACT_ICON[c.kind]} />
              {c.href && !editable ? (
                <a href={c.href}>{c.text}</a>
              ) : (
                <Field path={[...p, 'contacts', c.id, 'text']} value={c.text} plain />
              )}
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

function Text({ block }: { block: TextBlock }) {
  const { Field, blockProps } = useRender()
  return (
    <section className="mb-block mb-sec" {...blockProps(block)}>
      <Heading block={block} />
      <Field as="div" className="mb-text" path={['blocks', block.id, 'body']} value={block.body} multiline hint="hint.text" />
    </section>
  )
}

function EntryView({ block, entry }: { block: EntriesBlock; entry: Entry }) {
  const { Field, itemProps } = useRender()
  const p = ['blocks', block.id, 'items', entry.id]
  const isProject = block.kind === 'project'
  const stacked = block.kind === 'education'
  const side = stacked ? null : isProject ? (
    <Field className="mb-tags" path={[...p, 'tags']} value={entry.tags} plain hint="hint.tags" />
  ) : (
    <Field className="mb-dates" path={[...p, 'dates']} value={entry.dates} plain hint="hint.dates" />
  )
  const hasOrg = entry.org || entry.meta
  return (
    <article className={`mb-entry mb-${block.kind}`} {...itemProps(block, entry.id)}>
      <div className="mb-head">
        <Field as="h3" className="mb-h3" path={[...p, 'title']} value={entry.title} hint="hint.entry" />
        {side}
      </div>
      <Field as="p" className="mb-sub" path={[...p, 'subtitle']} value={entry.subtitle} hint="hint.subtitle" />
      {(stacked || (isProject && entry.dates)) && <Field as="p" className="mb-dates mb-dates-line" path={[...p, 'dates']} value={entry.dates} plain hint="hint.dates" />}
      {hasOrg && (
        <p className="mb-org">
          <Field as="b" path={[...p, 'org']} value={entry.org} hint="hint.org" />
          {entry.org && entry.meta ? ' · ' : ''}
          <Field path={[...p, 'meta']} value={entry.meta} hint="hint.meta" />
        </p>
      )}
      <Field as="p" className="mb-desc" path={[...p, 'body']} value={entry.body} multiline hint="hint.body" />
      {entry.bullets.length > 0 && (
        <ul className="mb-pts">
          {entry.bullets.map((b) => (
            <Field key={b.id} as="li" path={[...p, 'bullets', b.id, 'text']} value={b.text} hint="hint.bullet" />
          ))}
        </ul>
      )}
    </article>
  )
}

function Entries({ block }: { block: EntriesBlock }) {
  const { blockProps } = useRender()
  return (
    <section className="mb-block mb-sec" {...blockProps(block)}>
      <Heading block={block} />
      {block.items.map((e) => (
        <EntryView key={e.id} block={block} entry={e} />
      ))}
    </section>
  )
}

function Skills({ block }: { block: SkillsBlock }) {
  const { Field, blockProps, itemProps } = useRender()
  return (
    <section className="mb-block mb-sec" {...blockProps(block)}>
      <Heading block={block} />
      {block.groups.map((g) => (
        <p key={g.id} className="mb-skill" {...itemProps(block, g.id)}>
          <Field as="strong" className="mb-k" path={['blocks', block.id, 'groups', g.id, 'label']} value={g.label} plain hint="hint.label" />{' '}
          <Field className="mb-v" path={['blocks', block.id, 'groups', g.id, 'items']} value={g.items} plain hint="hint.items" />
        </p>
      ))}
    </section>
  )
}

function Pairs({ block }: { block: PairsBlock }) {
  const { Field, blockProps, itemProps } = useRender()
  return (
    <section className="mb-block mb-sec" {...blockProps(block)}>
      <Heading block={block} />
      {block.items.map((x) => (
        <p key={x.id} className="mb-pair" {...itemProps(block, x.id)}>
          <Field as="strong" path={['blocks', block.id, 'items', x.id, 'key']} value={x.key} hint="hint.key" />
          {x.key && x.value ? ' · ' : ''}
          <Field path={['blocks', block.id, 'items', x.id, 'value']} value={x.value} hint="hint.value" />
        </p>
      ))}
    </section>
  )
}

export function BlockView({ block }: { block: Block }) {
  if (block.hidden) return null
  switch (block.type) {
    case 'identity':
      return <Identity block={block} />
    case 'text':
      return <Text block={block} />
    case 'entries':
      return <Entries block={block} />
    case 'skills':
      return <Skills block={block} />
    case 'pairs':
      return <Pairs block={block} />
  }
}
