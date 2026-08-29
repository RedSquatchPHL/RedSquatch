'use client';

import { ReactNode } from 'react';
import styles from './snow-panel.module.css';

interface SnowPanelProps {
  title?: string;
  subtitle?: string;
  subtext?: string;
  children?: ReactNode;
}

export default function SnowPanel({ title, subtitle, subtext, children }: SnowPanelProps) {
  return (
    <section className={styles.snowPanel}>
      {title && <div className={styles.title}>{title}</div>}
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {subtext && <div className={styles.subtext}>{subtext}</div>}

      <div className={styles.content}>{children}</div>
    </section>
  );
}
