'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkItemsTab from '@/components/WorkItemsTab';
import LincolnTab from '@/components/LincolnTab';
import ResearchTab from '@/components/ResearchTab';
import ForestSilhouettes from '@/components/ForestSilhouettes';
import { API } from '@/lib/api';
import styles from '@/styles/work.module.css';

type TabId = 'work-items' | 'lincoln' | 'research';

export default function WorkPage() {
  const [activeTab, setActiveTab] = useState<TabId>('work-items');
  const [checking, setChecking]   = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) router.push('/');
      })
      .catch(() => router.push('/'))
      .finally(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    const onScroll = () => {
      document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-copper text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className={`work-page ${styles.workPage}`}>
        <div className={styles.silhouettes}>
          <ForestSilhouettes />
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Work</h1>
            <p className={styles.subheader}>
              Log work items and research sessions for Lincoln Financial Group engagements.
            </p>
          </header>

          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'work-items' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('work-items')}
            >
              Work Items
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'lincoln' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('lincoln')}
            >
              Lincoln
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'research' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('research')}
            >
              Research
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'work-items' && <WorkItemsTab />}
            {activeTab === 'lincoln' && <LincolnTab />}
            {activeTab === 'research' && <ResearchTab />}
          </div>
        </div>
      </div>
    </>
  );
}
