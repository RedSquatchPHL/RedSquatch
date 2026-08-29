'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { API } from '@/lib/api';
import SnowPanel from './SnowPanel';

// ServiceNow's actual brand palette (confirmed 2026-08-29, not the site-wide
// copper/tan) — dark green #293E40 + sea-glass mint #81B5A1. SNOW_BRIGHT is a
// lightened tint of the mint for headline pop, same role --color-copper-bright
// plays for CopperPanel.
const SNOW_MINT = '#81B5A1';
const SNOW_MINT_RGB = '129, 181, 161';
const SNOW_BRIGHT = '#b8d8cb';

type Status = 'not_started' | 'in_progress' | 'completed';

type SnowItem = {
  id: number;
  item_id: string;
  stage: number;
  stage_label: string;
  title: string;
  description: string | null;
  status: Status;
  notes: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_CYCLE: Status[] = ['not_started', 'in_progress', 'completed'];

function nextStatus(current: Status): Status {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
}

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={size} color="#4caf50" />;
    case 'in_progress': return <Clock size={size} color={SNOW_MINT} />;
    default: return <Circle size={size} color="#757575" />;
  }
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="my-4">
      <div className="text-sm font-semibold mb-2" style={{ color: SNOW_MINT }}>
        Progress: {completed} / {total} completed
      </div>
      <div
        className="relative h-4 rounded-sm overflow-hidden"
        style={{ background: `rgba(${SNOW_MINT_RGB},0.15)`, border: `1px solid rgba(${SNOW_MINT_RGB},0.3)` }}
      >
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: SNOW_MINT }} />
      </div>
    </div>
  );
}

export default function HSSnowPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SnowItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  async function loadItems() {
    try {
      const res = await fetch(`${API}/api/client/snow-career`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError('Could not load the ServiceNow career pathway.');
    }
  }

  useEffect(() => {
    if (loading) return;
    loadItems();
  }, [loading]);

  async function cycleStatus(item: SnowItem) {
    const status = nextStatus(item.status);
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, status } : i)));
    setSavingId(item.id);
    try {
      await fetch(`${API}/api/client/snow-career/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
    } catch {
      setError('Update failed to save — check your connection.');
    } finally {
      setSavingId(null);
    }
  }

  const stages = useMemo(() => {
    const map = new Map<number, { label: string; items: SnowItem[] }>();
    for (const item of items) {
      if (!map.has(item.stage)) map.set(item.stage, { label: item.stage_label, items: [] });
      map.get(item.stage)!.items.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [items]);

  const totalCompleted = useMemo(() => items.filter(i => i.status === 'completed').length, [items]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
      <div className="w-full max-w-3xl">
        <SnowPanel>
          <h1 className="text-3xl font-bold" style={{ color: SNOW_BRIGHT, textShadow: `0 0 16px rgba(${SNOW_MINT_RGB},0.3)` }}>
            ServiceNow Career Path
          </h1>
          <p className="text-sm mt-1" style={{ color: `rgba(${SNOW_MINT_RGB},0.6)` }}>
            Certified Application Developer (CAD) pathway
          </p>
          {error && <p className="text-xs mt-2 text-red-400">{error}</p>}
          <ProgressBar completed={totalCompleted} total={items.length} />
        </SnowPanel>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        {stages.map(([stage, { label, items: stageItems }]) => {
          const completed = stageItems.filter(i => i.status === 'completed').length;
          return (
            <SnowPanel key={stage}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: SNOW_MINT }}>
                {label} ({completed}/{stageItems.length})
              </h2>
              <div className="space-y-1">
                {stageItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-2"
                    style={{ borderBottom: `1px solid rgba(${SNOW_MINT_RGB},0.15)`, opacity: savingId === item.id ? 0.6 : 1 }}
                  >
                    <button
                      type="button"
                      onClick={() => cycleStatus(item)}
                      title={`Status: ${STATUS_LABEL[item.status]} — click to advance`}
                      aria-label={`Toggle status for ${item.title}`}
                      className="mt-0.5 flex-shrink-0"
                      disabled={savingId === item.id}
                    >
                      <StatusIcon status={item.status} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: SNOW_MINT }}>{item.title}</div>
                      {item.description && (
                        <div className="text-xs mt-0.5" style={{ color: `rgba(${SNOW_MINT_RGB},0.55)` }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SnowPanel>
          );
        })}
      </div>
    </div>
  );
}
