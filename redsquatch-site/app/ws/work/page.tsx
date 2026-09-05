'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import KanbanBoard, { Task, TaskColumn, TaskSwimlane } from '@/components/tasks/KanbanBoard';
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
    setBoard(b => b && { ...b, tasks: b.tasks.filter(t => t.id !== taskId) });
    await api(`/${taskId}`, 'DELETE');
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

  if (checking || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#b87333' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Work</h1>
          <p className={styles.subheader}>{board.tasks.length} task{board.tasks.length === 1 ? '' : 's'} on the board</p>
        </div>
      </header>

      <KanbanBoard
        columns={board.columns}
        swimlanes={board.swimlanes}
        tasks={board.tasks}
        contexts={board.contexts}
        onCreateTask={handleCreateTask}
        onMoveTask={handleMoveTask}
        onDeleteTask={handleDeleteTask}
        onAddColumn={handleAddColumn}
        onRenameColumn={handleRenameColumn}
        onResizeColumn={handleResizeColumn}
        onDeleteColumn={handleDeleteColumn}
        onAddSwimlane={handleAddSwimlane}
        onRenameSwimlane={handleRenameSwimlane}
        onDeleteSwimlane={handleDeleteSwimlane}
      />
    </div>
  );
}
