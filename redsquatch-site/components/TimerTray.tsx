'use client';

import type { WorkCard } from '@/components/WorkCard';
import { formatRemaining } from '@/components/WorkCard';
import styles from '@/styles/work.module.css';

export default function TimerTray({
  cards,
  now,
  onJumpTo,
}: {
  cards: WorkCard[];
  now: number;
  onJumpTo: (id: number) => void;
}) {
  if (cards.length === 0) return null;

  const sorted = [...cards].sort(
    (a, b) => new Date(a.follow_up_at as string).getTime() - new Date(b.follow_up_at as string).getTime()
  );

  return (
    <div className={styles.timerTray}>
      <span className={styles.timerTrayLabel}>Follow-ups</span>
      <div className={styles.timerTrayList}>
        {sorted.map(card => (
          <button
            key={card.id}
            type="button"
            className={styles.timerTrayRow}
            onClick={() => onJumpTo(card.id)}
            title="Jump to this card"
          >
            <span className={styles.mono}>{card.ticket_number}</span>
            <span className={styles.timerTrayCountdown}>
              {formatRemaining(new Date(card.follow_up_at as string).getTime() - now)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
