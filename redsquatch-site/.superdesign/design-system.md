# RedSquatch — Cenote / Mayan Command Center Design System

## Product context
RedSquatch is a Next.js app with two operating "modes": **WorkSquatch (`/ws/*`)** — a stone/copper "jungle command center" chrome (fixed-size stone-board panel, angular clip-path CopperPanels, bottom stone-tile toolbar) — and **HomeSquatch (`/hs/*`)** — a lighter glassmorphic chrome (`glass-header`/`glass-surface`, `MagnificationDock` floating pill nav with magnifying icons). Both modes share the underlying cenote color tokens and now share the same background photo (`jungle-bg`).

Users switch between the two modes via a dedicated "Switch" control. HS already has one (`MagnificationDock`'s `switchTo` prop, an `ArrowLeftRight` icon button that sets `localStorage['redsquatch-mode']` then navigates). WS's stone-tile `BottomToolbar` currently has no equivalent — that's the gap this round of design work fills.

## Colors (locked — from `styles/cenote-tokens.css`)
```
--stone-0: #141210   --stone-1: #231c18   --stone-2: #3a3029   --stone-3: #5f4c3c
--copper-0: #8e633f  --copper-1: #b88b63  --copper-2: #ddb08a
--copper-glow-rgb: 237, 179, 126
--moss: #4d6347      --jade: #1a3d35
--obsidian-void: #0d100d
```

## Typography
- Display/glyph: `Stardom` serif (`.glyph`)
- Console/mono (all WS chrome text): `JetBrains Mono` (`.mono`)
- HS body: `Inter`-style system sans (glass UI)

## WS Command Center chrome patterns (what this design task touches)
- **`.stone-board`**: fixed-size stone panel, `border-radius: var(--radius-command)` (1rem), layered dark gradient + heavy box-shadow. One instance wraps the whole `/ws/dashboard` page.
- **`.jungle-bg`**: full-viewport background photo (`public/images/underground-cenote-bg.png`) + dark radial/linear overlay. Applied at the page (WS) or shared layout (HS) level.
- **`CopperPanel`** (`components/cenote/CopperPanel.tsx` + `copper-panel.module.css`): angular clip-path cut corners (NOT rounded — this was explicitly reverted from rounded back to clip-path in the last design pass), copper border glow, title/subtitle/subtext slots.
- **`.stone-tile` / `.lit-tile`**: the two background gradients used by both `StoneTile` (nav rail) and `BottomToolbar` (bottom nav) — `.stone-tile` is the inactive/default look, `.lit-tile` is the active/highlighted look (warm radial glow).
- **`BottomToolbar`** (`components/cenote/BottomToolbar.tsx`): `position: fixed`, centered at viewport bottom, a row of `h-[92px] w-[72px]` square `.stone-tile` links, `rounded-[14px]`, icon (27px, lucide-react) + uppercase 10px label underneath. **Hard rule from prior session: label text must equal the destination page name** (e.g. "Goals" → `/ws/goals`), never thematic/flavor text.
- **Icons**: `lucide-react@0.105.0-alpha.4` only — note this version does NOT export `Workflow`, `BadgeCheck`, `ScanSearch`, `TriangleAlert`, `Waypoints`, `ScanEye`; verify any new icon name exists in `node_modules/lucide-react/dist/esm/icons/` before using it.

## Motion
WS chrome (`BottomToolbar`, `StoneTile`) uses only a subtle `hover:-translate-y-1` lift — no other animation. HS's `MagnificationDock` (a separate, older glassmorphic system) uses spring-physics magnification via `framer-motion` — that's intentionally a different, richer motion language than WS chrome and should NOT be copied into WS components.

## The "Switch" control (existing precedent, HS side)
`MagnificationDock`'s `DockSwitch` (see `components/MagnificationDock.tsx`): an icon-only circular glass button using `ArrowLeftRight` (lucide), on click does `localStorage.setItem('redsquatch-mode', config.mode)` then `router.push(config.href)`. HS's instance: `{ label: 'Switch', href: '/ws/dashboard', mode: 'work' }`.

This task: add the WS-side equivalent to `BottomToolbar` — visually a normal `.stone-tile` toolbar button (NOT the glass circular style — that's HS's language, not WS's), labeled to match the "label = destination" rule, pointing at `/hs/dashboard`, `mode: 'home'`.
