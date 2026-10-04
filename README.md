# Marbre

[Lire en français](README.fr.md)

Marbre is a free, open source CV editor. You compose the page as freely as in a layout tool, and Marbre shows what hiring software will actually read from the PDF.

Everything runs in the browser. There is no account and no server: your CVs stay in the browser or in a folder on your disk, as readable JSON.

## What it does

- **Two editing modes.** In structured mode you type directly on the page and the layout follows: columns, sections, entries, bullets. In free mode every block is placed to the millimetre with handles, snapping and rotation, and a reading thread fixes the order hiring software will follow.
- **ATS lens.** Marbre measures the rendered page and simulates three readers:
  - **Document order:** what pypdf, xpdf in raw mode and most parsers follow.
  - **pdfminer:** a TypeScript port of the pdfminer layout analysis, the most used extraction library.
  - **Row by row:** what pdfplumber does by default.

  Problems show up as proof marks in the margin: columns mixed together, a date attached to the wrong block, text that is too small, low contrast, an overflowing page.
- **Variants.** A variant adapts the base CV to a job offer or a language and stores only what changes. Proofing checks the keywords of each offer.
- **Proofing.** Words to avoid, emoji, French non-breaking spaces, double spaces, brackets.
- **Templates.** Five templates, each one exported and checked by the test suite: Signal, One column, Swiss grid, Editorial, Technical.
- **Open formats.** Native `.marbre.json` files, plus JSON Resume import and export.

## Why the ATS lens can be trusted

The pdfminer port is tested against `pdfminer.six` itself. The fixtures in `src/ats/fixtures` hold the raw characters of real PDFs, together with the text boxes pdfminer.six produced from them. The port must return the same boxes in the same order.

The in-browser measurement was also compared with pdfminer.six on exported PDFs, and gave the same reading order block for block.

Rules learned on real CVs are built into the renderer:
- **Fonts:** only static font files, because variable fonts get embedded as Type 3 and glue words together.
- **Bullets:** markers are drawn rather than typed, so each bullet stays in a single text box.
- **Dates:** placed next to their title by default.
- **Positioning:** no positioned text in structured mode, because Chrome paints positioned elements after everything else.

## Getting started

```sh
npm install
npm run dev
```

Open the address Vite prints. Pick a template, or import a `.marbre.json` or JSON Resume file.

For a PDF, use Print to PDF from a Chromium browser (Chrome, Edge, Brave), with no margins and background graphics on.

## Command line

The CLI renders with the same engine in a headless Chrome or Edge, then checks every PDF.

```sh
npm run build
node cli/bin.mjs export my-cv.marbre.json --all --out pdf
node cli/bin.mjs verify pdf/my-cv.pdf
node cli/bin.mjs variant my-cv.marbre.json offer.marbre.json
```

`export --all` produces one PDF per variant. For each PDF it checks:
- the page count;
- the absence of Type 3 fonts;
- that every title, date and bullet starts its own line in the extracted text;
- the ATS lens verdict.

## Development

```sh
npm run check   # lint, types, unit tests
npm run e2e     # Playwright, desktop and mobile
npm run fonts   # regenerate font loaders after editing src/render/fontLibrary.ts
```

Read `AGENTS.md` and `DESIGN.md` before contributing. Comments are one line at most and a lint rule enforces it.

## Licence

MIT
