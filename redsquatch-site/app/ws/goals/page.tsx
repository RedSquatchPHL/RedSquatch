'use client';

import { useState } from 'react';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { ContextSwitcher, type AppContext } from '@/components/ContextSwitcher';
import { GoalsPanel } from '@/components/GoalsPanel';
import { TasksBoard, type Task } from '@/components/work/TasksBoard';
import { MaintenanceDrawer } from '@/components/MaintenanceDrawer';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecPanel from '@/components/aztec/AztecPanel';
import AztecMotion from '@/components/aztec/AztecMotion';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

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
      className={`aztec-command ${unbounded.variable} ${jbMono.variable} p-6 space-y-6 pb-28 min-h-screen`}
    >
      <AztecMotion marqueeItems={['Goals', 'Work Items', 'Sports', 'Tools', 'RedSquatch']} />

      <div className="relative z-[1] max-w-[1400px] mx-auto space-y-6">
        <AztecHeader label="OVERVIEW" />

        <div className="ac-grid space-y-6">
          {/* Page header */}
          <AztecPanel family="eagle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-unbounded)', color: 'var(--ac-copper-light)', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}
              >
                WorkSquatch Goals &amp; Tasks
              </h1>
              <ContextSwitcher value={context} onChange={setContext} />
            </div>
          </AztecPanel>

          {/* Goals panel */}
          <AztecPanel family="eagle" title="Goals">
            <GoalsPanel context={context} />
          </AztecPanel>

          {/* Tasks board */}
          <AztecPanel family="fire" title="Task Board">
            <TasksBoard onOpenLogs={setLogTask} />
          </AztecPanel>
        </div>
      </div>

      <MaintenanceDrawer task={logTask} onClose={() => setLogTask(null)} />
    </div>
  );
}
