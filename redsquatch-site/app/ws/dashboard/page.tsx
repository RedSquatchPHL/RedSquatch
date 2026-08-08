'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { API } from '@/lib/api';
import StoneTile from '@/components/cenote/StoneTile';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecPanel from '@/components/aztec/AztecPanel';
import AztecMotion from '@/components/aztec/AztecMotion';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

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

function PagerControls({ page, pageCount, onPrev, onNext }: { page: number; pageCount: number; onPrev: () => void; onNext: () => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="flex items-center gap-1 text-[var(--ac-copper-light)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={14} /> Prev
      </button>
      <span className="text-[var(--ac-stone)] text-[11px]">
        {page + 1} / {pageCount}
      </span>
      <button
        onClick={onNext}
        disabled={page === pageCount - 1}
        className="flex items-center gap-1 text-[var(--ac-copper-light)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
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
      <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} flex items-center justify-center min-h-screen`}>
        <div className="text-[var(--ac-copper-light)] text-lg">Loading...</div>
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
    <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} min-h-screen p-6`}>
      <AztecMotion marqueeItems={['Goals', 'Work Items', 'Sports', 'Tools', 'RedSquatch']} />

      <div className="relative z-[1] mx-auto w-full max-w-[1200px] pb-12">
        <AztecHeader label="OVERVIEW" />

        <div className="ac-marquee-frame">
          <div className="ac-greca-band dim" aria-hidden="true" />
          <div className="ac-marquee-wrap" aria-hidden="true">
            <div className="ac-marquee-track" id="ac-marquee" />
          </div>
          <div className="ac-greca-band dim" aria-hidden="true" />
        </div>

        <div className="ac-grid grid grid-cols-1 lg:grid-cols-[88px_1fr_1fr] gap-6 mt-6 text-[12px]">
          {/* Quick nav rail — unchanged, still cenote-styled (StoneTile isn't part of this reskin) */}
          <section className="flex lg:flex-col flex-row flex-wrap gap-4">
            <StoneTile isActive icon="lucide:target" title="Goals" subtitle={`${goals.length} goals`} href="/ws/goals" />
            <StoneTile isActive={false} icon="lucide:activity" title="Sports" subtitle="Team standings" href="/hs/sports" />
            <StoneTile isActive={false} icon="lucide:wrench" title="Tools" subtitle="Scratchpad" href="/ws/tools" />
          </section>

          {/* Goals summary — ascending eagle glyph border */}
          <AztecPanel family="eagle" title="Goals" subtitle={goals.length ? `${goals.length} total` : undefined}>
            {goals.length === 0 ? (
              <div className="py-2 text-[var(--ac-stone)]">No goals yet.</div>
            ) : (
              <div className="space-y-3">
                {pagedGoals.map(goal => (
                  <div key={goal.id} className="border-b border-[rgba(184,115,51,0.15)] pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--ac-copper-light)]">{goal.title}</span>
                      <span className="text-[var(--ac-stone)] text-[11px] whitespace-nowrap">{goal.progress}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div className="h-full bg-[var(--ac-copper)]" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PagerControls
              page={currentGoalsPage}
              pageCount={goalsPageCount}
              onPrev={() => setGoalsPage(p => Math.max(0, p - 1))}
              onNext={() => setGoalsPage(p => Math.min(goalsPageCount - 1, p + 1))}
            />
            <Link href="/ws/goals" className="mt-3 inline-flex items-center gap-1 text-[var(--ac-copper-light)] hover:text-white">
              <Target size={14} /> View all goals
            </Link>
          </AztecPanel>

          {/* Work items summary — fire/energy glyph border */}
          <AztecPanel family="fire" title="Work Items" subtitle={openWorkItems.length ? `${openWorkItems.length} open` : undefined}>
            {openWorkItems.length === 0 ? (
              <div className="py-2 text-[var(--ac-stone)]">No open work items.</div>
            ) : (
              <div className="space-y-2">
                {pagedWorkItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[rgba(184,115,51,0.15)] py-1.5 last:border-0">
                    <div className="min-w-0">
                      <span className="text-[var(--ac-stone)]">{item.ticket_number}</span>{' '}
                      <span className="text-[var(--ac-copper-light)] truncate">{item.title}</span>
                    </div>
                    <span className="text-[var(--ac-stone-light)] text-[11px] whitespace-nowrap">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
            <PagerControls
              page={currentWorkItemsPage}
              pageCount={workItemsPageCount}
              onPrev={() => setWorkItemsPage(p => Math.max(0, p - 1))}
              onNext={() => setWorkItemsPage(p => Math.min(workItemsPageCount - 1, p + 1))}
            />
            <Link href="/ws/work" className="mt-3 inline-block text-[var(--ac-copper-light)] hover:text-white">
              View all work items
            </Link>
          </AztecPanel>
        </div>
      </div>
    </div>
  );
}
