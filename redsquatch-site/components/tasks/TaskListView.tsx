'use client';

import { useMemo, useState } from 'react';
import styles from '@/styles/tasks.module.css';
import type { Task, TaskColumn, TaskSwimlane } from './KanbanBoard';

interface Props {
  columns: TaskColumn[];
  swimlanes: TaskSwimlane[];
  tasks: Task[];
  onDeleteTask: (id: number) => void;
}

type SortKey = 'title' | 'column' | 'lane' | 'context' | 'priority' | 'due_date';
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Board view is the tool for moving/reordering work; this is an additive
// alternate lens for scanning and sorting the same data — same board/list
// toggle pattern as Linear/Trello/Asana, not a replacement for the board.
export default function TaskListView({ columns, swimlanes, tasks, onDeleteTask }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const columnTitle = (id: number) => columns.find(c => c.id === id)?.title ?? '—';
  const laneTitle = (id: number | null) => (id == null ? '—' : swimlanes.find(l => l.id === id)?.title ?? '—');

  const sorted = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'column': cmp = columnTitle(a.column_id).localeCompare(columnTitle(b.column_id)); break;
        case 'lane': cmp = laneTitle(a.swimlane_id).localeCompare(laneTitle(b.swimlane_id)); break;
        case 'context': cmp = (a.context ?? '').localeCompare(b.context ?? ''); break;
        case 'priority': cmp = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1); break;
        case 'due_date': cmp = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'); break;
      }
      return cmp * sortDir;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sortKey, sortDir, columns, swimlanes]);

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 1 ? -1 : 1)); return; }
    setSortKey(key);
    setSortDir(1);
  }

  function Th({ label, k }: { label: string; k: SortKey }) {
    return (
      <th onClick={() => sortBy(k)}>
        {label}
        {sortKey === k && <span className={styles.listSortArrow}>{sortDir === 1 ? '▲' : '▼'}</span>}
      </th>
    );
  }

  if (tasks.length === 0) {
    return <div className={styles.listEmpty}>No tasks yet — add one from the board view.</div>;
  }

  return (
    <table className={styles.listTable}>
      <thead>
        <tr>
          <Th label="Task" k="title" />
          <Th label="Stage" k="column" />
          <Th label="Swimlane" k="lane" />
          <Th label="Context" k="context" />
          <Th label="Priority" k="priority" />
          <Th label="Due" k="due_date" />
          <th aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        {sorted.map(task => (
          <tr key={task.id}>
            <td>
              <span className={`${styles.listTitle} ${task.completed_at ? styles.listTitleDone : ''}`}>{task.title}</span>
            </td>
            <td><span className={styles.listBadge}>{columnTitle(task.column_id)}</span></td>
            <td><span className={styles.listBadge}>{laneTitle(task.swimlane_id)}</span></td>
            <td><span className={styles.listBadge}>{task.context ?? '—'}</span></td>
            <td><span className={styles.listBadge}>{task.priority}</span></td>
            <td><span className={styles.listBadge}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</span></td>
            <td>
              <button className={styles.cardDeleteBtn} onClick={() => onDeleteTask(task.id)} aria-label={`Delete "${task.title}"`}>✕</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
