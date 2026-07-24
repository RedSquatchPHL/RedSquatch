'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API } from '@/lib/api';
import CopperPanel from '@/components/cenote/CopperPanel';
import TypeBadge from '@/components/TypeBadge';
import { exportDiscoveryAsMarkdown, exportDemandAsMarkdown, downloadMarkdown } from '@/lib/export-utils';
import type { WorkGroupDetail } from '@/components/intake/types';

type Tab = 'documents' | 'items' | 'journal';

export default function GroupDashboardPage({ params }: { params: { id: string } }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const [group, setGroup] = useState<WorkGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('documents');

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/'); return; }
        setChecking(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  useEffect(() => {
    if (checking) return;
    setLoading(true);
    fetch(`${API}/api/client/groups/${params.id}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load group');
        return r.json();
      })
      .then(setGroup)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load group'))
      .finally(() => setLoading(false));
  }, [checking, params.id]);

  if (checking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#b87333] text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400 text-sm">
        {error || 'Group not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        <Link href="/dashboard/intake" className="text-xs text-[#d4a373] hover:underline">
          &larr; Back to Intake
        </Link>

        <CopperPanel>
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl text-white">{group.name}</h1>
              {group.description && <p className="text-white/40 text-sm mt-1">{group.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
                <span>{group.work_items.length} item{group.work_items.length === 1 ? '' : 's'}</span>
                <span>{group.journal_entries.length} journal entr{group.journal_entries.length === 1 ? 'y' : 'ies'}</span>
                <span className="status-badge active">{group.status}</span>
                {group.follow_up_flag && group.follow_up_date && (
                  <span className="status-badge warning">Follow-up: {group.follow_up_date}</span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[rgba(184,115,51,0.2)]">
              {(['documents', 'items', 'journal'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${
                    tab === t ? 'text-[#d4a373] border-[#d4a373]' : 'text-white/40 border-transparent hover:text-white/70'
                  }`}
                >
                  {t === 'items' ? 'Work Items' : t}
                </button>
              ))}
            </div>

            {/* Documents */}
            {tab === 'documents' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm uppercase tracking-wider text-[#d4a373] mb-2">Discovery Forms</h2>
                  {group.discovery_forms.length === 0 && <p className="text-xs text-white/40">None yet.</p>}
                  <ul className="cenote-list">
                    {group.discovery_forms.map(f => (
                      <li key={f.id} className="flex items-center justify-between">
                        <span>{f.snwr_number || `Discovery #${f.id}`} — {f.status}</span>
                        <button
                          onClick={() => downloadMarkdown(`discovery-${f.snwr_number || f.id}.md`, exportDiscoveryAsMarkdown(f))}
                          className="text-xs text-[#d4a373] hover:underline"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-sm uppercase tracking-wider text-[#d4a373] mb-2">Demand Forms</h2>
                  {group.demand_forms.length === 0 && <p className="text-xs text-white/40">None yet.</p>}
                  <ul className="cenote-list">
                    {group.demand_forms.map(f => {
                      const discovery = group.discovery_forms.find(d => d.id === f.discovery_form_id) ?? null;
                      return (
                        <li key={f.id} className="flex items-center justify-between">
                          <span>Demand #{f.id} — {f.status}</span>
                          <button
                            onClick={() => downloadMarkdown(`demand-${f.id}.md`, exportDemandAsMarkdown(f, discovery))}
                            className="text-xs text-[#d4a373] hover:underline"
                          >
                            Download
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Work Items */}
            {tab === 'items' && (
              <div className="space-y-2">
                {group.work_items.length === 0 && <p className="text-xs text-white/40">No work items linked to this group.</p>}
                {group.work_items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 border border-[rgba(184,115,51,0.2)] px-3 py-2">
                    <TypeBadge type={item.type} />
                    <span className="text-white/80 text-xs font-mono">{item.ticket_number}</span>
                    <span className="text-white/60 text-sm flex-1">{item.title}</span>
                    <span className="text-xs text-white/40">{item.status}</span>
                    <span className="text-xs text-white/40">{item.priority}</span>
                  </div>
                ))}
                <Link href="/ws/work" className="inline-block text-xs text-[#d4a373] hover:underline mt-2">
                  Manage work items &rarr;
                </Link>
              </div>
            )}

            {/* Journal */}
            {tab === 'journal' && (
              <div className="space-y-2">
                {group.journal_entries.length === 0 && <p className="text-xs text-white/40">No journal entries tagged to this group yet.</p>}
                {group.journal_entries.map(entry => (
                  <div key={entry.id} className="border border-[rgba(184,115,51,0.2)] p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#d4a373]">{entry.ticket_number} — {entry.item_title}</span>
                      <span className="text-white/40">{entry.session_date} — {entry.session_status}</span>
                    </div>
                    {entry.why && <p className="text-xs text-white/60">{entry.why}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CopperPanel>
      </div>
    </div>
  );
}
