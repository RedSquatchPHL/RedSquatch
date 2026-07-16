'use client';

import {
  FileText, Search, Target, Layers, BookOpen, ListChecks, Zap, CheckCircle2, Rocket,
  type LucideIcon,
} from 'lucide-react';

interface WorkflowStage {
  label: string;
  icon: LucideIcon;
}

// SNWR/Project >> Discovery >> Demand >> Enhancement/Project >> User Stories
// >> Scrum Tasks >> Sprint >> Story/Task Completion >> Deployment
const WORKFLOW_STAGES: WorkflowStage[] = [
  { label: 'SNWR/Project', icon: FileText },
  { label: 'Discovery', icon: Search },
  { label: 'Demand', icon: Target },
  { label: 'Enhancement/Project', icon: Layers },
  { label: 'User Stories', icon: BookOpen },
  { label: 'Scrum Tasks', icon: ListChecks },
  { label: 'Sprint', icon: Zap },
  { label: 'Story/Task Completion', icon: CheckCircle2 },
  { label: 'Deployment', icon: Rocket },
];

const SEGMENTS_PER_CONNECTOR = 5;
const SEGMENTS_PER_COLLAPSED_CONNECTOR = 2;

interface Props {
  /** 0-based index of the current stage in WORKFLOW_STAGES. Purely informational — not tied to any stored field. */
  currentStageIndex: number;
}

export default function WorkflowProgressBar({ currentStageIndex }: Props) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-start">
        {WORKFLOW_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isComplete = i < currentStageIndex;
          const isActive = i === currentStageIndex;
          const isLit = isComplete || isActive;

          return (
            <div key={stage.label} className={`flex items-start ${isComplete ? 'shrink-0' : 'flex-1 last:flex-none'}`}>
              <div
                className={`flex flex-col items-center gap-2 shrink-0 transition-[width] duration-300 ${
                  isComplete ? 'w-9' : 'w-[92px]'
                }`}
                title={isComplete ? stage.label : undefined}
              >
                <div
                  className={`flex items-center justify-center rounded-[10px] transition-[width,height] duration-300 ${
                    isComplete ? 'w-8 h-8' : 'w-11 h-11'
                  } ${isLit ? 'lit-tile' : 'stone-tile'} ${isActive ? 'workflow-glyph-active' : ''}`}
                >
                  <Icon
                    size={isComplete ? 14 : 18}
                    className={isLit ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)] opacity-50'}
                  />
                </div>
                {/* Completed stages collapse to an icon-only pill (label still available via title tooltip)
                    so the bar keeps shrinking as a group progresses instead of permanently needing its
                    full 9-stage width. */}
                {!isComplete && (
                  <div
                    className={`text-center text-[9px] tracking-[0.06em] leading-tight font-[family-name:var(--font-data)] ${
                      isLit ? 'text-[var(--copper-2)]' : 'text-[var(--copper-0)] opacity-50'
                    }`}
                  >
                    {stage.label}
                  </div>
                )}
              </div>

              {i < WORKFLOW_STAGES.length - 1 && (
                <div
                  className={`flex items-center h-11 gap-[3px] px-1 ${isComplete ? 'w-6 shrink-0' : 'flex-1'}`}
                >
                  {Array.from({ length: isComplete ? SEGMENTS_PER_COLLAPSED_CONNECTOR : SEGMENTS_PER_CONNECTOR }).map((_, seg) => (
                    <div
                      key={seg}
                      className="h-[3px] flex-1 rounded-full"
                      style={{
                        // Sleeping segments need a solid base fill, not just low-alpha copper on a
                        // transparent background — at 0.12 alpha alone they read as empty space rather
                        // than a dim/unlit LED segment, since the panel background varies underneath.
                        background: isComplete ? 'rgba(var(--copper-glow-rgb), 0.7)' : 'var(--stone-2)',
                        border: isComplete ? 'none' : '1px solid rgba(var(--copper-glow-rgb), 0.18)',
                        boxShadow: isComplete ? '0 0 6px rgba(var(--copper-glow-rgb), 0.4)' : 'none',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
