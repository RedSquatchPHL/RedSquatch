// Route segment config only takes effect from a Server Component — page.tsx
// under this layout is a 'use client' file, so the same export there is
// silently ignored by Next.js's build (confirmed: it still showed up as
// "○ Static" in the build output with that export in place). Setting it
// here instead applies to every page nested under /ws/work, including
// roadmap — both are personal/low-traffic pages with no reason to be
// edge-cached, so the reach is fine. See git history on app/ws/work/page.tsx
// for the "why" in more detail.
export const dynamic = 'force-dynamic';

export default function WSToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/css/forest-theme.css" />
      {children}
    </>
  );
}
