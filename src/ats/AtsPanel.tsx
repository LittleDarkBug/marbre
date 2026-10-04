import { useState } from 'react'
import { useT, type Key } from '../i18n'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { useEditorUi } from '../editor/uiState'
import { Btn, Section, Segmented } from '../ui/kit'
import type { Issue } from './analyze'
import { useAts } from './store'

type Reader = 'miner' | 'stream' | 'rows'

export function issueText(t: (k: Key, v?: Record<string, string | number>) => string, issue: Issue) {
  return t(`ats.issue.${issue.code}`, issue.params)
}

export function AtsPanel({ doc }: { doc: Doc }) {
  const t = useT()
  const reading = useAts((s) => s.reading)
  const select = useDoc((s) => s.select)
  const lens = useEditorUi((s) => s.lens)
  const toggleLens = useEditorUi((s) => s.toggleLens)
  const [reader, setReader] = useState<Reader>('miner')
  if (!reading) return <Section title={t('panel.ats')}><p className="insp-note">{t('ats.reading')}</p></Section>
  const errors = reading.issues.filter((i) => i.severity === 'error').length
  const warnings = reading.issues.filter((i) => i.severity === 'warning').length
  const text = reader === 'miner' ? reading.miner.map((b) => b.text).join('\n\n') : reader === 'stream' ? reading.stream : reading.rows
  return (
    <div className="ats">
      <Section title={t('panel.ats')} aside={<Btn icon="scan" label={t('ats.lens')} pressed={lens} onClick={toggleLens} />}>
        <p className={`ats-verdict${errors ? ' is-bad' : ''}`}>
          {errors ? t('ats.verdict.errors', { n: errors }) : warnings ? t('ats.verdict.warnings', { n: warnings }) : t('ats.verdict.ok')}
        </p>
        <p className="insp-note">{t('ats.help', { name: doc.name })}</p>
      </Section>
      <Section title={t('ats.marks')}>
        {reading.issues.length === 0 ? (
          <p className="insp-note">{t('ats.none')}</p>
        ) : (
          <ol className="ats-issues">
            {reading.issues.map((issue, i) => (
              <li key={`${issue.code}-${issue.block ?? i}`} className={`ats-issue is-${issue.severity}`}>
                <span className="ats-mark" aria-hidden="true">{i + 1}</span>
                <span className="ats-sev">{t(`ats.sev.${issue.severity}`)}</span>
                {issue.block ? (
                  <button type="button" className="ats-msg" onClick={() => select({ blockId: issue.block! })}>{issueText(t, issue)}</button>
                ) : (
                  <span className="ats-msg">{issueText(t, issue)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title={t('ats.extracted')}>
        <Segmented
          label={t('ats.reader')}
          value={reader}
          options={[
            { value: 'miner', label: t('ats.reader.miner') },
            { value: 'stream', label: t('ats.reader.stream') },
            { value: 'rows', label: t('ats.reader.rows') },
          ]}
          onChange={setReader}
        />
        <p className="insp-note">{t(`ats.reader.${reader}.help`)}</p>
        <pre className="ats-text">{text}</pre>
      </Section>
    </div>
  )
}
