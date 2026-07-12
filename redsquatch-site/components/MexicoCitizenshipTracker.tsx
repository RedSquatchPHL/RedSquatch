'use client';

import { useEffect, useMemo, useState } from 'react';
import { Circle, Clock, CheckCircle2, Lock, Pencil, Download, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { API } from '@/lib/api';
import { exportCitizenshipAsPdf, exportCitizenshipAsCsv, type CitizenshipDoc } from '@/lib/export-utils';

type Status = CitizenshipDoc['status'];
type FilterStatus = 'all' | 'completed' | 'pending';

const CATEGORY_ORDER = ['me', 'parent', 'maternal_gp', 'paternal_gp', 'great_gp', 'apostilles'];

const CATEGORY_LABELS: Record<string, string> = {
  me: 'Me',
  parent: 'Parents',
  maternal_gp: 'Maternal Grandparent',
  paternal_gp: 'Paternal Grandparent',
  great_gp: 'Great-Grandparent',
  apostilles: 'Apostilles',
};

// Per Darryl's note: physical originals are only retained for his own birth certs
// and the apostilles — every other category is scan-only.
const SCAN_ONLY_CATEGORIES = new Set(['parent', 'maternal_gp', 'paternal_gp', 'great_gp']);

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not Started',
  pending_scan: 'Pending Scan',
  obtained: 'Obtained',
  archived: 'Archived',
};

const STATUS_CYCLE: Status[] = ['not_started', 'pending_scan', 'obtained'];

function nextStatus(current: Status): Status {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? 'not_started';
}

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  switch (status) {
    case 'obtained': return <CheckCircle2 size={size} color="#4caf50" />;
    case 'pending_scan': return <Clock size={size} color="#d4a373" />;
    case 'archived': return <Lock size={size} color="#8e9aaf" />;
    default: return <Circle size={size} color="#757575" />;
  }
}

function EagleIcon({ size = 28 }: { size?: number }) {
  // No lucide eagle icon exists — small custom silhouette in the copper/brown palette.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Eagle — checklist complete">
      <path
        d="M16 4 C14 8 8 9 4 8 C7 11 10 12 13 12 L6 18 C10 17 13 15 15 13 L14 22 L12 28 L16 24 L20 28 L18 22 L17 13 C19 15 22 17 26 18 L19 12 C22 12 25 11 28 8 C24 9 18 8 16 4 Z"
        fill="#b87333"
        stroke="#8e633f"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="my-6">
      <div className="text-sm font-semibold mb-2" style={{ color: '#d4a373' }}>
        Progress: {completed} / {total} completed
      </div>
      <div
        className="relative h-6 rounded-sm overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #CE1126 0%, #CE1126 33%, #fff 33%, #fff 66%, #007340 66%, 100%)',
          border: '1px solid rgba(184,115,51,0.3)',
        }}
      >
        <div
          className="absolute top-0 right-0 bottom-0"
          style={{ width: `${100 - pct}%`, background: 'rgba(13,12,11,0.78)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {pct}%
        </div>
        {pct === 100 && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            <EagleIcon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MexicoCitizenshipTracker() {
  const [documents, setDocuments] = useState<CitizenshipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [editingDoc, setEditingDoc] = useState<CitizenshipDoc | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/citizenship`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Could not load citizenship documents.');
    } finally {
      setLoading(false);
    }
  }

  async function updateDoc(id: number, patch: Partial<Pick<CitizenshipDoc, 'status' | 'storage_location' | 'scan_url' | 'notes'>>) {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
    try {
      await fetch(`${API}/api/client/citizenship/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      setLastUpdated(new Date());
    } catch {
      setError('Update failed to save — check your connection.');
    }
  }

  function toggleCategoryExpanded(cat: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const docsByCategory = useMemo(() => {
    const map: Record<string, CitizenshipDoc[]> = {};
    for (const cat of CATEGORY_ORDER) map[cat] = [];
    for (const doc of documents) (map[doc.category] ??= []).push(doc);
    return map;
  }, [documents]);

  const docTypesByCategory = useMemo(() => {
    // Group copies back up to their document TYPE (doc_id) for the tree summary view.
    const map: Record<string, { docId: string; title: string; copies: CitizenshipDoc[] }[]> = {};
    for (const cat of CATEGORY_ORDER) {
      const byDocId = new Map<string, CitizenshipDoc[]>();
      for (const doc of docsByCategory[cat] ?? []) {
        if (!byDocId.has(doc.doc_id)) byDocId.set(doc.doc_id, []);
        byDocId.get(doc.doc_id)!.push(doc);
      }
      map[cat] = Array.from(byDocId.entries()).map(([docId, copies]) => ({ docId, title: copies[0].title, copies }));
    }
    return map;
  }, [docsByCategory]);

  const totalCompleted = useMemo(() => documents.filter(d => d.status === 'obtained' || d.status === 'archived').length, [documents]);

  const visibleDocs = useMemo(() => {
    return documents.filter(d => {
      if (selectedCategory && d.category !== selectedCategory) return false;
      if (filterStatus === 'completed') return d.status === 'obtained' || d.status === 'archived';
      if (filterStatus === 'pending') return d.status === 'not_started' || d.status === 'pending_scan';
      return true;
    });
  }, [documents, selectedCategory, filterStatus]);

  const visibleByCategory = useMemo(() => {
    const map: Record<string, CitizenshipDoc[]> = {};
    for (const cat of CATEGORY_ORDER) {
      const docs = visibleDocs.filter(d => d.category === cat);
      if (docs.length > 0) map[cat] = docs;
    }
    return map;
  }, [visibleDocs]);

  if (loading) {
    return <div className="py-12 text-center" style={{ color: '#d4a373' }}>Loading…</div>;
  }

  return (
    <div className="citizenship-tracker" style={{ color: '#d4a373' }}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Mexico Citizenship Tracker
        </h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(212,163,115,0.6)' }}>
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Not yet synced'}
        </p>
        {error && <p className="text-xs mt-1 text-red-400">{error}</p>}
      </div>

      <ProgressBar completed={totalCompleted} total={documents.length} />

      {/* Category tree + checklist */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Category tree — left, ~50% */}
        <div className="md:w-1/2 space-y-1" role="tree" aria-label="Document categories">
          {CATEGORY_ORDER.map(cat => {
            const types = docTypesByCategory[cat] ?? [];
            const copies = docsByCategory[cat] ?? [];
            const completed = copies.filter(d => d.status === 'obtained' || d.status === 'archived').length;
            const isExpanded = expandedCategories.has(cat);
            const isSelected = selectedCategory === cat;

            return (
              <div
                key={cat}
                className="category-section"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,18,16,0.6), rgba(13,12,11,0.8))',
                  borderLeft: `2px solid ${isSelected ? '#b87333' : 'rgba(184,115,51,0.4)'}`,
                  padding: '0.75rem 0 0.75rem 1rem',
                  margin: '0.5rem 0',
                }}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  aria-pressed={isSelected}
                >
                  <span
                    onClick={e => { e.stopPropagation(); toggleCategoryExpanded(cat); }}
                    className="flex-shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className="category-title flex-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {CATEGORY_LABELS[cat].toUpperCase()}
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(212,163,115,0.5)' }}>
                    [{completed}/{copies.length}]
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-2 pl-5 space-y-1">
                    {types.map(({ docId, title, copies: typeCopies }) => {
                      const allDone = typeCopies.every(c => c.status === 'obtained' || c.status === 'archived');
                      const anyProgress = typeCopies.some(c => c.status === 'obtained' || c.status === 'pending_scan' || c.status === 'archived');
                      const aggStatus: Status = allDone ? 'obtained' : anyProgress ? 'pending_scan' : 'not_started';
                      return (
                        <div key={docId} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(212,163,115,0.85)' }}>
                          <StatusIcon status={aggStatus} size={12} />
                          <span>{title} ×{typeCopies.length}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Checklist — right, ~50% */}
        <div className="md:w-1/2 space-y-6">
          {Object.keys(visibleByCategory).length === 0 && (
            <p className="text-sm" style={{ color: 'rgba(212,163,115,0.5)' }}>No documents match the current filter.</p>
          )}
          {CATEGORY_ORDER.filter(cat => visibleByCategory[cat]).map(cat => {
            const docs = visibleByCategory[cat];
            const completed = docs.filter(d => d.status === 'obtained' || d.status === 'archived').length;
            const scanOnly = SCAN_ONLY_CATEGORIES.has(cat);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#d4a373' }}>
                    {CATEGORY_LABELS[cat]} ({completed}/{docs.length})
                  </h3>
                  <button
                    type="button"
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: '#d4a373' }}
                    onClick={() => exportCitizenshipAsPdf(docs, CATEGORY_LABELS, [cat])}
                  >
                    <Download size={12} /> Export This Section
                  </button>
                </div>
                {scanOnly && (
                  <p className="text-[11px] mb-2 italic" style={{ color: 'rgba(212,163,115,0.5)' }}>
                    Scan only — physical originals aren&apos;t retained for this category.
                  </p>
                )}
                <div>
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      className="doc-item"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid rgba(184,115,51,0.15)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateDoc(doc.id, { status: nextStatus(doc.status) })}
                        title={`Status: ${STATUS_LABEL[doc.status]} — click to advance`}
                        aria-label={`Toggle status for ${doc.title} copy ${doc.copy_number}`}
                        className="mt-0.5 flex-shrink-0"
                      >
                        <StatusIcon status={doc.status} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span>{doc.title} (Copy {doc.copy_number})</span>
                          <button
                            type="button"
                            className="text-xs hover:underline flex-shrink-0"
                            style={{ color: '#d4a373' }}
                            onClick={() => setEditingDoc(doc)}
                            aria-label={`Edit ${doc.title} copy ${doc.copy_number}`}
                          >
                            <Pencil size={12} className="inline" /> edit
                          </button>
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'rgba(212,163,115,0.55)' }}>
                          {doc.status === 'pending_scan' && <span>Pending scan from original</span>}
                          {doc.storage_location && <div>Storage: {doc.storage_location}</div>}
                          {doc.scan_url && (
                            <div className="flex items-center gap-1">
                              Scan: <a href={doc.scan_url} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[180px] inline-flex items-center gap-0.5">
                                {doc.scan_url} <ExternalLink size={10} />
                              </a>
                            </div>
                          )}
                          {!doc.storage_location && !doc.scan_url && <div>Last updated: —</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="action-bar flex flex-wrap items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(184,115,51,0.2)' }}>
        <button type="button" onClick={() => exportCitizenshipAsPdf(documents, CATEGORY_LABELS, CATEGORY_ORDER)}>
          <Download size={12} className="inline mr-1" /> Export as PDF
        </button>
        <button type="button" onClick={() => exportCitizenshipAsCsv(documents)}>
          <Download size={12} className="inline mr-1" /> Export as CSV
        </button>
        <div className="flex items-center gap-1 ml-2">
          {(['all', 'completed', 'pending'] as FilterStatus[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterStatus(f)}
              style={{
                background: filterStatus === f ? 'rgba(184,115,51,0.28)' : 'transparent',
                borderColor: filterStatus === f ? '#b87333' : '#b87333',
                color: filterStatus === f ? '#fff' : '#d4a373',
              }}
            >
              {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'Pending'}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: 'rgba(212,163,115,0.5)' }}>
          {lastUpdated ? `Last refreshed: ${lastUpdated.toLocaleTimeString()}` : ''}
        </span>
      </div>

      {editingDoc && (
        <EditModal
          doc={editingDoc}
          allowArchived={!SCAN_ONLY_CATEGORIES.has(editingDoc.category)}
          onClose={() => setEditingDoc(null)}
          onSave={patch => { updateDoc(editingDoc.id, patch); setEditingDoc(null); }}
        />
      )}
    </div>
  );
}

function EditModal({
  doc,
  allowArchived,
  onClose,
  onSave,
}: {
  doc: CitizenshipDoc;
  allowArchived: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Pick<CitizenshipDoc, 'status' | 'storage_location' | 'scan_url' | 'notes'>>) => void;
}) {
  const [status, setStatus] = useState<Status>(doc.status);
  const [storageLocation, setStorageLocation] = useState(doc.storage_location ?? '');
  const [scanUrl, setScanUrl] = useState(doc.scan_url ?? '');
  const [notes, setNotes] = useState(doc.notes ?? '');

  const statusOptions: Status[] = allowArchived ? ['not_started', 'pending_scan', 'obtained', 'archived'] : ['not_started', 'pending_scan', 'obtained'];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md p-5 rounded-lg"
          style={{ background: 'rgba(10,8,6,0.97)', border: '1px solid rgba(184,115,51,0.4)' }}
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-sm font-bold mb-3" style={{ color: '#d4a373' }}>
            {doc.title} (Copy {doc.copy_number})
          </h3>

          <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as Status)}
            className="w-full mb-3 bg-transparent border px-2 py-1.5 text-sm"
            style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
          >
            {statusOptions.map(s => <option key={s} value={s} style={{ color: '#000' }}>{STATUS_LABEL[s]}</option>)}
          </select>

          <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Storage Location</label>
          <input
            value={storageLocation}
            onChange={e => setStorageLocation(e.target.value)}
            placeholder="e.g. Original in file box"
            className="w-full mb-3 bg-transparent border px-2 py-1.5 text-sm"
            style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
          />

          <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Scan URL</label>
          <input
            value={scanUrl}
            onChange={e => setScanUrl(e.target.value)}
            placeholder="e.g. /vault/doc_scan_001.pdf"
            className="w-full mb-3 bg-transparent border px-2 py-1.5 text-sm"
            style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
          />

          <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full mb-4 bg-transparent border px-2 py-1.5 text-sm resize-vertical"
            style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} style={{ borderColor: 'rgba(184,115,51,0.3)', color: 'rgba(212,163,115,0.7)' }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave({ status, storage_location: storageLocation || null, scan_url: scanUrl || null, notes: notes || null })}
              style={{ background: '#b87333', color: '#0f0f0f', borderColor: '#b87333' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
