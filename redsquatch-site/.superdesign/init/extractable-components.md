# Extractable components (scoped)

## Layout Components

### BottomToolbar
- Source: `components/cenote/BottomToolbar.tsx`
- Category: layout
- Description: Fixed bottom nav for WS mode, 6 square stone-tile buttons, label = destination page name
- Extractable props: `activeItem` (string enum, default: `"dashboard"`)
- Hardcoded: all 6 item hrefs/icons/labels, `.stone-tile` styling, positioning
- **This task adds a 7th item** (Switch to HS mode) — same visual pattern as the other 6, not a new component

### MagnificationDock
- Source: `components/MagnificationDock.tsx`
- Category: layout
- Description: HS mode's floating glass nav dock with magnification physics; already has a working `switchTo` prop/`DockSwitch` sub-component that is the precedent for the WS-side control being added
- Extractable props: `nav` (array), `switchTo` (object: `label`, `href`, `mode`)
- Hardcoded: glass styling, spring-physics constants, icon set

## Basic Components

### StoneTile
- Source: `components/cenote/StoneTile.tsx`
- Category: basic
- Description: Icon + title/subtitle tile, `.lit-tile`/`.stone-tile` background depending on `isActive`, optional `href` for nav use
- Extractable props: `isActive` (boolean), `icon` (string), `title` (string), `subtitle` (string), `href` (string, optional)
- Hardcoded: icon registry, sizing

### CopperPanel
- Source: `components/cenote/CopperPanel.tsx`
- Category: basic
- Description: Angular clip-path panel with title/subtitle/subtext header slots, wraps children
- Extractable props: `title`, `subtitle`, `subtext` (all optional strings)
- Hardcoded: clip-path geometry, all colors/spacing (comes from CSS module, not props)
