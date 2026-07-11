'use client';

import { useState } from 'react';
import TypeBadge from '@/components/TypeBadge';
import styles from '@/styles/work.module.css';

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
  onDelete,
  onOpenJournal,
}: {
  items: WorkItem[];
  groups: WorkGroupOption[];
  onUpdateSubmitter: (id: number, submitter: string) => void;
  onUpdateGroup: (id: number, groupId: number | null) => void;
  onDelete: (id: number) => void;
  onOpenJournal: (item: WorkItem) => void;
}) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('ticket_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftSubmitter, setDraftSubmitter] = useState('');

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

  function startEdit(item: WorkItem) {
    setEditingId(item.id);
    setDraftSubmitter(item.submitter ?? '');
  }

  function commitEdit(id: number) {
    onUpdateSubmitter(id, draftSubmitter);
    setEditingId(null);
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
          {sorted.map(item => (
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
              <td className={styles.td}>{item.status}</td>
              <td className={styles.td}>{item.priority}</td>
              <td className={styles.td}>
                <select
                  value={item.group_id ?? ''}
                  onChange={e => onUpdateGroup(item.id, e.target.value ? Number(e.target.value) : null)}
                  className={styles.editInput}
                >
                  <option value="">— No group —</option>
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
    </div>
  );
}
