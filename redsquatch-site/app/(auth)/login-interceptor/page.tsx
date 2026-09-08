'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import s from './patio.module.css';

/* Patio — the post-login courtyard. One decision, two archways:
   Casa (left)   → /hs/dashboard
   Oficina (right) → /ws/dashboard
   The signs are carved into the photo; wide screens get transparent hotspots
   over the arches, narrow screens get two stacked labelled doors. */
type Door = 'casa' | 'oficina';

export default function PatioInterceptor() {
  const router = useRouter();
  const [chosen, setChosen] = useState<Door | null>(null);

  const choose = (door: Door) => {
    if (chosen) return;
    setChosen(door);
    setTimeout(() => {
      router.push(door === 'oficina' ? '/ws/dashboard' : '/hs/dashboard');
    }, 340);
  };

  return (
    <main className={s.patio}>
      <div className={s.backdrop} />
      <div className={s.warmth} />
      <div className={s.dapple} aria-hidden />
      <div className={s.fountain} aria-hidden />

      {/* wide screens: hotspots over the archways in the photo */}
      <div className={s.arches}>
        <button
          className={`${s.arch} ${s.archCasa} ${chosen === 'casa' ? s.archChosen : ''}`}
          onClick={() => choose('casa')}
          aria-label="Casa — enter HomeSquatch"
        />
        <button
          className={`${s.arch} ${s.archOficina} ${chosen === 'oficina' ? s.archChosen : ''}`}
          onClick={() => choose('oficina')}
          aria-label="Oficina — enter WorkSquatch"
        />
      </div>

      {/* narrow screens: stacked labelled doors */}
      <div className={s.doors}>
        <button
          className={`${s.door} ${s.casa} ${chosen === 'casa' ? s.doorChosen : ''}`}
          onClick={() => choose('casa')}
          aria-label="Casa — enter HomeSquatch"
        >
          <span className={s.doorLabel}>Casa</span>
          <span className={s.doorHint}>{chosen === 'casa' ? 'Entrando…' : 'Personal'}</span>
        </button>
        <button
          className={`${s.door} ${s.oficina} ${chosen === 'oficina' ? s.doorChosen : ''}`}
          onClick={() => choose('oficina')}
          aria-label="Oficina — enter WorkSquatch"
        >
          <span className={s.doorLabel}>Oficina</span>
          <span className={s.doorHint}>{chosen === 'oficina' ? 'Entrando…' : 'Consulting'}</span>
        </button>
      </div>
    </main>
  );
}
