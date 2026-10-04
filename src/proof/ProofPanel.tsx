import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { getAt, setAt } from '../model/paths'
import type { Doc } from '../model/schema'
import { useDoc } from '../store/doc'
import { Btn, Field, Scrub, Section } from '../ui/kit'
import { focusPath } from '../editor/EditableField'
import { fields, fixText, keywordCoverage, proofread } from './rules'

const split = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)

export function ProofPanel({ doc }: { doc: Doc }) {
  const t = useT()
  const edit = useDoc((s) => s.edit)
  const select = useDoc((s) => s.select)
  const issues = useMemo(() => proofread(doc), [doc])
  const coverage = useMemo(() => keywordCoverage(doc, doc.rules.keywords), [doc])
  const [forbidden, setForbidden] = useState(doc.rules.forbidden.join(', '))
  const [keywords, setKeywords] = useState(doc.rules.keywords.join(', '))
  const found = coverage.filter((c) => c.found).length
  const fixable = issues.some((i) => i.code === 'spacing' || i.code === 'double')

  return (
    <div className="proof-panel">
      <Section
        title={t('proof.title')}
        aside={
          fixable ? (
            <Btn
              label={t('proof.fixAll')}
              showLabel
              tone="solid"
              onClick={() =>
                edit((d) => {
                  for (const f of fields(d)) {
                    const value = getAt(d, f.path)
                    if (typeof value === 'string') setAt(d, f.path, fixText(value, d.lang))
                  }
                })
              }
            />
          ) : undefined
        }
      >
        {issues.length === 0 ? (
          <p className="insp-note">{t('proof.none')}</p>
        ) : (
          <ol className="ats-issues">
            {issues.map((issue, i) => (
              <li key={`${issue.code}-${issue.path.join('/')}-${i}`} className="ats-issue is-warning">
                <span className="ats-mark" aria-hidden="true">{i + 1}</span>
                <span className="ats-sev">{t(`proof.code.${issue.code}`)}</span>
                {issue.path.length ? (
                  <button
                    type="button"
                    className="ats-msg"
                    onClick={() => {
                      select({ blockId: issue.path[1], itemId: issue.path[2] === 'items' || issue.path[2] === 'groups' || issue.path[2] === 'contacts' ? issue.path[3] : undefined })
                      focusPath(issue.path)
                    }}
                  >
                    {t(`proof.msg.${issue.code}`, issue.params)} <q className="proof-excerpt">{issue.excerpt}</q>
                  </button>
                ) : (
                  <span className="ats-msg">{t(`proof.msg.${issue.code}`, issue.params)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title={t('proof.keywords')}>
        <p className="insp-note">{t('proof.keywordsHelp')}</p>
        <Field label={t('proof.keywordsField')}>
          <textarea
            rows={3}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onBlur={() => edit((d) => { d.rules.keywords = split(keywords) })}
          />
        </Field>
        {coverage.length > 0 && (
          <>
            <p className="proof-score">{t('proof.coverage', { found, total: coverage.length })}</p>
            <ul className="proof-keywords">
              {coverage.map((c) => (
                <li key={c.keyword} className={c.found ? 'is-found' : 'is-missing'}>{c.keyword}</li>
              ))}
            </ul>
          </>
        )}
      </Section>
      <Section title={t('proof.rules')}>
        <Field label={t('proof.forbidden')}>
          <input type="text" value={forbidden} onChange={(e) => setForbidden(e.target.value)} onBlur={() => edit((d) => { d.rules.forbidden = split(forbidden) })} />
        </Field>
        {doc.lang === 'fr' && (
          <Btn label={t('proof.frenchSpacing')} pressed={doc.rules.frenchSpacing} onClick={() => edit((d) => { d.rules.frenchSpacing = !doc.rules.frenchSpacing })} />
        )}
        <Scrub label={t('proof.maxParentheses')} min={0} max={20} value={doc.rules.maxParentheses} onChange={(v) => edit((d) => { d.rules.maxParentheses = v })} />
      </Section>
    </div>
  )
}
