'use client';

import type { WorkCard } from '@/components/WorkCard';
import styles from '@/styles/work.module.css';

export default function BackburnerPanel({
  cards,
  onRestore,
}: {
  cards: WorkCard[];
  onRestore: (id: number) => void;
}) {
  return (
    <div className={styles.backburnerPanel}>
      <div className={styles.backburnerHeader}>Backburner ({cards.length})</div>
      {cards.length === 0 ? (
        <p className={styles.backburnerEmpty}>Nothing on the backburner.</p>
      ) : (
        <div className={styles.backburnerList}>
          {cards.map(card => (
            <button
              key={card.id}
              type="button"
              className={styles.backburnerItem}
              onClick={() => onRestore(card.id)}
              title="Click to bring back into the carousel"
            >
              <span className={styles.mono}>{card.ticket_number}</span>
              <span className={styles.backburnerDesc}>{card.short_description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
