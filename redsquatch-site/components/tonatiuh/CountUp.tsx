'use client';

import { useEffect, useRef, useState } from 'react';

// Ticks a whole number up (or down) to `value` with an ease-out curve. Starts at
// 0 on both server and client so hydration matches; data that arrives later
// animates from whatever is currently shown. Reduced-motion users get the value
// immediately.
export default function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || shownRef.current === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const from = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{shown}</>;
}
