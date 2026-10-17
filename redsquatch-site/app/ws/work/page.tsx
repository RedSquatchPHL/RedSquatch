'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListChecks, CalendarClock, Flame, CheckCircle2 } from 'lucide-react';
import { API } from '@/lib/api';
import KanbanBoard, { Task, TaskColumn, TaskSwimlane } from '@/components/tasks/KanbanBoard';
import TaskListView from '@/components/tasks/TaskListView';
import CountUp from '@/components/tonatiuh/CountUp';
import Bi from '@/components/tonatiuh/Bi';
import styles from '@/styles/tasks.module.css';

interface BoardData {
  columns: TaskColumn[];
  swimlanes: TaskSwimlane[];
  tasks: Task[];
  contexts: string[];
}

export default function TasksPage() {
  const [checking, setChecking] = useState(true);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/'); return; }
        setChecking(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  async function loadBoard() {
    const res = await fetch(`${API}/api/client/task-board`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setBoard({
      columns: data.columns ?? [],
      swimlanes: data.swimlanes ?? [],
      tasks: data.tasks ?? [],
      contexts: data.contexts ?? [],
    });
  }

  useEffect(() => {
    if (!checking) loadBoard();
  }, [checking]);

  async function api(path: string, method: string, body?: unknown) {
    const res = await fetch(`${API}/api/client/task-board${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? (res.status === 204 ? null : res.json()) : null;
  }

  async function handleCreateTask(columnId: number, swimlaneId: number | null, data: { title: string; priority: string; context: string | null }) {
    const created = await api('/', 'POST', { ...data, column_id: columnId, swimlane_id: swimlaneId });
    if (created) setBoard(b => b && { ...b, tasks: [...b.tasks, created] });
  }

  async function handleMoveTask(taskId: number, columnId: number, swimlaneId: number | null, position: number) {
    setBoard(b => b && { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, column_id: columnId, swimlane_id: swimlaneId, position } : t) });
    const updated = await api(`/${taskId}`, 'PUT', { column_id: columnId, swimlane_id: swimlaneId, position });
    if (updated) setBoard(b => b && { ...b, tasks: b.tasks.map(t => t.id === taskId ? updated : t) });
  }

  async function handleDeleteTask(taskId: number) {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    setBoard(b => b && { ...b, tasks: b.tasks.filter(t => t.id !== taskId) });
    await api(`/${taskId}`, 'DELETE');
  }

  async function handleUpdateDescription(taskId: number, description: string) {
    setBoard(b => b && { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, description } : t) });
    await api(`/${taskId}`, 'PUT', { description });
  }

  async function handleAddColumn() {
    const title = window.prompt('Column name?');
    if (!title?.trim()) return;
    const created = await api('/columns', 'POST', { title: title.trim() });
    if (created) setBoard(b => b && { ...b, columns: [...b.columns, created] });
  }

  async function handleRenameColumn(id: number, title: string) {
    setBoard(b => b && { ...b, columns: b.columns.map(c => c.id === id ? { ...c, title } : c) });
    await api(`/columns/${id}`, 'PUT', { title });
  }

  async function handleResizeColumn(id: number, widthPx: number) {
    setBoard(b => b && { ...b, columns: b.columns.map(c => c.id === id ? { ...c, width_px: widthPx } : c) });
    await api(`/columns/${id}`, 'PUT', { width_px: widthPx });
  }

  async function handleDeleteColumn(id: number) {
    if (board && board.columns.length <= 1) {
      window.alert('Cannot delete the last remaining column.');
      return;
    }
    if (!window.confirm('Remove this column? Its tasks move to the leftmost remaining column.')) return;
    await api(`/columns/${id}`, 'DELETE');
    await loadBoard();
  }

  async function handleAddSwimlane() {
    const title = window.prompt('Swimlane name?');
    if (!title?.trim()) return;
    const created = await api('/swimlanes', 'POST', { title: title.trim() });
    if (created) setBoard(b => b && { ...b, swimlanes: [...b.swimlanes, created] });
  }

  async function handleRenameSwimlane(id: number, title: string) {
    setBoard(b => b && { ...b, swimlanes: b.swimlanes.map(l => l.id === id ? { ...l, title } : l) });
    await api(`/swimlanes/${id}`, 'PUT', { title });
  }

  async function handleDeleteSwimlane(id: number) {
    if (!window.confirm('Remove this swimlane? Its tasks fall back to the unlaned row.')) return;
    setBoard(b => b && { ...b, swimlanes: b.swimlanes.filter(l => l.id !== id) });
    await api(`/swimlanes/${id}`, 'DELETE');
    await loadBoard();
  }

  // Stat-card counts for the header row. "Done" follows the board's own
  // is_done column flag, so renamed/added columns keep working.
  const doneColIds = new Set((board?.columns ?? []).filter(c => c.is_done).map(c => c.id));
  const openTasks = (board?.tasks ?? []).filter(t => !doneColIds.has(t.column_id));
  const weekAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const dueSoon = openTasks.filter(t => {
    if (!t.due_date) return false;
    const ms = Date.parse(t.due_date);
    return !Number.isNaN(ms) && ms <= weekAhead;
  }).length;
  const highPriority = openTasks.filter(t => t.priority === 'high').length;
  const doneCount = (board?.tasks ?? []).length - openTasks.length;
  const stats = [
    { label: 'Abiertas', en: 'Open', value: openTasks.length, Icon: ListChecks, tone: styles.statCopper },
    { label: 'Vencen esta semana', en: 'Due this week', value: dueSoon, Icon: CalendarClock, tone: styles.statGold },
    { label: 'Prioridad alta', en: 'High priority', value: highPriority, Icon: Flame, tone: styles.statPink },
    { label: 'Hechas', en: 'Done', value: doneCount, Icon: CheckCircle2, tone: styles.statGreen },
  ];

  if (checking || !board) {
    return (
      <div className={styles.page}>
        <div className={styles.bgPhoto} aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.85)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgPhoto} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}><Bi es="Trabajo" en="Work" title /></h1>
          <p className={styles.subheader}><Bi es={`${board.tasks.length} tarea${board.tasks.length === 1 ? '' : 's'} en el tablero`} en={`${board.tasks.length} task${board.tasks.length === 1 ? '' : 's'} on the board`} inline /></p>
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'board' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('board')}
            aria-pressed={view === 'board'}
          >
            <Bi es="Tablero" en="Board" inline />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <Bi es="Lista" en="List" inline />
          </button>
        </div>
      </header>

      <div className={styles.statRow}>
        {stats.map(({ label, en, value, Icon, tone }) => (
          <div key={label} className={`${styles.statCard} ${tone}`}>
            <Icon size={18} className={styles.statIcon} />
            <span className={styles.statValue}><CountUp value={value} /></span>
            <span className={styles.statLabel}><Bi es={label} en={en} inline /></span>
          </div>
        ))}
      </div>

      {view === 'board' ? (
        <KanbanBoard
          columns={board.columns}
          swimlanes={board.swimlanes}
          tasks={board.tasks}
          contexts={board.contexts}
          onCreateTask={handleCreateTask}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
          onUpdateDescription={handleUpdateDescription}
          onAddColumn={handleAddColumn}
          onRenameColumn={handleRenameColumn}
          onResizeColumn={handleResizeColumn}
          onDeleteColumn={handleDeleteColumn}
          onAddSwimlane={handleAddSwimlane}
          onRenameSwimlane={handleRenameSwimlane}
          onDeleteSwimlane={handleDeleteSwimlane}
        />
      ) : (
        <TaskListView
          columns={board.columns}
          swimlanes={board.swimlanes}
          tasks={board.tasks}
          onDeleteTask={handleDeleteTask}
        />
      )}
    </div>
  );
}
