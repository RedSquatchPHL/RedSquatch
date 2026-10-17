'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Briefcase } from 'lucide-react';
import Bi from '@/components/tonatiuh/Bi';
import s from './patio.module.css';

/* Interceptor — the post-login fork. One decision, two doors:
   Casa    → /hs/dashboard (HomeSquatch)
   Oficina → /ws/dashboard (WorkSquatch)
   Tōnatiuh OS dark-glass cards; replaces the old courtyard photo + hotspots. */
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
      <div className={s.wall} aria-hidden />
      <div className={s.sun} aria-hidden />

      <div className={s.content}>
        <h1 className={s.title}>
          <Bi es="¿A dónde hoy?" en="Where to today?" title />
        </h1>

        <div className={s.doors}>
          <button
            type="button"
            className={`${s.door} ${chosen === 'casa' ? s.doorChosen : ''}`}
            onClick={() => choose('casa')}
            aria-label="Casa — enter HomeSquatch"
          >
            <span className={s.doorIcon}><Home size={30} /></span>
            <span className={s.doorName}><Bi es="Casa" en="Home" /></span>
            <span className={s.doorDesc}>HomeSquatch</span>
          </button>

          <button
            type="button"
            className={`${s.door} ${chosen === 'oficina' ? s.doorChosen : ''}`}
            onClick={() => choose('oficina')}
            aria-label="Oficina — enter WorkSquatch"
          >
            <span className={s.doorIcon}><Briefcase size={30} /></span>
            <span className={s.doorName}><Bi es="Oficina" en="Office" /></span>
            <span className={s.doorDesc}>WorkSquatch</span>
          </button>
        </div>
      </div>
    </main>
  );
}
