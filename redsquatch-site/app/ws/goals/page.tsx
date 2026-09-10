'use client';

import { useState } from 'react';
import { TasksBoard, type Task } from '@/components/work/TasksBoard';
import { WSGoalsTimeline } from '@/components/work/WSGoalsTimeline';
import { MaintenanceDrawer } from '@/components/MaintenanceDrawer';
import s from './goals.module.css';

export default function WSGoalsPage() {
  const [logTask, setLogTask] = useState<Task | null>(null);

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.header}>
          <h1 className={s.wordmark}>WorkSquatch</h1>
          <p className={s.subtitle}>GOALS</p>
        </div>

        <div className={s.timelinePanel}>
          <WSGoalsTimeline />
        </div>

        <div className={s.boardFrame}>
          <h2 className={s.boardHeading}>Task Board &amp; Career Trajectory</h2>
          <p className={s.boardNote}>Shared with /hs — not yet reskinned, kept as-is here.</p>
          <div className={s.boardInner}>
            <TasksBoard onOpenLogs={setLogTask} />
          </div>
        </div>
      </div>

      <MaintenanceDrawer task={logTask} onClose={() => setLogTask(null)} />
    </div>
  );
}
