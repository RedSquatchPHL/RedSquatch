'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { API } from '@/lib/api';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import StoneTile from '@/components/cenote/StoneTile';
import CopperPanel from '@/components/cenote/CopperPanel';
import BottomToolbar from '@/components/cenote/BottomToolbar';

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

export default function WSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const router = useRouter();

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
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--copper-1)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="jungle-bg min-h-screen flex items-center justify-center p-6">
      <div className="stone-board stone-noise mono relative w-full max-w-[1200px] p-6 pb-24 text-[12px] text-[var(--copper-1)]">
        <HeaderBrand version="7.4" showVersion label="Overview" />

        <div className="grid grid-cols-1 lg:grid-cols-[88px_1fr_1fr] gap-6 mt-6">
          {/* Quick nav rail */}
          <section className="flex lg:flex-col flex-row flex-wrap gap-4">
            <StoneTile isActive icon="lucide:target" title="Goals" subtitle={`${goals.length} goals`} href="/ws/goals" />
            <StoneTile isActive={false} icon="lucide:activity" title="Sports" subtitle="Team standings" href="/hs/sports" />
            <StoneTile isActive={false} icon="lucide:wrench" title="Tools" subtitle="Scratchpad" href="/ws/tools" />
          </section>

          {/* Goals summary */}
          <CopperPanel title="Goals" subtitle={goals.length ? `${goals.length} total` : undefined}>
            {goals.length === 0 ? (
              <div className="py-2 text-[var(--copper-0)]">No goals yet.</div>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 5).map(goal => (
                  <div key={goal.id} className="border-b border-[var(--stone-3)] pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--copper-2)]">{goal.title}</span>
                      <span className="text-[var(--copper-0)] text-[11px] whitespace-nowrap">{goal.progress}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-[var(--stone-2)] overflow-hidden">
                      <div className="h-full bg-[var(--copper-1)]" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/ws/goals" className="mt-3 inline-flex items-center gap-1 text-[var(--copper-1)] hover:text-[var(--copper-2)]">
              <Target size={14} /> View all goals
            </Link>
          </CopperPanel>

          {/* Work items summary */}
          <CopperPanel title="Work Items" subtitle={workItems.length ? `${workItems.length} total` : undefined}>
            {workItems.length === 0 ? (
              <div className="py-2 text-[var(--copper-0)]">No work items yet.</div>
            ) : (
              <div className="space-y-2">
                {workItems.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[var(--stone-3)] py-1.5 last:border-0">
                    <div className="min-w-0">
                      <span className="text-[var(--copper-0)]">{item.ticket_number}</span>{' '}
                      <span className="text-[var(--copper-2)] truncate">{item.title}</span>
                    </div>
                    <span className="text-[var(--copper-1)] text-[11px] whitespace-nowrap">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/ws/work" className="mt-3 inline-block text-[var(--copper-1)] hover:text-[var(--copper-2)]">
              View all work items
            </Link>
          </CopperPanel>
        </div>

        <BottomToolbar activeItem="dashboard" />
      </div>
    </div>
  );
}
