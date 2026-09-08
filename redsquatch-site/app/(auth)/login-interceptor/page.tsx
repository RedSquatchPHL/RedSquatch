'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import s from './patio.module.css';

/* Patio — the post-login courtyard. One decision, two archways:
   Casa (left)    → /hs/dashboard
   Oficina (right) → /ws/dashboard
   The "Casa" / "Oficina" signs are carved into the photo; the controls are
   transparent hotspots sitting exactly over the archways. */
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
      <div className={s.frame}>
        <div className={s.warmth} />
        <div className={s.dapple} aria-hidden />
        <div className={s.fountain} aria-hidden />

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
    </main>
  );
}
