'use client';

import { useEffect, useState } from 'react';
import { glp1Fetch } from '@/components/trackers/glp1/shared';

function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

export default function HealthCountdown() {
  const [target, setTarget] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    glp1Fetch<{ countdown_target?: string | null }>('/profile')
      .then(p => {
        if (p.countdown_target) setTarget(new Date(p.countdown_target));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!target) return;
    const update = () => setRemaining(formatCountdown(target.getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!loaded || !target) return null;

  if (!remaining) {
    return (
      <span className="text-xs font-mono" style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>
        Goal reached!
      </span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const { d, h, m, s } = remaining;

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm" style={{ color: 'var(--rs-accent)', textShadow: '0 0 10px rgba(var(--rs-accent-rgb),0.3)' }}>
      {d > 0 && (
        <>
          <span><strong>{d}</strong><span className="text-xs opacity-60">d</span></span>
          <span className="opacity-30">·</span>
        </>
      )}
      <span><strong>{pad(h)}</strong><span className="text-xs opacity-60">h</span></span>
      <span className="opacity-30">:</span>
      <span><strong>{pad(m)}</strong><span className="text-xs opacity-60">m</span></span>
      <span className="opacity-30">:</span>
      <span><strong>{pad(s)}</strong><span className="text-xs opacity-60">s</span></span>
    </div>
  );
}
