'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { API } from '@/lib/api';
import ResearchModal from '@/components/ResearchModal';
import styles from '@/styles/work.module.css';

export interface ResearchEntry {
  id: number;
  client_id: number;
  topic_name: string;
  requested_by: string | null;
  date_requested: string | null;
  evaluated_by: string | null;
  status: string;
  executive_summary: string | null;
  definition: string | null;
  core_mechanics: string | null;
  pricing_cost_structure: string | null;
  use_case_1: string | null;
  use_case_2: string | null;
  current_vs_new_process: string | null;
  pros_strengths: string | null;
  cons_risks_limitations: string | null;
  recommendation: string | null;
  next_steps: string | null;
  converted_to_goal_id: number | null;
  flagged_for_deletion: boolean;
  flagged_at: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ResearchTab() {
  const [entries, setEntries]       = useState<ResearchEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedEntry, setSelected]  = useState<ResearchEntry | null>(null);
  const [createMode, setCreateMode]   = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/research`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch research entries');
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const openModal = (entry: ResearchEntry) => {
    setSelected(entry);
    setCreateMode(false);
  };
  const closeModal = () => {
    setSelected(null);
    setCreateMode(false);
  };
  const openCreate = () => {
    setCreateMode(true);
    setSelected(null);
  };

  const handleRefresh = () => {
    fetchEntries();
    closeModal();
  };

  if (loading) {
    return <div className="text-light-copper text-sm py-8 text-center">Loading research entries...</div>;
  }

  if (error) {
    return (
      <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 rounded px-3 py-2">
        {error}
      </p>
    );
  }

  return (
    <div className={`research-tab ${styles['research-tab']}`}>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-light-copper">Research Entries</h3>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 text-xs rounded border border-copper/40 text-copper hover:border-copper/70 hover:bg-copper/5 transition-colors"
          style={{ color: '#d4a373', borderColor: 'rgba(212,163,115,0.4)' }}
        >
          + Add Entry
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-10 text-light-copper text-sm">
          No research entries yet.
        </div>
      ) : (
        <div className={`research-list ${styles['research-list']}`}>
          {entries.map(entry => (
            <div
              key={entry.id}
              className={`research-item ${styles['research-item']}`}
              onClick={() => openModal(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') openModal(entry); }}
            >
              <div className="research-title">{entry.topic_name}</div>
              <div className="research-date">{formatDate(entry.created_at)}</div>
              <span className={`badge badge-${entry.flagged_for_deletion ? 'warning' : 'active'}`}>
                {entry.flagged_for_deletion && <AlertTriangle size={12} className="inline mr-1" />}
                {entry.flagged_for_deletion ? 'Flagged for Deletion' : 'Active'}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedEntry && (
        <ResearchModal
          entry={selectedEntry}
          onClose={closeModal}
          onRefresh={handleRefresh}
          mode="edit"
        />
      )}
      {createMode && (
        <ResearchModal
          entry={null}
          onClose={closeModal}
          onRefresh={handleRefresh}
          mode="create"
        />
      )}
    </div>
  );
}
