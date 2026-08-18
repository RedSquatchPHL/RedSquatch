# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single user (the site owner). RedSquatch is a personal ops site with a `/hs` ("HomeSquatch") side for home/personal life management and a `/ws` ("WorkSquatch") side for work. This effort covers `/hs` only. [Confirmed: personal use, not shared with household members.]

## Product Purpose

`/hs` is a personal life-management dashboard: goals and task tracking (with a work/home/personal context switcher shared with `/ws`), home maintenance reminders, a tools panel, a sports section, a downtime/games area, small utility widgets (quote of the day, history-on-this-day, weather), and a kitchen manager (Cocina de Salsa: pantry inventory, salsa recipe book, shopping list). It also hosts personal-interest trackers — a Mexican citizenship process tracker, a Spanish tutor/learning tool, and a fan tracker (Pedro) — that are content features of the dashboard, not a separate product.

## Positioning

A single personal hub that blends practical home-ops (goals, maintenance, tools) with the owner's actual life context (a Mexican citizenship journey, Spanish study, sports/fan interests) rather than a generic to-do app — the dashboard doubles as a personal artifact, not just a utility.

## Operating Context

- Authenticated, session-gated pages (redirect to `/login` when unauthenticated) — this is a private tool, not public-facing.
- Sibling section `/ws` (WorkSquatch) exists for work context; `/hs` is scoped to home/personal.
- Shared `ContextSwitcher` component toggles between `work` / `home` / `personal` contexts within `/hs` goals specifically.
- Built on Next.js (App Router), client components (`'use client'`) throughout, styled with a hand-rolled CSS token/theme system (not a component library).

## Capabilities and Constraints

- Existing pages under `app/hs/`: `dashboard`, `downtime`, `goals`, `mexican` (citizenship tracker), `sports`, `tools`, `cocina` (kitchen manager), plus shared `layout.tsx`.
- Current visual system: a Mayan-ruins/cenote/jungle motif (`cenote-tokens.css`, `cenote-variables.css`, `cenote-background.css`, `cenote-elements.css`, `aztec-command.css`, `homesquatch-theme.css`, `components/cenote/`, `components/aztec/`) threaded through ~30 files, including the Mexico-specific trackers. [Confirmed: this entire visual system — including on the Mexico-content trackers — is in scope to be replaced, not just the dashboard shell.]
- Theme supports day/dusk/midnight phase variants (`homesquatch-phase-*` classes) and a light/dark `[data-theme="day"]` override — this phase/day-night mechanism is a structural feature to preserve, only its visual expression changes.
- Widgets (`QuoteWidget`, `HistoryWidget`, `WeatherWidget`), trackers (`MexicoCitizenshipTracker`, `PedroFanTracker`, `SpanishTutor`), Cocina de Salsa (`CocinaApp` and its Dashboard/Pantry/Salsas/RecipeDetail/Shopping views), and all functional behavior are durable product features — the rework is a visual reskin, not a feature or content change.
- Cocina de Salsa (`/hs/cocina`): pantry inventory with storage-condition tracking, a salsa recipe book (heat level, prep time, tags, star rating, pantry-match percentage per recipe), a shopping list ("generate from recipe" for missing ingredients, trip finalize/clear), and a server-side recipe importer that pulls schema.org JSON-LD from a pasted URL or falls back to scraping generic recipe HTML (og: meta tags, ingredient/instruction containers) for sites without structured data.
- Cocina has its own bespoke visual system (`cocina-theme.css`, dedicated display/sans fonts, a dark "kitchen" mode with a translucent hero photo) — separate from the Mayan/cenote motif described above and not part of that reskin's scope unless explicitly extended there.

## Brand Commitments

- Section name "HomeSquatch" (shown in the dashboard header) is an established, kept name — not part of the visual rework.
- Parent site name "RedSquatch" / "RedSquatchPHL" is fixed and out of scope.

## Evidence on Hand

No user-supplied brand assets, photography, or reference imagery on hand for the new coastal direction as of this writing. [Inferred: none seen in repo; new-work will need to select a palette/texture approach that doesn't depend on unavailable photography, or use placeholder imagery per skill convention.]

## Product Principles

- This is a personal tool for one user — optimize for the owner's own daily use and taste, not broad audience legibility.
- Visual identity should feel distinct per life-context: `/hs` (home) reads differently from `/ws` (work) by design; the redesign should preserve that contrast, just change what `/hs` says.
- Functional trackers (citizenship, language learning, fandom) are genuine personal content, not filler — the new visual world should feel appropriate to sit alongside that content, not clash with it.
- Reskin, don't rebuild: preserve layout structure, data, and behavior; change color, texture, motif, and decorative chrome.
