# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single user (the site owner, "Darryl" in prior working sessions). RedSquatch is a personal ops site with a `/hs` ("HomeSquatch") side for home/personal life management and a `/ws` ("WorkSquatch") side for work. **Scope broadened [Confirmed]: both `/hs` and `/ws` are in scope for this product record**, though active visual redesign work is `/ws`-focused as of this writing — see Capabilities and Constraints for per-section status. [Confirmed: personal use, not shared with household members.]

For `/ws` specifically: the owner is a solo BA/PO (Business Analyst / Product Owner) hybrid at a day job (Lincoln Financial), with end-to-end stewardship across intake → build → test → deploy → validation on several concurrent workstreams. `/ws` is where that work is manually tracked; it is a visibility/navigation layer over work already being done, not a separate system of record duplicating an external tool.

## Product Purpose

`/hs` is a personal life-management dashboard: goals and task tracking (with a work/home/personal context switcher shared with `/ws`), home maintenance reminders, a tools panel, a sports section, a downtime/games area, small utility widgets (quote of the day, history-on-this-day, weather), and a kitchen manager (Cocina de Salsa: pantry inventory, salsa recipe book, shopping list). It also hosts personal-interest trackers — a Mexican citizenship process tracker, a Spanish tutor/learning tool, and a fan tracker (Pedro) — that are content features of the dashboard, not a separate product.

`/ws` is a personal work-ops hub: a live drag-and-drop kanban (`/ws/work`) tracking cross-context tasks (Lincoln / RedSquatch / Personal), goal and milestone tracking with a career-trajectory board (`/ws/goals`), a landing overview summarizing goals and open ServiceNow-imported work tickets (`/ws/dashboard`), personal utility tools — a multi-language code/notes scratchpad, file transfer, and an ebook library (`/ws/tools`) — BA skill-practice applets (BABOK guide, glossary, user-story and acceptance-criteria games, elicitation and MoSCoW practice) (`/ws/batools`), and job-application/resume tracking (`/ws/jobsearch`). Quick context-switching between concurrent workstreams and status/ownership visibility "at a glance" are the core operating needs, not data entry — most `/ws` surfaces already have real CRUD elsewhere; the design problem is navigation and legibility, not building new forms.

## Positioning

A single personal hub that blends practical ops (home maintenance, work tracking, goals, tools) with the owner's actual life and career context (a Mexican citizenship journey, Spanish study, sports/fan interests on `/hs`; a specific day job and BA/PO career trajectory on `/ws`) rather than a generic to-do app — the dashboard doubles as a personal artifact, not just a utility, on both sides of the site.

## Operating Context

- Authenticated, session-gated pages (redirect to `/login` when unauthenticated) — this is a private tool, not public-facing.
- `/hs` (home/personal) and `/ws` (work) are sibling sections of the same site, sharing login and session handling.
- Shared `ContextSwitcher` component (`work` / `home` / `personal`) is used on **both** `/hs/goals` and `/ws/goals` — not `/hs`-exclusive as an earlier version of this record stated.
- Built on Next.js (App Router), client components (`'use client'`) throughout, styled with a hand-rolled CSS token/theme system (not a component library).
- Login/interceptor threshold pages (`/`, `/login-interceptor`) already carry a third, distinct visual system (sun-warmed adobe hacienda) — see [[redsquatch_gates_patio]] in working memory; not `/hs` or `/ws`, but sets a "photographic-scene, not drawn-chrome" precedent worth knowing about.

## Capabilities and Constraints

**`/hs` pages** (`app/hs/`): `dashboard`, `downtime`, `goals`, `mexican` (citizenship tracker), `sports`, `tools`, `cocina` (kitchen manager), plus shared `layout.tsx`.
- Current visual system: a Mayan-ruins/cenote/jungle motif (`cenote-tokens.css`, `cenote-variables.css`, `cenote-background.css`, `cenote-elements.css`, `aztec-command.css`, `homesquatch-theme.css`, `components/cenote/`, `components/aztec/`) threaded through ~30 files, including the Mexico-specific trackers. [Confirmed: this entire visual system — including on the Mexico-content trackers — is in scope to be replaced, not just the dashboard shell.]
- Theme supports day/dusk/midnight phase variants (`homesquatch-phase-*` classes) and a light/dark `[data-theme="day"]` override — this phase/day-night mechanism is a structural feature to preserve, only its visual expression changes.
- Widgets (`QuoteWidget`, `HistoryWidget`, `WeatherWidget`), trackers (`MexicoCitizenshipTracker`, `PedroFanTracker`, `SpanishTutor`), Cocina de Salsa (`CocinaApp` and its Dashboard/Pantry/Salsas/RecipeDetail/Shopping views), and all functional behavior are durable product features — the rework is a visual reskin, not a feature or content change.
- Cocina de Salsa (`/hs/cocina`): pantry inventory with storage-condition tracking, a salsa recipe book (heat level, prep time, tags, star rating, pantry-match percentage per recipe), a shopping list ("generate from recipe" for missing ingredients, trip finalize/clear), and a server-side recipe importer that pulls schema.org JSON-LD from a pasted URL or falls back to scraping generic recipe HTML (og: meta tags, ingredient/instruction containers) for sites without structured data.
- Cocina has its own bespoke visual system (`cocina-theme.css`, dedicated display/sans fonts, a dark "kitchen" mode with a translucent hero photo) — separate from the Mayan/cenote motif above, not part of any `/hs` reskin scope unless explicitly extended there.
- **A prior `/hs` reskin direction ("Cuba Libre," a beach-bar theme, comp-only at design.redsquatch.com) is discontinued.** [Confirmed: not the direction to resume.] `/hs`'s next visual direction is undecided as of this writing — do not infer or invent one; the current Mayan/cenote motif remains live and unchanged until a new direction is chosen.

**`/ws` pages** (`app/ws/`): `work`, `goals`, `dashboard`, `tools`, `batools`, `jobsearch`, plus shared `layout.tsx`.
- Current visual system: the same dark-obsidian Aztec system as `/hs` (`aztec-command.css`, `AztecHeader`/`AztecPanel`/`AztecMotion` components, `#0f0f0f` obsidian + copper/jade/stone) — in scope to be replaced, same as `/hs`'s cenote motif.
- **New direction, underway [Confirmed]**: a "sun-warmed Mexican hacienda + modern command center" system — terracotta-dominant background (matte plaster texture via grayscale-noise hue-mapped with `mix-blend-mode: color`, not multiply/overlay stacking, which reads flat/glossy), cream panels for content, oxidized copper as genuinely sparse structural accent (not repeated decoration), reclaimed-wood-tone panel framing, sharp corners throughout (no `border-radius`, no glassmorphism), Mexicala self-hosted font for wordmarks/branding only, Inter for body/UI, JetBrains Mono for numbers/dates/IDs. Guiding principle: **the room/chrome carries the cultural identity; the actual data stays like a clean modern dashboard** — do not stamp Aztec/papel-picado motifs onto individual data points. Reference photo: `/home/RedSquatch/Images/WSOffice.jpeg` (a real hacienda home-office — terracotta plaster walls, dark wood beams/desk, one copper pendant lamp, laser-cut geometric wood screens used as literal doors/cabinet fronts not decoration, potted herbs, a reef aquarium; its own monitors show a completely ordinary dark code/chart dashboard, which is the evidence behind the "room carries culture, screen stays modern" principle).
- **Per-page status as of this writing**: `/ws/tools` — reskin complete and live (real code, pushed to master). `/ws/work` and `/ws/goals` — new overview/navigator concepts designed and iterated via SuperDesign mockups (not yet built as real code or deployed); the underlying kanban (`/ws/work`) and goals CRUD (`/ws/goals`) stay live/fully editable regardless — the SuperDesign work adds a read-only overview layer above them, it does not replace their editability. `/ws/dashboard`, `/ws/batools`, `/ws/jobsearch` — not yet started.
- `/ws/work`: live drag-and-drop kanban (`components/tasks/KanbanBoard.tsx`, `/api/client/task-board`) — columns, swimlanes, full CRUD. Not a mockup; a real system of record.
- `/ws/goals`: live goal CRUD with milestones and progress (`components/GoalsPanel.tsx`, `/api/client/goals` + `/api/client/milestones`), plus a separate Career Trajectory Stay/Internal/External kanban (`components/work/TasksBoard.tsx`) on the same page.
- `/ws/dashboard`: a real, already-existing overview pattern — paginated goals summary (progress bars) + paginated ServiceNow-imported open work-items summary (`/api/client/work-items`, freeform status matched loosely for "closed", e.g. "Closed - Complete") + a `StoneTile` quick-nav rail — functionally close to what the SuperDesign "Work"/"Goals" overview drafts independently arrived at, but this page's "work items" concept is ServiceNow tickets, a different data source than the `/ws/work` kanban tasks. Reconciling that distinction (or not) is an open design question for whenever this page is reskinned.
- `/ws/tools`: three independent, fully-interactive utility widgets, not a status-tracking surface — `DevelopmentWidget` (a full Prism-syntax-highlighted code/notes editor across 20 languages, auto-saving, multi-tab; its actual editing surface and syntax-legend sidebar stay intentionally dark per the room/screen principle above, only its tab-bar/toolbar/footer chrome went light), `FileTransferPanel` (drag/drop upload, 1GB/file cap), `BookLibrary` (ebook shelf, in-app reader).
- `/ws/batools`: BA skill-practice applets — BABOK Guide v3 reference, BA glossary, a user-story evaluation game, an acceptance-criteria matching challenge, an elicitation-technique matcher, a MoSCoW prioritization challenge.
- `/ws/jobsearch`: job application and resume tracking.
- SuperDesign (external hosted mockup tool, per-team credit-metered) is used for exploratory `/ws` UX/layout iteration; direct in-repo implementation (this skill, Impeccable) is used once a direction is settled or when SuperDesign credits are unavailable — see working-memory note [[redsquatch_superdesign_credit_conservation]] for the standing preference on when to use which.

## Brand Commitments

- Section name "HomeSquatch" (shown in the `/hs` dashboard header) is an established, kept name — not part of any `/hs` visual rework.
- Section name "WorkSquatch" (used as the `/ws` wordmark in the new hacienda direction) is likewise an established, kept name.
- Parent site name "RedSquatch" / "RedSquatchPHL" is fixed and out of scope.

## Evidence on Hand

- `/ws`: `/home/RedSquatch/Images/WSOffice.jpeg` — the reference hacienda-office photo driving the new `/ws` visual direction (see Capabilities and Constraints above for what it shows and why it matters).
- `/hs`: no user-supplied brand assets, photography, or reference imagery on hand for a new direction as of this writing — the prior "Cuba Libre" coastal reference material is discontinued along with that direction. [Inferred: none seen in repo for whatever comes next; do not assume the coastal reference still applies.]

## Product Principles

- This is a personal tool for one user — optimize for the owner's own daily use and taste, not broad audience legibility.
- Visual identity should feel distinct per life-context: `/hs` (home) and `/ws` (work) read differently by design; any redesign should preserve that contrast between sections, not unify them into one look.
- Functional trackers and workstreams are genuine personal content, not filler — on `/hs` that's the citizenship/language/fandom trackers; on `/ws` that's the actual kanban, goals, and career-trajectory data. The visual world should feel appropriate to sit alongside real content, not clash with it or feel like a costume worn over serious data.
- Reskin, don't rebuild: preserve layout structure, data, and behavior; change color, texture, motif, and decorative chrome. On `/ws` specifically, this also means preserving live editability where it already exists (the kanban, goals CRUD) — new overview/navigator surfaces add a display layer, they don't replace the editable ones.
- `/ws`'s governing design principle: the room/chrome carries cultural identity; the data stays legible and modern. Don't let decorative motifs (papel picado, carved glyphs, stone textures) touch individual data points — reserve them for structural, one-off moments (a single divider, the page background) rather than repeating decoration.
