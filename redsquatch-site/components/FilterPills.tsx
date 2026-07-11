'use client';

import styles from '@/styles/work.module.css';

export default function FilterPills({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: string[];
  active: string | null;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterPills}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`${styles.pill} ${active === opt ? styles.pillActive : ''}`}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
