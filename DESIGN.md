# Marbre design

## Concept
A typesetting workshop. The workspace is the marble table where pages were composed, the CV is a proof, and every check speaks the language of proofreading marks.

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| `--stone` | `#D8D2C6` | `#121110` | workspace ground |
| `--stone-2` | `#CBC4B6` | `#1C1A17` | panels, rulers |
| `--ink` | `#15120E` | `#E9E4D9` | text, hairlines |
| `--ink-2` | `#4A443B` | `#B5AEA1` | secondary text, 4.5:1 minimum |
| `--paper` | `#FBFAF7` | `#FBFAF7` | the page, always paper |
| `--proof` | `#C8321A` | `#FF6A4D` | proofreading marks only: ATS issues, overflow, rule breaks |

The red is never decoration. If nothing is wrong, the screen has no red.

## Type
- Interface: Schibsted Grotesk 400, 500, 700, 900.
- Measures, rulers, counters, shortcuts: Fragment Mono.
- Menus and labels: small caps, tabular figures for every number.

## Graphic grammar
- 1 px hairlines in ink. No shadows, no gradients, no blur, no glass, no rounded pills, no coloured card borders.
- Selection shows crop marks at the corners, not a box.
- Rulers in millimetres and points, registration crosses at the page corners.
- Buttons are rectangles of text with a hairline, inverted on press.

## Signature interactions
- Reading thread: a taut line links blocks in the order an ATS reads them, numbered in the margin.
- Proof marks: issues sit in the margin as proofreading signs, a hairline leads to the faulty element.
- Composing stick: overflow reads as a full composing stick, a line gauge in the margin.

## Motion
Short and mechanical: a rail, a stop, a press. No bounce, no wobble, no parallax for its own sake. Everything works with `prefers-reduced-motion`.

## Responsive
Fully usable from 320 px to 2560 px, editing included. Below 900 px, panels become bottom drawers, the page fits the width, pinch zooms, touch targets are 44 px minimum.

## Forbidden
Inter, Space Grotesk, Geist, Poppins, Roboto; blue, indigo, violet, teal accents; gradients; emoji; em dashes; drop shadows; glassmorphism; pill buttons; coloured left-border cards; stat blocks.
