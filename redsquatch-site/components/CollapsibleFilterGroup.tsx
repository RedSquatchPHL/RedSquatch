'use client';

import { ReactNode } from 'react';
import styles from '@/styles/work.module.css';

export default function CollapsibleFilterGroup({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.filterAccordion}>
      <button type="button" className={styles.filterAccordionHeader} onClick={onToggle}>
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{title}</span>
      </button>
      {expanded && <div className={styles.filterAccordionContent}>{children}</div>}
    </div>
  );
}
