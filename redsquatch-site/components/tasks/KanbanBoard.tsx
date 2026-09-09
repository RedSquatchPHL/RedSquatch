'use client';

import { useState } from 'react';
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
  onUpdateDescription: (taskId: number, description: string) => void;
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

// Each context gets a stamped "seal" glyph rather than a colored word —
// Lincoln (the day job) reads as a squared-off ledger mark, RedSquatch wears
// the site's own sun, Personal gets a loose star. Border color still carries
// the context identity; the glyph carries its meaning.
const CONTEXT_GLYPHS: Record<string, string> = {
  Lincoln: '▪',
  RedSquatch: '☀',
  Personal: '✦',
};

// Priority as tally marks — one to three ticks — so severity is legible by
// count as well as by color, the way a carved tally would read.
const PRIORITY_TALLIES: Record<string, { marks: string; className: string }> = {
  high: { marks: '▲▲▲', className: '' },
  medium: { marks: '▲▲', className: 'tallyMedium' },
  low: { marks: '▲', className: 'tallyLow' },
};

// A lane of `null` renders as one unlaned row so tasks never disappear just
// because no swimlane has been created yet — swimlanes are purely opt-in.
type LaneKey = number | null;

export default function KanbanBoard({
  columns = [], swimlanes = [], tasks = [], contexts = [],
  onCreateTask, onMoveTask, onDeleteTask, onUpdateDescription,
  onAddColumn, onRenameColumn, onResizeColumn, onDeleteColumn,
  onAddSwimlane, onRenameSwimlane, onDeleteSwimlane,
}: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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

  function toggleExpanded(taskId: number) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  // Resizing lives on the hoisted header cell, but every lane's column-body
  // cell for the same column must track it live too — they all carry
  // data-col-id so one drag updates every matching cell at once, not just
  // the header.
  function startResize(e: React.MouseEvent, col: TaskColumn) {
    const startX = e.clientX;
    const startWidth = col.width_px;
    const cells = Array.from(document.querySelectorAll<HTMLElement>(`[data-col-id="${col.id}"]`));

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(180, startWidth + delta);
      cells.forEach(cell => { cell.style.width = `${next}px`; });
    };
    const onUp = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(180, startWidth + delta);
      onResizeColumn(col.id, next);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className={styles.board}>
      {/* Column headers live once at the top of the board, not per swimlane —
          rename/resize/delete apply to the column across every lane. */}
      <div className={styles.columnHeaderRow}>
        {columns.map(col => (
          <div
            key={col.id}
            className={styles.columnHeaderCell}
            data-col-id={col.id}
            style={{ width: col.width_px }}
          >
            <div className={styles.columnFrieze} aria-hidden="true" />
            <div className={styles.columnHeader}>
              <input
                className={styles.columnTitleInput}
                defaultValue={col.title}
                onBlur={(e) => e.target.value.trim() && e.target.value !== col.title && onRenameColumn(col.id, e.target.value.trim())}
              />
              <span className={styles.columnCount}>{tasks.filter(t => t.column_id === col.id).length}</span>
              <button className={styles.columnDeleteBtn} onClick={() => onDeleteColumn(col.id)} title="Remove column">×</button>
            </div>
            <div className={styles.resizeHandle} onMouseDown={(e) => startResize(e, col)} />
          </div>
        ))}
        <button className={styles.addColumnBtn} onClick={onAddColumn}>+ Column</button>
      </div>

      {lanes.map(laneId => {
        const lane = swimlanes.find(l => l.id === laneId) ?? null;
        return (
          <div key={laneId ?? 'unlaned'} className={styles.lane}>
            {lane && (
              <div className={styles.laneHeader}>
                <span className={styles.laneGlyph} aria-hidden="true">≈</span>
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
                    data-col-id={col.id}
                    className={`${styles.columnBody} ${isOver ? styles.columnDragOver : ''}`}
                    style={{ width: col.width_px }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCell(key); }}
                    onDragLeave={() => setDragOverCell(prev => (prev === key ? null : prev))}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.id, laneId); }}
                  >
                    {cellTasks.map(task => {
                      const expanded = expandedIds.has(task.id);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggingId(task.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverCell(null); }}
                          className={`${styles.card} ${draggingId === task.id ? styles.cardDragging : ''} ${task.completed_at ? styles.cardDone : ''}`}
                        >
                          <div className={styles.cardTitleRow}>
                            <button
                              className={styles.cardExpandBtn}
                              onClick={() => toggleExpanded(task.id)}
                              title={expanded ? 'Collapse' : 'Add/view notes'}
                              aria-label={expanded ? 'Collapse notes and move controls' : 'Expand notes and move controls'}
                              aria-expanded={expanded}
                            >
                              {expanded ? '▾' : '▸'}
                            </button>
                            <p className={`${styles.cardTitle} ${task.completed_at ? styles.cardDoneTitle : ''}`}>{task.title}</p>
                          </div>
                          <div className={styles.cardMeta}>
                            {task.context && (
                              <span
                                className={styles.seal}
                                style={{ color: CONTEXT_COLORS[task.context] ?? 'var(--tk-ink-soft)' }}
                                title={task.context}
                              >
                                {CONTEXT_GLYPHS[task.context] ?? '●'}
                              </span>
                            )}
                            <span
                              className={`${styles.tally} ${styles[PRIORITY_TALLIES[task.priority]?.className] ?? ''}`}
                              title={`${task.priority} priority`}
                            >
                              {PRIORITY_TALLIES[task.priority]?.marks ?? '▲'}
                            </span>
                            {task.due_date && <span className={styles.dueDate}>{new Date(task.due_date).toLocaleDateString()}</span>}
                            <button className={styles.cardDeleteBtn} onClick={() => onDeleteTask(task.id)}>✕</button>
                          </div>
                          {expanded && (
                            <>
                              {/* Keyboard-operable equivalent to the drag-and-drop move above —
                                  native selects need no custom listbox and reach every column/lane
                                  a mouse drag can. */}
                              <div className={styles.moveRow}>
                                <label className={styles.moveLabel}>
                                  Move to
                                  <select
                                    className={styles.moveSelect}
                                    value={col.id}
                                    onChange={(e) => {
                                      const targetCol = Number(e.target.value);
                                      const targetTasks = tasksFor(targetCol, laneId);
                                      onMoveTask(task.id, targetCol, laneId, targetTasks.length);
                                    }}
                                  >
                                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                  </select>
                                </label>
                                {swimlanes.length > 0 && (
                                  <label className={styles.moveLabel}>
                                    Swimlane
                                    <select
                                      className={styles.moveSelect}
                                      value={laneId ?? ''}
                                      onChange={(e) => {
                                        const targetLane = e.target.value === '' ? null : Number(e.target.value);
                                        const targetTasks = tasksFor(col.id, targetLane);
                                        onMoveTask(task.id, col.id, targetLane, targetTasks.length);
                                      }}
                                    >
                                      <option value="">Unlaned</option>
                                      {swimlanes.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                    </select>
                                  </label>
                                )}
                              </div>
                              <textarea
                                className={styles.cardNotes}
                                defaultValue={task.description ?? ''}
                                placeholder="Notes..."
                                onBlur={(e) => e.target.value !== (task.description ?? '') && onUpdateDescription(task.id, e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}

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
                );
              })}
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
