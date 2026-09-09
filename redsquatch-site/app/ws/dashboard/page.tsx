'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Target, Activity, Wrench } from 'lucide-react';
import { API } from '@/lib/api';
import s from './dashboard.module.css';

interface Goal {
  id: number;
  title: string;
  status: string;
  progress: number;
}

interface WorkItem {
  id: number;
  ticket_number: string;
  title: string;
  status: string;
}

// Status is freeform text from the ServiceNow import (no fixed vocabulary), so match
// loosely rather than against one exact literal — catches "Closed", "Closed - Complete", etc.
function isClosed(item: WorkItem) {
  return (item.status ?? '').toLowerCase().includes('closed');
}

function Pager({ page, pageCount, onPrev, onNext }: { page: number; pageCount: number; onPrev: () => void; onNext: () => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className={s.pager}>
      <button onClick={onPrev} disabled={page === 0} className={s.pagerBtn}>
        <ChevronLeft size={14} /> Prev
      </button>
      <span className={s.pagerLabel}>{page + 1} / {pageCount}</span>
      <button onClick={onNext} disabled={page === pageCount - 1} className={s.pagerBtn}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default function WSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workItemsPage, setWorkItemsPage] = useState(0);
  const [goalsPage, setGoalsPage] = useState(0);
  const router = useRouter();
  const WORK_ITEMS_PAGE_SIZE = 6;
  const GOALS_PAGE_SIZE = 5;

  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const sessionData = await sessionRes.json();
        if (!sessionData.authenticated) { router.push('/'); return; }

        const [goalsRes, workRes] = await Promise.all([
          fetch(`${API}/api/client/goals?context=work`, { credentials: 'include' }),
          fetch(`${API}/api/client/work-items`, { credentials: 'include' }),
        ]);
        const goalsData = await goalsRes.json().catch(() => ({ goals: [] }));
        const workData = await workRes.json().catch(() => ({ items: [] }));
        setGoals(goalsData.goals ?? []);
        setWorkItems(workData.items ?? []);
        setLoading(false);
      } catch {
        router.push('/');
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />
        <div className={s.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.7)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  const openWorkItems = workItems.filter(item => !isClosed(item));
  const workItemsPageCount = Math.max(1, Math.ceil(openWorkItems.length / WORK_ITEMS_PAGE_SIZE));
  const currentWorkItemsPage = Math.min(workItemsPage, workItemsPageCount - 1);
  const pagedWorkItems = openWorkItems.slice(
    currentWorkItemsPage * WORK_ITEMS_PAGE_SIZE,
    currentWorkItemsPage * WORK_ITEMS_PAGE_SIZE + WORK_ITEMS_PAGE_SIZE
  );

  const goalsPageCount = Math.max(1, Math.ceil(goals.length / GOALS_PAGE_SIZE));
  const currentGoalsPage = Math.min(goalsPage, goalsPageCount - 1);
  const pagedGoals = goals.slice(
    currentGoalsPage * GOALS_PAGE_SIZE,
    currentGoalsPage * GOALS_PAGE_SIZE + GOALS_PAGE_SIZE
  );

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.header}>
          <h1 className={s.wordmark}>WorkSquatch</h1>
          <p className={s.subtitle}>OVERVIEW</p>
        </div>

        <div className={s.layout}>
          {/* Zone 1: rolodex — a small fanned stack of nav cards, all visible/clickable */}
          <div className={s.rolodex}>
            <Link href="/ws/goals" className={s.rolodexCard}>
              <Target size={20} className={s.rolodexIcon} />
              <div className={s.rolodexTitle}>Goals</div>
              <div className={s.rolodexSubtitle}>{goals.length} goals</div>
            </Link>
            <Link href="/hs/sports" className={s.rolodexCard}>
              <Activity size={20} className={s.rolodexIcon} />
              <div className={s.rolodexTitle}>Sports</div>
              <div className={s.rolodexSubtitle}>Team standings</div>
            </Link>
            <Link href="/ws/tools" className={s.rolodexCard}>
              <Wrench size={20} className={s.rolodexIcon} />
              <div className={s.rolodexTitle}>Tools</div>
              <div className={s.rolodexSubtitle}>Scratchpad</div>
            </Link>
          </div>

          {/* Zone 2: pinned board — goal cards tacked on loosely */}
          <div className={s.pinnedBoard}>
            <h2 className={s.zoneHeading}>Goals{goals.length ? ` — ${goals.length} total` : ''}</h2>
            {goals.length === 0 ? (
              <div className={s.emptyNote}>No goals yet.</div>
            ) : (
              pagedGoals.map(goal => (
                <div key={goal.id} className={s.pinnedCard}>
                  <div className={s.tack} aria-hidden="true" />
                  <div className={s.pinnedTitle}>
                    <span>{goal.title}</span>
                    <span className={s.pinnedPct}>{goal.progress}%</span>
                  </div>
                  <div className={s.pinnedTrack}>
                    <div className={s.pinnedFill} style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              ))
            )}
            <Pager
              page={currentGoalsPage}
              pageCount={goalsPageCount}
              onPrev={() => setGoalsPage(p => Math.max(0, p - 1))}
              onNext={() => setGoalsPage(p => Math.min(goalsPageCount - 1, p + 1))}
            />
            <Link href="/ws/goals" className={s.viewAllLink}>View all goals →</Link>
          </div>

          {/* Zone 3: ruled ledger — open ServiceNow work tickets */}
          <div className={s.ledgerPanel}>
            <h2 className={s.zoneHeading}>Work Items{openWorkItems.length ? ` — ${openWorkItems.length} open` : ''}</h2>
            {openWorkItems.length === 0 ? (
              <div className={s.emptyNote} style={{ color: 'var(--ink-muted)' }}>No open work items.</div>
            ) : (
              pagedWorkItems.map(item => (
                <div key={item.id} className={s.ledgerRow}>
                  <span className={s.ledgerTicket}>{item.ticket_number}</span>
                  <span className={s.ledgerTitle} title={item.title}>{item.title}</span>
                  <span className={s.ledgerStatus}>{item.status}</span>
                </div>
              ))
            )}
            <Pager
              page={currentWorkItemsPage}
              pageCount={workItemsPageCount}
              onPrev={() => setWorkItemsPage(p => Math.max(0, p - 1))}
              onNext={() => setWorkItemsPage(p => Math.min(workItemsPageCount - 1, p + 1))}
            />
            <Link href="/ws/work" className={s.viewAllLink} style={{ color: 'var(--ink-main)', borderBottomColor: 'var(--panel-border)' }}>View all work items →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
