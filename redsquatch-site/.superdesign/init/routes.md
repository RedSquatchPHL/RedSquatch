# Routes (scoped to WS/HS — this repo also has `/dashboard/*` legacy routes, `/hs/*`, `/ws/*`, `/login`, `/settings`, `/logout`, not detailed here as out of scope for this task)

## `/ws/*` — WorkSquatch mode (stone/copper command-center chrome, no shared nav layout)
| Path | File | Layout |
|---|---|---|
| `/ws/dashboard` | `app/ws/dashboard/page.tsx` | `app/ws/layout.tsx` (bare) |
| `/ws/goals` | `app/ws/goals/page.tsx` | `app/ws/layout.tsx` |
| `/ws/intake` | `app/ws/intake/page.tsx` | `app/ws/layout.tsx` |
| `/ws/tools` | `app/ws/tools/page.tsx` | `app/ws/layout.tsx` |
| `/ws/work` | `app/ws/work/page.tsx` | `app/ws/layout.tsx` + `app/ws/work/layout.tsx` (adds `forest-theme.css`) |

Each page renders its own `<HeaderBrand>` + `<BottomToolbar activeItem="...">`.

## `/hs/*` — HomeSquatch mode (glassmorphic chrome, shared `MagnificationDock` nav via layout)
| Path | File |
|---|---|
| `/hs/dashboard` | `app/hs/dashboard/page.tsx` |
| `/hs/goals` | `app/hs/goals/page.tsx` |
| `/hs/sports` | `app/hs/sports/page.tsx` |
| `/hs/tools` | `app/hs/tools/page.tsx` |
| `/hs/downtime` | `app/hs/downtime/page.tsx` |

All wrapped by `app/hs/layout.tsx`, which renders `<MagnificationDock nav={HS_NAV} switchTo={HS_SWITCH} />` once — `HS_SWITCH` already points back to `/ws/dashboard` (mode `'work'`). **This task adds the missing reverse direction**: a Switch control on the WS side pointing to `/hs/dashboard` (mode `'home'`).
