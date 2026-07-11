'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { exportDemandAsMarkdown, downloadMarkdown } from '@/lib/export-utils';
import type { DemandForm as DemandFormType, DemandStatus, DiscoveryForm as DiscoveryFormType } from './types';
import { DEMAND_STATUSES } from './types';

interface Props {
  groupId: number;
  discoveryForm: DiscoveryFormType | null;
}

const FIELD_LABELS: { key: keyof DemandFormType; label: string; rows: number }[] = [
  { key: 'business_case', label: 'Business Case', rows: 4 },
  { key: 'assumptions',   label: 'Assumptions',   rows: 4 },
  { key: 'enablers',      label: 'Enablers',      rows: 4 },
  { key: 'in_scope',      label: 'In Scope',      rows: 4 },
  { key: 'out_of_scope',  label: 'Out of Scope',  rows: 4 },
  { key: 'barriers',      label: 'Barriers',      rows: 4 },
  { key: 'fixes',         label: 'Fixes',         rows: 4 },
];

const textareaClass =
  'w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-2 resize-none ' +
  'focus:outline-none focus:border-[#d4a373] transition-colors placeholder:text-white/20';

export default function DemandForm({ groupId, discoveryForm }: Props) {
  const [form, setForm] = useState<DemandFormType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setForm(null);

    (async () => {
      try {
        const res = await fetch(`${API}/api/client/groups/${groupId}/demand`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load demand form');
        const list: DemandFormType[] = await res.json();
        if (cancelled) return;

        if (list.length > 0) {
          setForm(list[0]);
        } else {
          const createRes = await fetch(`${API}/api/client/groups/${groupId}/demand`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discovery_form_id: discoveryForm?.id ?? null }),
          });
          if (!createRes.ok) throw new Error('Failed to create demand form');
          const created = await createRes.json();
          if (cancelled) return;
          setForm(created);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load demand form');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [groupId]);

  const patch = (fields: Partial<DemandFormType>) => {
    setForm(prev => (prev ? { ...prev, ...fields } : prev));
  };

  const save = async (fields: Partial<DemandFormType>) => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/demand/${form.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Failed to save demand form');
      const updated = await res.json();
      setForm(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save demand form');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!form) return;
    downloadMarkdown(`demand-${form.id}.md`, exportDemandAsMarkdown(form, discoveryForm));
  };

  if (loading) {
    return <div className="text-white/40 text-sm py-8 text-center">Loading demand form...</div>;
  }
  if (!form) {
    return <div className="text-red-400 text-sm py-8 text-center">{error || 'Unable to load demand form'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d4a373]">Demand Form</h3>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-white/40">Saving...</span>}
          {!saving && savedAt && <span className="text-xs text-white/40">Saved</span>}
          <select
            value={form.status}
            onChange={e => save({ status: e.target.value as DemandStatus })}
            className="bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white text-xs px-2 py-1 focus:outline-none focus:border-[#d4a373]"
          >
            {DEMAND_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>
      )}

      {discoveryForm && (
        <div className="text-xs text-white/40 border-l-2 border-[rgba(184,115,51,0.3)] pl-3">
          From discovery: <span className="text-[#d4a373]">{discoveryForm.snwr_number || `#${discoveryForm.id}`}</span>
        </div>
      )}

      {FIELD_LABELS.map(({ key, label, rows }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs text-[#d4a373]">{label}</label>
          <textarea
            value={(form[key] as string) ?? ''}
            onChange={e => patch({ [key]: e.target.value } as Partial<DemandFormType>)}
            onBlur={e => save({ [key]: e.target.value } as Partial<DemandFormType>)}
            rows={rows}
            className={textareaClass}
          />
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleExport}
          className="text-sm border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-4 py-1.5 transition-colors"
        >
          Export as Markdown
        </button>
      </div>
    </div>
  );
}
