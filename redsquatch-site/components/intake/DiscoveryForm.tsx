'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { exportDiscoveryAsMarkdown, exportDiscoveryAsPdf, exportDiscoveryAsDocx, downloadMarkdown } from '@/lib/export-utils';
import type { DiscoveryForm as DiscoveryFormType, DiscoveryStatus } from './types';
import { DISCOVERY_STATUSES } from './types';

interface Props {
  groupId: number;
  onFormReady: (form: DiscoveryFormType | null) => void;
}

const FIELD_LABELS: { key: keyof DiscoveryFormType; label: string; rows: number }[] = [
  { key: 'their_process',       label: 'Their Process',        rows: 4 },
  { key: 'expected_outcome',    label: 'Expected Outcome',     rows: 4 },
  { key: 'pain_points',         label: 'Pain Points',          rows: 4 },
  { key: 'ideal_method',        label: 'Ideal Method',         rows: 4 },
  { key: 'your_interpretation', label: 'Your Interpretation',  rows: 4 },
];

const textareaClass =
  'w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-2 resize-none ' +
  'focus:outline-none focus:border-[#d4a373] placeholder:text-white/20';

export default function DiscoveryForm({ groupId, onFormReady }: Props) {
  const [form, setForm] = useState<DiscoveryFormType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setForm(null);
    onFormReady(null);

    (async () => {
      try {
        const res = await fetch(`${API}/api/client/groups/${groupId}/discovery`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load discovery form');
        const list: DiscoveryFormType[] = await res.json();
        if (cancelled) return;

        if (list.length > 0) {
          setForm(list[0]);
          onFormReady(list[0]);
        } else {
          const createRes = await fetch(`${API}/api/client/groups/${groupId}/discovery`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (!createRes.ok) throw new Error('Failed to create discovery form');
          const created = await createRes.json();
          if (cancelled) return;
          setForm(created);
          onFormReady(created);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load discovery form');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [groupId]);

  const patch = (fields: Partial<DiscoveryFormType>) => {
    setForm(prev => (prev ? { ...prev, ...fields } : prev));
  };

  const save = async (fields: Partial<DiscoveryFormType>) => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/discovery/${form.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Failed to save discovery form');
      const updated = await res.json();
      setForm(updated);
      onFormReady(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save discovery form');
    } finally {
      setSaving(false);
    }
  };

  const handleLock = () => {
    if (!form) return;
    save({ status: 'Ready for Demand' as DiscoveryStatus });
  };

  const handleExportMd = () => {
    if (!form) return;
    downloadMarkdown(`discovery-${form.snwr_number || form.id}.md`, exportDiscoveryAsMarkdown(form));
  };
  const handleExportPdf = () => { if (form) exportDiscoveryAsPdf(form); };
  const handleExportDocx = () => { if (form) exportDiscoveryAsDocx(form); };

  if (loading) {
    return <div className="text-white/40 text-sm py-8 text-center">Loading discovery form...</div>;
  }
  if (!form) {
    return <div className="text-red-400 text-sm py-8 text-center">{error || 'Unable to load discovery form'}</div>;
  }

  const locked = form.status === 'Locked' || form.status === 'Ready for Demand';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d4a373]">Discovery Form</h3>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-white/40">Saving...</span>}
          {!saving && savedAt && <span className="text-xs text-white/40">Saved</span>}
          <select
            value={form.status}
            onChange={e => save({ status: e.target.value as DiscoveryStatus })}
            className="bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white text-xs px-2 py-1 focus:outline-none focus:border-[#d4a373]"
          >
            {DISCOVERY_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#d4a373]">SNWR #</label>
          <input
            type="text"
            value={form.snwr_number ?? ''}
            onChange={e => patch({ snwr_number: e.target.value })}
            onBlur={e => save({ snwr_number: e.target.value })}
            className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-1.5 focus:outline-none focus:border-[#d4a373]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#d4a373]">Requester Name</label>
          <input
            type="text"
            value={form.requester_name ?? ''}
            onChange={e => patch({ requester_name: e.target.value })}
            onBlur={e => save({ requester_name: e.target.value })}
            className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-1.5 focus:outline-none focus:border-[#d4a373]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#d4a373]">Requester Dept</label>
          <input
            type="text"
            value={form.requester_dept ?? ''}
            onChange={e => patch({ requester_dept: e.target.value })}
            onBlur={e => save({ requester_dept: e.target.value })}
            className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-1.5 focus:outline-none focus:border-[#d4a373]"
          />
        </div>
      </div>

      {FIELD_LABELS.map(({ key, label, rows }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs text-[#d4a373]">{label}</label>
          <textarea
            value={(form[key] as string) ?? ''}
            onChange={e => patch({ [key]: e.target.value } as Partial<DiscoveryFormType>)}
            onBlur={e => save({ [key]: e.target.value } as Partial<DiscoveryFormType>)}
            rows={rows}
            disabled={locked}
            className={textareaClass}
          />
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleExportMd}
          className="text-sm border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-4 py-1.5"
        >
          MD
        </button>
        <button
          onClick={handleExportPdf}
          className="text-sm border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-4 py-1.5"
        >
          PDF
        </button>
        <button
          onClick={handleExportDocx}
          className="text-sm border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-4 py-1.5"
        >
          DOC
        </button>
        {!locked && (
          <button
            onClick={handleLock}
            className="text-sm bg-[#b87333] hover:bg-[#b87333]/80 text-[#0f0f0f] font-semibold px-4 py-1.5"
          >
            Lock
          </button>
        )}
      </div>
    </div>
  );
}
