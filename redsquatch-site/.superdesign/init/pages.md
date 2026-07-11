# Page dependency trees (scoped to the pages touched by this task)

## /ws/dashboard (representative WS page — the target's sibling pages follow the identical chrome pattern)
Entry: `app/ws/dashboard/page.tsx`
Dependencies:
- `components/cenote/HeaderBrand.tsx`
- `components/cenote/StoneTile.tsx`
- `components/cenote/CopperPanel.tsx`
  - `components/cenote/copper-panel.module.css`
- `components/cenote/PipelineDiagram.tsx`
- `components/cenote/WireframeProfile.tsx`
- `components/cenote/BottomToolbar.tsx` ← **this task's target**
- `styles/cenote-elements.css` (global import, provides `.jungle-bg`, `.stone-board`, `.stone-tile`, `.lit-tile`, `.toolbar-shadow`, `.mono`, `.glyph`, `.glow-text`)
- `styles/cenote-tokens.css` / `styles/cenote-variables.css` (global imports, provide all CSS custom properties)

`app/ws/goals`, `/ws/intake`, `/ws/tools`, `/ws/work` all follow the same shape: page-specific content + the same `HeaderBrand` / `CopperPanel` / `BottomToolbar` chrome imports. Each would need the same `activeItem` list update if the toolbar's item type changes (it isn't changing shape here, just gaining one more entry).

## /hs/dashboard (reference for the existing reverse Switch)
Entry: `app/hs/dashboard/page.tsx`
Dependencies:
- `components/cenote/CopperPanel.tsx`
- `components/QuoteWidget.tsx`, `components/HistoryWidget.tsx`, `components/WeatherWidget.tsx`, `components/ThemeToggle.tsx` (glass-surface widgets, not cenote chrome — out of scope)
- Wrapped by `app/hs/layout.tsx` → `components/MagnificationDock.tsx` (renders the existing HS→WS Switch button)
