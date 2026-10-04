# Marbre design

## Intent
A product page and a tool at the level of the best consumer software: calm, precise, generous. The product itself is the visual. No metaphor, no staged machine, no decorative scene.

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FFFFFF` | `#1C1C1F` | page and panels |
| `--stone` | `#F5F5F3` | `#161618` | tiles, app chrome, workspace |
| `--stone-2` | `#EBEBE8` | `#232326` | hover, inputs, tracks |
| `--ink` | `#111111` | `#F2F2F2` | text, primary buttons |
| `--ink-2` | `#5C5C5C` | `#A8A8AD` | secondary text, 4.5:1 minimum |
| `--line` | `rgba(17,17,17,.12)` | `rgba(255,255,255,.12)` | separators |
| `--ok` | `#1E7F45` | `#4CC27F` | success, keywords found |
| `--proof` | `#D93025` | `#FF6B5E` | errors only |

Light is the default. The CV page is always white paper.

## Type
- Interface and landing: Instrument Sans 400, 500, 600, 700.
- Numbers and code: Fragment Mono.
- Display sizes are set tight: weight 600, letter-spacing about -0.04em, line-height near 1.

## Shape and depth
- Radius: 8 px for controls, 14 px for lists, 28 px for tiles; primary calls to action are fully rounded.
- Depth comes from soft, low shadows on pages and floating toolbars only.
- Separators are 1 px `--line`.

## Landing page
1. Centred statement, two calls to action, then the product shot, which straightens and grows on scroll.
2. Pinned section where one real CV recomposes between templates, a variant and a language (FLIP transitions of real blocks).
3. Side by side: the page and the text pdfminer extracts from it, linked on hover.
4. Feature tiles, each with a small live piece of interface.
5. Template rail, the workshop, a final call to action, the footer.

## Motion
Ease `cubic-bezier(0.22, 1, 0.36, 1)`, 160 to 900 ms. Motion follows scroll or user input, never loops for decoration except inside feature tiles. Everything works with `prefers-reduced-motion`.

## Responsive
Fully usable from 320 px to 2560 px, editing included. Below 760 px, panels become bottom sheets and the dock shows icons.

## Never
Emoji, em dashes, Inter, Space Grotesk, Geist, Poppins, Roboto, blue or violet accents, decorative gradients, glass effects, coloured left-border cards, stat blocks, anything taken from the author's portfolio.
