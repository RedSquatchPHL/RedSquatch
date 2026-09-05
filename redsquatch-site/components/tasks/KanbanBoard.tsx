'use client';

import { useRef, useState } from 'react';
import styles from '@/styles/tasks.module.css';

export interface TaskColumn {
  id: number;
  title: string;
  position: number;
  width_px: number;
  is_done: boolean;
}

export interface TaskSwimlane {
  id: number;
  title: string;
  position: number;
}

export interface Task {
  id: number;
  column_id: number;
  swimlane_id: number | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  context: string | null;
  due_date: string | null;
  position: number;
  completed_at: string | null;
}

interface Props {
  columns: TaskColumn[];
  swimlanes: TaskSwimlane[];
  tasks: Task[];
  contexts: string[];
  onCreateTask: (columnId: number, swimlaneId: number | null, data: { title: string; priority: string; context: string | null }) => void;
  onMoveTask: (taskId: number, columnId: number, swimlaneId: number | null, position: number) => void;
  onDeleteTask: (taskId: number) => void;
  onAddColumn: () => void;
  onRenameColumn: (id: number, title: string) => void;
  onResizeColumn: (id: number, widthPx: number) => void;
  onDeleteColumn: (id: number) => void;
  onAddSwimlane: () => void;
  onRenameSwimlane: (id: number, title: string) => void;
  onDeleteSwimlane: (id: number) => void;
}

const CONTEXT_COLORS: Record<string, string> = {
  Lincoln: 'var(--tk-lincoln)',
  RedSquatch: 'var(--tk-redsquatch)',
  Personal: 'var(--tk-personal)',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#c1573a',
  medium: '#b87333',
  low: '#8d7a6a',
};

// A lane of `null` renders as one unlaned row so tasks never disappear just
// because no swimlane has been created yet — swimlanes are purely opt-in.
type LaneKey = number | null;

export default function KanbanBoard({
  columns, swimlanes, tasks, contexts,
  onCreateTask, onMoveTask, onDeleteTask,
  onAddColumn, onRenameColumn, onResizeColumn, onDeleteColumn,
  onAddSwimlane, onRenameSwimlane, onDeleteSwimlane,
}: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const resizeState = useRef<{ id: number; startX: number; startWidth: number } | null>(null);

  const lanes: LaneKey[] = swimlanes.length > 0 ? [...swimlanes.map(l => l.id), null] : [null];

  function tasksFor(columnId: number, laneId: LaneKey) {
    return tasks
      .filter(t => t.column_id === columnId && (t.swimlane_id ?? null) === laneId)
      .sort((a, b) => a.position - b.position);
  }

  function cellKey(columnId: number, laneId: LaneKey) {
    return `${columnId}:${laneId ?? 'none'}`;
  }

  function handleDrop(columnId: number, laneId: LaneKey) {
    if (draggingId == null) return;
    const cellTasks = tasksFor(columnId, laneId);
    onMoveTask(draggingId, columnId, laneId, cellTasks.length);
    setDraggingId(null);
    setDragOverCell(null);
  }

  function startResize(e: React.MouseEvent, col: TaskColumn) {
    resizeState.current = { id: col.id, startX: e.clientX, startWidth: col.width_px };
    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current) return;
      const delta = ev.clientX - resizeState.current.startX;
      const next = Math.max(180, resizeState.current.startWidth + delta);
      const el = document.getElementById(`tk-col-${resizeState.current.id}`);
      if (el) el.style.width = `${next}px`;
    };
    const onUp = (ev: MouseEvent) => {
      if (resizeState.current) {
        const delta = ev.clientX - resizeState.current.startX;
        const next = Math.max(180, resizeState.current.startWidth + delta);
        onResizeColumn(resizeState.current.id, next);
      }
      resizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className={styles.board}>
      {lanes.map(laneId => {
        const lane = swimlanes.find(l => l.id === laneId) ?? null;
        return (
          <div key={laneId ?? 'unlaned'} className={styles.lane} style={{ flexDirection: 'column' }}>
            {lane && (
              <div className={styles.laneHeader}>
                <input
                  className={styles.laneTitleInput}
                  defaultValue={lane.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== lane.title && onRenameSwimlane(lane.id, e.target.value.trim())}
                />
                <button className={styles.laneDeleteBtn} onClick={() => onDeleteSwimlane(lane.id)} title="Remove swimlane">×</button>
              </div>
            )}
            <div className={styles.columnsRow}>
              {columns.map(col => {
                const cellTasks = tasksFor(col.id, laneId);
                const key = cellKey(col.id, laneId);
                const isOver = dragOverCell === key;
                return (
                  <div
                    key={col.id}
                    id={`tk-col-${col.id}`}
                    className={`${styles.column} ${isOver ? styles.columnDragOver : ''}`}
                    style={{ width: col.width_px }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCell(key); }}
                    onDragLeave={() => setDragOverCell(prev => (prev === key ? null : prev))}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.id, laneId); }}
                  >
                    {!lane && (
                      <div className={styles.columnHeader}>
                        <input
                          className={styles.columnTitleInput}
                          defaultValue={col.title}
                          onBlur={(e) => e.target.value.trim() && e.target.value !== col.title && onRenameColumn(col.id, e.target.value.trim())}
                        />
                        <span className={styles.columnCount}>{cellTasks.length}</span>
                        <button className={styles.columnDeleteBtn} onClick={() => onDeleteColumn(col.id)} title="Remove column">×</button>
                      </div>
                    )}
                    <div className={styles.columnBody}>
                      {cellTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggingId(task.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverCell(null); }}
                          className={`${styles.card} ${draggingId === task.id ? styles.cardDragging : ''} ${task.completed_at ? styles.cardDone : ''}`}
                        >
                          <p className={`${styles.cardTitle} ${task.completed_at ? styles.cardDoneTitle : ''}`}>{task.title}</p>
                          <div className={styles.cardMeta}>
                            {task.context && (
                              <span className={styles.badge} style={{ background: CONTEXT_COLORS[task.context] ?? '#8d7a6a' }}>{task.context}</span>
                            )}
                            <span className={styles.badge} style={{ background: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                            {task.due_date && <span className={styles.dueDate}>{new Date(task.due_date).toLocaleDateString()}</span>}
                            <button className={styles.cardDeleteBtn} onClick={() => onDeleteTask(task.id)}>✕</button>
                          </div>
                        </div>
                      ))}

                      {addingIn === key ? (
                        <QuickAddForm
                          contexts={contexts}
                          onCancel={() => setAddingIn(null)}
                          onSave={(data) => { onCreateTask(col.id, laneId, data); setAddingIn(null); }}
                        />
                      ) : (
                        <button className={styles.addTaskBtn} onClick={() => setAddingIn(key)}>+ Add task</button>
                      )}
                    </div>
                    <div className={styles.resizeHandle} onMouseDown={(e) => startResize(e, col)} />
                  </div>
                );
              })}
              {!lane && (
                <button className={styles.addColumnBtn} onClick={onAddColumn}>+ Column</button>
              )}
            </div>
          </div>
        );
      })}
      <button className={styles.addLaneBtn} onClick={onAddSwimlane}>+ Swimlane</button>
    </div>
  );
}

function QuickAddForm({ contexts, onSave, onCancel }: {
  contexts: string[];
  onSave: (data: { title: string; priority: string; context: string | null }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [context, setContext] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), priority, context: context || null });
  }

  return (
    <form className={styles.addTaskForm} onSubmit={submit}>
      <input
        autoFocus
        className={styles.addTaskInput}
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <div className={styles.addTaskRow}>
        <select className={styles.addTaskSelect} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <select className={styles.addTaskSelect} value={context} onChange={(e) => setContext(e.target.value)}>
          <option value="">no context</option>
          {contexts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className={styles.addTaskActions}>
        <button type="submit" className={styles.addTaskSave}>Add</button>
        <button type="button" className={styles.addTaskCancel} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
