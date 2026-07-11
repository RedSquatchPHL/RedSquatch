'use client';

import { ReactNode } from 'react';
import styles from './copper-panel.module.css';

interface CopperPanelProps {
  title?: string;
  subtitle?: string;
  subtext?: string;
  children?: ReactNode;
}

export default function CopperPanel({ title, subtitle, subtext, children }: CopperPanelProps) {
  return (
    <section className={styles.copperPanel}>
      {title && <div className={styles.title}>{title}</div>}
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {subtext && <div className={styles.subtext}>{subtext}</div>}

      <div className={styles.content}>{children}</div>
    </section>
  );
}
