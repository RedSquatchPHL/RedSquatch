'use client';

import { useEffect, useState } from 'react';
import TypeBadge from '@/components/TypeBadge';
import styles from '@/styles/work.module.css';

const PAGE_SIZE = 25;

export type WorkItem = {
  id: number;
  type: string;
  ticket_number: string;
  title: string;
  submitter: string | null;
  status: string;
  priority: string;
  imported_at: string;
  updated_at: string;
  group_id: number | null;
  group_name: string | null;
};

export type WorkGroupOption = { id: number; name: string };

type SortColumn = 'type' | 'ticket_number' | 'title' | 'submitter' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

export default function WorkItemsTable({
  items,
  groups,
  onUpdateSubmitter,
  onUpdateGroup,
  onUpdateStatus,
  onDelete,
  onOpenJournal,
}: {
  items: WorkItem[];
  groups: WorkGroupOption[];
  onUpdateSubmitter: (id: number, submitter: string) => void;
  onUpdateGroup: (id: number, groupId: number | null) => void;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onOpenJournal: (item: WorkItem) => void;
}) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('ticket_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftSubmitter, setDraftSubmitter] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [page, setPage] = useState(1);

  // Land back on page 1 whenever the underlying item set changes (e.g. filters), so
  // we never render "page 4" against a list that no longer has a page 4.
  useEffect(() => { setPage(1); }, [items]);

  function toggleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  const sorted = [...items].sort((a, b) => {
    const av = (a[sortColumn] ?? '').toString().toLowerCase();
    const bv = (b[sortColumn] ?? '').toString().toLowerCase();
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function startEdit(item: WorkItem) {
    setEditingId(item.id);
    setDraftSubmitter(item.submitter ?? '');
  }

  function commitEdit(id: number) {
    onUpdateSubmitter(id, draftSubmitter);
    setEditingId(null);
  }

  function startEditStatus(item: WorkItem) {
    setEditingStatusId(item.id);
    setDraftStatus(item.status ?? '');
  }

  function commitEditStatus(id: number) {
    if (draftStatus.trim()) onUpdateStatus(id, draftStatus.trim());
    setEditingStatusId(null);
  }

  const columns: { key: SortColumn; label: string }[] = [
    { key: 'type', label: 'Type' },
    { key: 'ticket_number', label: 'Ticket' },
    { key: 'title', label: 'Title' },
    { key: 'submitter', label: 'Submitter' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
  ];

  return (
    <div className={`glass-surface ${styles.tableWrap}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => toggleSort(col.key)} className={styles.th}>
                {col.label}
                {sortColumn === col.key && (
                  <span className={styles.sortArrow}>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
            ))}
            <th className={styles.th}>Group</th>
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {pageItems.map(item => (
            <tr key={item.id} className={styles.row}>
              <td className={styles.td}><TypeBadge type={item.type} /></td>
              <td className={`${styles.td} ${styles.mono}`}>{item.ticket_number}</td>
              <td className={styles.td}>{item.title}</td>
              <td className={styles.td}>
                {editingId === item.id ? (
                  <input
                    autoFocus
                    className={styles.editInput}
                    value={draftSubmitter}
                    onChange={e => setDraftSubmitter(e.target.value)}
                    onBlur={() => commitEdit(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <button type="button" className={styles.editableCell} onClick={() => startEdit(item)}>
                    {item.submitter || <span className={styles.placeholder}>—</span>}
                  </button>
                )}
              </td>
              <td className={styles.td}>
                {editingStatusId === item.id ? (
                  <input
                    autoFocus
                    className={styles.editInput}
                    value={draftStatus}
                    onChange={e => setDraftStatus(e.target.value)}
                    onBlur={() => commitEditStatus(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEditStatus(item.id);
                      if (e.key === 'Escape') setEditingStatusId(null);
                    }}
                  />
                ) : (
                  <button type="button" className={styles.editableCell} onClick={() => startEditStatus(item)} title="Click to change status">
                    {item.status || <span className={styles.placeholder}>—</span>}
                  </button>
                )}
              </td>
              <td className={styles.td}>{item.priority}</td>
              <td className={styles.td}>
                <select
                  value={item.group_id ?? ''}
                  onChange={e => onUpdateGroup(item.id, e.target.value ? Number(e.target.value) : null)}
                  className={styles.editInput}
                >
                  <option value="">None</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </td>
              <td className={styles.td}>
                <button
                  type="button"
                  className={styles.editableCell}
                  onClick={() => onOpenJournal(item)}
                  title="Journal"
                >
                  Journal
                </button>
                <button type="button" className={styles.deleteBtn} onClick={() => onDelete(item.id)} title="Delete">
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td className={styles.emptyRow} colSpan={columns.length + 2}>No work items match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>

      {sorted.length > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages} ({sorted.length} items)
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
