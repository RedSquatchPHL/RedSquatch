'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { API } from '@/lib/api';

export interface Task {
  id: number;
  title: string;
  is_maintenance: boolean;
  goal_id: number | null;
  goal_title: string | null;
  status: 'todo' | 'in_progress' | 'done';
}

type TaskStatus = 'todo' | 'in_progress' | 'done';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo',        label: 'To Do'      },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done'        },
];

interface Props {
  onOpenLogs: (task: Task) => void;
}

export function TasksBoard({ onOpenLogs }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingIn, setAddingIn] = useState<{ status: TaskStatus; isMaintenance: boolean } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/client/tasks`, { credentials: 'include' });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (addingIn) setTimeout(() => inputRef.current?.focus(), 50);
  }, [addingIn]);

  async function createTask() {
    const title = newTitle.trim();
    if (!title || !addingIn) return;
    try {
      const res = await fetch(`${API}/api/client/tasks`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, is_maintenance: addingIn.isMaintenance, status: addingIn.status }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(prev => [...prev, { ...data.task, goal_title: null }]);
        setNewTitle('');
        setAddingIn(null);
      }
    } catch { /* silent */ }
  }

  async function moveTask(id: number, status: TaskStatus) {
    const prevTasks = tasks;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try {
      const res = await fetch(`${API}/api/client/tasks/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.logged) {
        // Maintenance task was logged and reset to todo
        await fetchTasks();
      } else if (!res.ok) {
        setTasks(prevTasks);
      }
    } catch {
      setTasks(prevTasks);
    }
  }

  async function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`${API}/api/client/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
  }

  // Drag handlers
  function onDragStart(id: number) { setDragId(id); }
  function onDragEnd() { setDragId(null); setOverCol(null); }
  function onDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    setOverCol(colKey);
  }
  function onDrop(colKey: TaskStatus) {
    if (dragId !== null) moveTask(dragId, colKey);
    setDragId(null);
    setOverCol(null);
  }

  const goalTasks = tasks.filter(t => !t.is_maintenance);
  const maintTasks = tasks.filter(t => t.is_maintenance);

  if (loading) return <div className="text-muted-foreground text-sm p-4">Loading tasks…</div>;

  return (
    <div className="space-y-8">
      <TaskSection
        label="Goal-Linked Tasks"
        badge="goal"
        tasks={goalTasks}
        isMaintenance={false}
        addingIn={addingIn}
        newTitle={newTitle}
        dragId={dragId}
        overCol={overCol}
        inputRef={inputRef}
        onStartAdd={(status) => { setAddingIn({ status, isMaintenance: false }); setNewTitle(''); }}
        onCancelAdd={() => setAddingIn(null)}
        onTitleChange={setNewTitle}
        onCreateTask={createTask}
        onMove={moveTask}
        onDelete={deleteTask}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onOpenLogs={onOpenLogs}
      />
      <TaskSection
        label="Maintenance Chores"
        badge="chore"
        tasks={maintTasks}
        isMaintenance={true}
        addingIn={addingIn}
        newTitle={newTitle}
        dragId={dragId}
        overCol={overCol}
        inputRef={inputRef}
        onStartAdd={(status) => { setAddingIn({ status, isMaintenance: true }); setNewTitle(''); }}
        onCancelAdd={() => setAddingIn(null)}
        onTitleChange={setNewTitle}
        onCreateTask={createTask}
        onMove={moveTask}
        onDelete={deleteTask}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onOpenLogs={onOpenLogs}
      />
    </div>
  );
}

// ---- TaskSection ----

interface SectionProps {
  label: string;
  badge: 'goal' | 'chore';
  tasks: Task[];
  isMaintenance: boolean;
  addingIn: { status: TaskStatus; isMaintenance: boolean } | null;
  newTitle: string;
  dragId: number | null;
  overCol: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onStartAdd: (status: TaskStatus) => void;
  onCancelAdd: () => void;
  onTitleChange: (v: string) => void;
  onCreateTask: () => void;
  onMove: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, colKey: string) => void;
  onDrop: (colKey: TaskStatus) => void;
  onOpenLogs: (task: Task) => void;
}

function TaskSection({
  label, badge, tasks, isMaintenance, addingIn, newTitle, dragId, overCol,
  inputRef, onStartAdd, onCancelAdd, onTitleChange, onCreateTask,
  onMove, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, onOpenLogs,
}: SectionProps) {
  const colId = (colKey: string) => `${isMaintenance ? 'm' : 'g'}-${colKey}`;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {label}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          const cid = colId(col.key);
          const isOver = overCol === cid;
          const isAdding = addingIn?.status === col.key && addingIn?.isMaintenance === isMaintenance;
          return (
            <div
              key={col.key}
              onDragOver={e => onDragOver(e, cid)}
              onDrop={() => onDrop(col.key)}
              className={[
                'glass-surface rounded-xl p-3 min-h-[160px] flex flex-col gap-2 transition-all',
                isOver ? 'kanban-col-over' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {col.label}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => onDragStart(task.id)}
                  onDragEnd={onDragEnd}
                  className={[
                    'glass-surface rounded-lg p-2.5 cursor-grab select-none group',
                    'hover:border-primary/50 transition-all',
                    dragId === task.id ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm text-foreground leading-snug flex-1">{task.title}</p>
                    <button
                      onClick={() => onDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs leading-none ml-1 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      badge === 'chore'
                        ? 'ctx-badge'
                        : 'bg-primary/10 text-primary border border-primary/30'
                    }`}>
                      {badge === 'chore' ? 'Chore' : (task.goal_title ? `→ ${task.goal_title.slice(0,18)}` : 'Task')}
                    </span>
                    {task.is_maintenance && (
                      <button
                        onClick={() => onOpenLogs(task)}
                        className="ctx-text text-[10px] hover:opacity-80 transition-opacity"
                        title="View maintenance log"
                      >
                        History
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add task inline */}
              {isAdding ? (
                <div className="space-y-1.5 mt-1">
                  <Input
                    ref={inputRef}
                    value={newTitle}
                    onChange={e => onTitleChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onCreateTask();
                      if (e.key === 'Escape') onCancelAdd();
                    }}
                    placeholder="Task title…"
                    className="h-7 text-xs border-primary/40"
                  />
                  <div className="flex gap-1">
                    <button onClick={onCreateTask}
                      className="text-xs px-2 py-1 rounded ctx-btn-active hover:opacity-90">
                      Add
                    </button>
                    <button onClick={onCancelAdd}
                      className="text-xs px-2 py-1 rounded border border-primary/20 text-muted-foreground hover:text-foreground">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onStartAdd(col.key)}
                  className="text-xs text-muted-foreground hover:ctx-text mt-auto pt-1 text-left hover:opacity-80 transition-opacity"
                >
                  + Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
