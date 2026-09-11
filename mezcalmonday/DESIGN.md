# Mezcal Monday design contract

Design read: a consumer directory and editorial site for mezcal drinkers, bar-goers and the bars that pour it (Las Vegas, the Bay Area, Southern California, Boston, Cape Cod, Tahoe), with a fresh premium-consumer language, leaning toward native CSS + GSAP + self-hosted Archivo and Geist, on a mineral-paper / bottle-green / agave-lime palette.

Dials: DESIGN_VARIANCE 7, MOTION_INTENSITY 6, VISUAL_DENSITY 4.

## Tokens (src/css/tokens.css)
- Light: bg #EEF1EA, surface #F8FAF4, ink #10201A, accent #C7E043 (fills only, dark text on it), accent-text #2A6A4C for text on light.
- Night: bg #0C1B16, surface #12251E, ink #EEF2E8, accent #D2E85A. Toggle in the nav, persists to `localStorage mm.theme`, defaults to `prefers-color-scheme`.
- No gradients, no glass, no grain, no pure black or white. One accent hue. Shadows tinted to the ink.
- Radius: pills for controls, 14px containers, 8px inner. Easing `--ease-out cubic-bezier(.23,1,.32,1)`; UI under 300ms; reveals 700ms.
- Type: Archivo (display, variable width; wordmark at 112% width) and Geist (body). No Inter, no serif.

## Home sections (one layout family each)
1. Split hero: copy + predictive search + quick chips left, the Featured pour sponsor panel right.
2. Leaderboard sponsor banner.
3. Region bento (6 cells, spans 4/2, 2/4, 3/3, counts are real).
4. Horizontal scroll rail of venues (Featured listings first when sold).
5. Recipes split: featured card + list.
6. Two-CTA band (Add your bar, Advertise).
Eyebrows: none. Marquees: none. Scroll cues: none. Sponsor tags ("Sponsor") are disclosure labels, not eyebrows.

## Rules
- Never invent a special, hours, prices or photos. `monday_special` is null until a bar confirms it.
- Real images only: the harvest workflow supplies BNAAA's logo and cocktail photography; venue photos are added per venue when the bar supplies them. No generated places.
- Every CTA label maps to one intent per page. No em-dashes anywhere.
- Motion must be motivated: hero entry (hierarchy), banner slide (arrival), reveals (sequence), press scale on buttons and chips (feedback). Everything off under `prefers-reduced-motion`.
- Accessibility: one h1 per page, labelled controls, ARIA combobox on search, keyboard nav in suggestions, visible focus rings, WCAG AA contrast in both themes.
