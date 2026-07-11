'use client';

import { useState } from 'react';
import { API } from '@/lib/api';
import { generateReportMarkdown, downloadMarkdown } from '@/lib/export-utils';
import type { GroupsReport } from './types';

function twoWeeksAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  'w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-1.5 ' +
  'focus:outline-none focus:border-[#d4a373]';

export default function ReportPanel() {
  const [startDate, setStartDate] = useState(twoWeeksAgo());
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState<GroupsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/client/groups/report?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to generate report');
      const data: GroupsReport = await res.json();
      setReport(data);
      setSelected(data.active.map(r => r.group.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]));
  };

  const handleExport = () => {
    if (!report) return;
    downloadMarkdown(`BiWeekly_Report_${today()}.md`, generateReportMarkdown(report, selected));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d4a373]">Bi-Weekly Report</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-[#d4a373]">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#d4a373]">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="text-sm bg-[#b87333] hover:bg-[#b87333]/80 text-[#0f0f0f] font-semibold px-4 py-2 disabled:opacity-40"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>
      )}

      {report && (
        <div className="space-y-6">
          <p className="text-xs text-white/40">
            {report.summary.active_count} active of {report.summary.total_groups} groups in this period.
          </p>

          <div className="space-y-2">
            {report.active.map(r => (
              <label key={r.group.id} className="flex items-start gap-3 border border-[rgba(184,115,51,0.2)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(r.group.id)}
                  onChange={() => toggleGroup(r.group.id)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm text-white">{r.group.name}</p>
                  <p className="text-xs text-white/40">{r.item_count} items | {r.journal_count} updates</p>
                </div>
              </label>
            ))}
            {report.active.length === 0 && (
              <p className="text-xs text-white/40">No groups had journal activity in this period.</p>
            )}
          </div>

          {report.inactive.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs uppercase tracking-wider text-[#d4a373]">Inactive</h4>
              <ul className="cenote-list">
                {report.inactive.map(r => (
                  <li key={r.group.id} className="text-xs text-white/40">{r.group.name} — {r.item_count} items, no updates in period</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={selected.length === 0}
            className="text-sm border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-4 py-1.5 disabled:opacity-40"
          >
            Export as Markdown
          </button>
        </div>
      )}
    </div>
  );
}
