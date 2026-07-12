'use client';

import styles from '@/styles/work.module.css';

export default function FilterPills({
  options,
  active,
  onToggle,
  labels,
}: {
  options: string[];
  active: string | null;
  onToggle: (value: string) => void;
  /** Optional display text per option value (e.g. code -> full name); falls back to the raw value. */
  labels?: Record<string, string>;
}) {
  if (options.length === 0) return null;

  return (
    <div className={styles.filterPillsVertical}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`${styles.pillVertical} ${active === opt ? styles.pillActive : ''}`}
          onClick={() => onToggle(opt)}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}
