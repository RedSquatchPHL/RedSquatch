'use client';

import { useEffect } from 'react';

// Same list as the hover-depth rule in app/ws/ws-fx.css. Writes the pointer
// position into --mx/--my on the hovered card so the CSS can draw a soft copper
// glow under the cursor.
const CARD =
  '[class*="_statCard__"],[class*="_launcherCard__"],[class*="_miniPanel__"],[class*="_entryCard__"],[class*="_toggleCard__"],[class*="jobsearch_card__"]';

export default function FxPointer() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = (e.target as Element | null)?.closest?.(CARD) as HTMLElement | null;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
