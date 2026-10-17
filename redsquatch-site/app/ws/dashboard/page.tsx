'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target, ListChecks, TrendingUp, FileText, BookOpen, Lightbulb, SlidersHorizontal } from 'lucide-react';
import { API } from '@/lib/api';
import CountUp from '@/components/tonatiuh/CountUp';
import Bi from '@/components/tonatiuh/Bi';
import { greetingEs } from '@/lib/bilingual';
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

// Teaser into /ws/batools — mirrors its real REFERENCE+PRACTICE entries, standing in
// for the Tōnatiuh OS Dashboard draft's embedded Control Center toggle grid.
const BA_TOOLS_TEASER = [
  { label: 'BABOK Guide', icon: FileText },
  { label: 'BA Glossary', icon: BookOpen },
  { label: 'User Stories', icon: Lightbulb },
  { label: 'MoSCoW', icon: SlidersHorizontal },
];


export default function WSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [now, setNow] = useState<Date | null>(null);
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
        setLoading(false);
      } catch {
        router.push('/');
      }
    })();
  }, [router]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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
  const avgProgress = goals.length ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;
  const topGoals = goals.slice(0, 6);
  const recentOpenItems = openWorkItems.slice(0, 4);

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.greetingRow}>
          <div>
            <p className={s.greetingLabel}>{now ? <Bi {...greetingEs(now.getHours())} /> : <Bi es="Bienvenido" en="Welcome" />}</p>
            <h1 className={s.wordmark}>WorkSquatch</h1>
          </div>
          {now && (
            <div className={s.clockBlock}>
              <p className={s.clockTime}>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
              <p className={s.clockDate}>{now.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          )}
        </div>

        <div className={s.mainGrid}>
          {/* Left column: stats + goals-progress panel */}
          <div className={s.leftCol}>
            <div className={s.statsGrid}>
              <div className={s.statCard}>
                <div className={s.statIconRow}>
                  <div className={s.statIconWrap} style={{ background: 'rgba(217,122,56,0.18)', color: 'var(--copper-accent)' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <p className={s.statLabel}><Bi es="Progreso de Metas" en="Goal Progress" /></p>
                <p className={s.statValue}><CountUp value={avgProgress} /><span className={s.statUnit}>%</span></p>
              </div>

              <div className={s.statCard}>
                <div className={s.statIconRow}>
                  <div className={s.statIconWrap} style={{ background: 'rgba(212,175,55,0.18)', color: 'var(--status-yellow)' }}>
                    <ListChecks size={18} />
                  </div>
                </div>
                <p className={s.statLabel}><Bi es="Pendientes" en="Open Items" /></p>
                <p className={s.statValue}><CountUp value={openWorkItems.length} /></p>
              </div>

              <div className={s.statCard}>
                <div className={s.statIconRow}>
                  <div className={s.statIconWrap} style={{ background: 'rgba(42,114,86,0.18)', color: 'var(--status-green)' }}>
                    <Target size={18} />
                  </div>
                </div>
                <p className={s.statLabel}><Bi es="Metas Activas" en="Active Goals" /></p>
                <p className={s.statValue}><CountUp value={goals.length} /></p>
              </div>
            </div>

            <div className={s.chartPanel}>
              <h2 className={s.panelHeading}><span><Bi es="Metas" en="Goals" /></span></h2>
              {topGoals.length === 0 ? (
                <div className={s.emptyNote}><Bi es="Aún no hay metas." en="No goals yet." inline /></div>
              ) : (
                topGoals.map(goal => (
                  <div key={goal.id} className={s.goalBarRow}>
                    <div className={s.goalBarLabel}>
                      <span className={s.goalBarName}>{goal.title}</span>
                      <span className={s.goalBarPct}>{goal.progress}%</span>
                    </div>
                    <div className={s.goalBarTrack}>
                      <div className={s.goalBarFill} style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))
              )}
              <Link href="/ws/goals" className={s.viewAllLink}><Bi es="Ver todas las metas" en="View all goals" inline /> →</Link>
            </div>
          </div>

          {/* Right column: BA Tools teaser + recent Work Items */}
          <div className={s.rightCol}>
            <div className={s.miniPanel}>
              <h2 className={s.panelHeading}><span><Bi es="Herramientas BA" en="BA Tools" /></span></h2>
              <div className={s.toggleGrid}>
                {BA_TOOLS_TEASER.map(tool => (
                  <Link key={tool.label} href="/ws/batools" className={s.toggleTile}>
                    <tool.icon size={20} />
                    <span className={s.toggleTileLabel}>{tool.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={`${s.miniPanel} ${s.grow}`}>
              <h2 className={s.panelHeading}><span><Bi es={`Elementos de Trabajo${openWorkItems.length ? ` — ${openWorkItems.length} abiertos` : ''}`} en={`Work Items${openWorkItems.length ? ` — ${openWorkItems.length} open` : ''}`} /></span></h2>
              {recentOpenItems.length === 0 ? (
                <div className={s.emptyNote}><Bi es="No hay elementos abiertos." en="No open work items." inline /></div>
              ) : (
                <div className={s.alertList}>
                  {recentOpenItems.map(item => (
                    <div key={item.id} className={s.alertItem}>
                      <div className={s.alertIconWrap}>{item.ticket_number.slice(-4)}</div>
                      <div>
                        <div className={s.alertTitle}>{item.title}</div>
                        <div className={s.alertDesc}>{item.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/ws/work" className={s.viewAllLink}><Bi es="Ver todos los elementos" en="View all work items" inline /> →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
