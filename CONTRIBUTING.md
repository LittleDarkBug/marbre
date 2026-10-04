# Contributing

Thank you for helping. A few rules keep Marbre coherent.

## Before a change
- Read `AGENTS.md` (code rules) and `DESIGN.md` (visual rules).
- Open an issue for anything larger than a fix, so the direction can be agreed first.

## While coding
- Comments: one line at most, only when the code cannot say it. `npm run lint` rejects the rest.
- Every user-facing string goes through `src/i18n/fr.ts` and `src/i18n/en.ts`.
- No emoji and no em dash in the interface.
- Rendering changes go through `src/render` only, so the editor, print and CLI stay identical.

## Before a pull request
- `npm run check` and `npm run e2e` pass.
- If you touch rendering or the ATS lens, export every template and check them:
  `npx tsx scripts/templates.ts out && for f in out/*.json; do node cli/bin.mjs export $f --out out/pdf; done`
- If you touch `src/ats/pdfminer.ts`, regenerate a fixture with `python scripts/pdfminer-fixture.py file.pdf src/ats/fixtures/name.json`, which needs `pdfminer.six`. Fixtures must never contain real personal data.
- Attach screenshots at 320, 390, 1024 and 1440 px for any visual change.
