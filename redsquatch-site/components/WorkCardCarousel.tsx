'use client';

import WorkCard, { WorkCard as WorkCardType } from '@/components/WorkCard';
import WorkCardCascade from '@/components/WorkCardCascade';
import styles from '@/styles/work.module.css';

export default function WorkCardCarousel({
  cards,
  allCards,
  focalId,
  now,
  dueIds,
  onPrev,
  onNext,
  onToggleDone,
  onToggleBackburner,
  onSetFollowUp,
  onSetParent,
  onOpenJournal,
  onFocusCard,
}: {
  cards: WorkCardType[];
  allCards: WorkCardType[];
  focalId: number | null;
  now: number;
  dueIds: Set<number>;
  onPrev: () => void;
  onNext: () => void;
  onToggleDone: (id: number) => void;
  onToggleBackburner: (id: number) => void;
  onSetFollowUp: (id: number, minutes: number | null) => void;
  onSetParent: (id: number, parentId: number | null) => void;
  onOpenJournal: (id: number) => void;
  onFocusCard: (id: number) => void;
}) {
  if (cards.length === 0) {
    return <div className={styles.carouselEmpty}>No active work cards. Upload today's report to get started.</div>;
  }

  const index = cards.findIndex(c => c.id === focalId);
  const focal = index >= 0 ? cards[index] : cards[0];

  return (
    <div className={styles.carousel}>
      <button type="button" className={styles.carouselNav} onClick={onPrev} aria-label="Previous card">
        ‹
      </button>

      <div className={styles.carouselCenter}>
        <WorkCard
          card={focal}
          allCards={allCards}
          now={now}
          pulsing={dueIds.has(focal.id)}
          onToggleDone={onToggleDone}
          onToggleBackburner={onToggleBackburner}
          onSetFollowUp={onSetFollowUp}
          onSetParent={onSetParent}
          onOpenJournal={onOpenJournal}
        />
        <WorkCardCascade focalCard={focal} allCards={allCards} onFocusCard={onFocusCard} />
        <div className={styles.carouselPosition}>
          {Math.max(index, 0) + 1} of {cards.length}
        </div>
      </div>

      <button type="button" className={styles.carouselNav} onClick={onNext} aria-label="Next card">
        ›
      </button>
    </div>
  );
}
