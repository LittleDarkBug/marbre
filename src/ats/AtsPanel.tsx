import { useT } from '../i18n'
import type { Doc } from '../model/schema'
import { Section } from '../ui/kit'

export function AtsPanel({ doc }: { doc: Doc }) {
  const t = useT()
  return (
    <Section title={t('panel.ats')}>
      <p className="insp-note">{t('ats.soon', { name: doc.name })}</p>
    </Section>
  )
}
