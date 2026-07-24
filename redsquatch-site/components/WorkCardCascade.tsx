'use client';

import TypeBadge from '@/components/TypeBadge';
import type { WorkCard } from '@/components/WorkCard';
import styles from '@/styles/work.module.css';

function CascadeNode({
  card,
  childrenOf,
  depth,
  onFocusCard,
}: {
  card: WorkCard;
  childrenOf: Map<number, WorkCard[]>;
  depth: number;
  onFocusCard: (id: number) => void;
}) {
  const children = childrenOf.get(card.id) ?? [];
  return (
    <>
      <button
        type="button"
        className={`${styles.cascadeRow} ${card.done ? styles.cascadeRowDone : ''}`}
        style={{ marginLeft: depth * 1.25 + 'rem' }}
        onClick={() => onFocusCard(card.id)}
      >
        <TypeBadge type={card.task_type} />
        <span className={styles.mono}>{card.ticket_number}</span>
        <span className={styles.cascadeDesc}>{card.short_description}</span>
      </button>
      {children.map(child => (
        <CascadeNode key={child.id} card={child} childrenOf={childrenOf} depth={depth + 1} onFocusCard={onFocusCard} />
      ))}
    </>
  );
}

export default function WorkCardCascade({
  focalCard,
  allCards,
  onFocusCard,
}: {
  focalCard: WorkCard;
  allCards: WorkCard[];
  onFocusCard: (id: number) => void;
}) {
  const childrenOf = new Map<number, WorkCard[]>();
  for (const card of allCards) {
    if (card.parent_id == null) continue;
    if (!childrenOf.has(card.parent_id)) childrenOf.set(card.parent_id, []);
    childrenOf.get(card.parent_id)!.push(card);
  }

  const directChildren = childrenOf.get(focalCard.id) ?? [];
  if (directChildren.length === 0) return null;

  return (
    <div className={styles.cascade}>
      <div className={styles.cascadeLabel}>Related records</div>
      {directChildren.map(child => (
        <CascadeNode key={child.id} card={child} childrenOf={childrenOf} depth={0} onFocusCard={onFocusCard} />
      ))}
    </div>
  );
}
