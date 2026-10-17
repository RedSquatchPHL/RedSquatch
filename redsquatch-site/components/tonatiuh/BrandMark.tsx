import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import s from './BrandMark.module.css';

// Two-tone wordmark + the "OS" quick-switch between the Work and Home sides.
//   side="work": Work|Squatch, OS → /hs/dashboard   (copper accent, /ws header)
//   side="home": Home|Squatch, OS → /ws/dashboard   (tan accent, HS dashboard header)
// The wordmark links to its own side's dashboard; the OS pill switches sides.
const SIDES = {
  work: { accent: 'Work', home: '/ws/dashboard', to: '/hs/dashboard', label: 'Cambiar a HomeSquatch (Switch to HomeSquatch)' },
  home: { accent: 'Home', home: '/hs/dashboard', to: '/ws/dashboard', label: 'Cambiar a WorkSquatch (Switch to WorkSquatch)' },
} as const;

export default function BrandMark({ side }: { side: 'work' | 'home' }) {
  const cfg = SIDES[side];
  return (
    <div className={`${s.brand} ${side === 'work' ? s.work : s.home}`}>
      <Link href={cfg.home} className={s.word}>
        <span className={s.accent}>{cfg.accent}</span>Squatch
      </Link>
      <span className={s.dot} aria-hidden />
      <Link href={cfg.to} className={s.switch} title={cfg.label} aria-label={cfg.label}>
        OS
        <ArrowLeftRight size={12} aria-hidden />
      </Link>
    </div>
  );
}
