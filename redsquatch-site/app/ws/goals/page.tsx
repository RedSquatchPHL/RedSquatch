'use client';

import { useState } from 'react';
import { ContextSwitcher, type AppContext } from '@/components/ContextSwitcher';
import { GoalsPanel } from '@/components/GoalsPanel';
import { TasksBoard, type Task } from '@/components/TasksBoard';
import { MaintenanceDrawer } from '@/components/MaintenanceDrawer';
import CopperPanel from '@/components/cenote/CopperPanel';

const CTX_COLORS: Record<AppContext, { accent: string; dim: string }> = {
  work:     { accent: '#4a5568', dim: 'rgba(74, 85, 104, 0.15)'  },
  home:     { accent: '#a0826d', dim: 'rgba(160, 130, 109, 0.15)' },
  personal: { accent: '#14b8a6', dim: 'rgba(20, 184, 166, 0.12)' },
};

export default function WSGoalsPage() {
  const [context, setContext] = useState<AppContext>('work');
  const [logTask, setLogTask] = useState<Task | null>(null);

  const { accent, dim } = CTX_COLORS[context];

  return (
    <div
      data-context={context}
      style={{ '--ctx-accent': accent, '--ctx-accent-dim': dim } as React.CSSProperties}
      className="p-6 space-y-6"
    >
      {/* Page header */}
      <CopperPanel>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1
            className="text-2xl font-bold"
            style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}
          >
            WorkSquatch Goals &amp; Tasks
          </h1>
          <ContextSwitcher value={context} onChange={setContext} />
        </div>
      </CopperPanel>

      {/* Goals panel */}
      <CopperPanel>
        <GoalsPanel context={context} />
      </CopperPanel>

      {/* Divider */}
      <div className="copper-line" />

      {/* Tasks board */}
      <CopperPanel>
        <h2
          className="text-lg font-bold mb-5"
          style={{ color: '#d4a373' }}
        >
          Task Board
        </h2>
        <TasksBoard onOpenLogs={setLogTask} />
      </CopperPanel>

      <MaintenanceDrawer task={logTask} onClose={() => setLogTask(null)} />
    </div>
  );
}
