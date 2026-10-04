# Working on Marbre

Read `DESIGN.md` before any visual change.

## Code
- Comments: one line at most, only when the code cannot say it. No JSDoc, no docstrings, no comment that restates the code. `npm run lint` enforces it.
- TypeScript strict. No `any` unless an external API forces it.
- One renderer (`src/render`) serves the editor, the preview, print and the CLI. Never fork rendering logic.

## Text in the interface
- No emoji, no em dash. Lint enforces it on every string.
- Every user-facing string goes through `src/i18n` (French and English).

## ATS rules learned on real PDFs
- Ship static font files only. A variable font instance is embedded as Type 3 and glues words together.
- Keep dates and tags next to their title. Right-aligned, pdfminer attaches them to the neighbouring column.
- Free positioning changes the reading order. The DOM order follows the reading thread.
- No letter-spacing on text that must be extracted.

## Done means
- `npm run check` passes, `npm run e2e` passes on desktop and mobile.
- Screenshots at 320, 390, 1024 and 1440 px reviewed against `DESIGN.md`.
