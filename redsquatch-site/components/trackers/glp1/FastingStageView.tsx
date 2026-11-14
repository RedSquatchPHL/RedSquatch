'use client';

import { useEffect, useState } from 'react';
import { FASTING_STAGES, getStage, getNextStage, stageProgress } from './fastingStages';
import { panelStyle } from './shared';

interface Props {
  startedAt: string | null;
}

function fmtElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Total hours spanned by the finite stages, used to size strip segments proportionally.
const FINITE_SPAN = FASTING_STAGES.filter(s => s.endHours !== Infinity)
  .reduce((sum, s) => sum + (s.endHours - s.startHours), 0);
const LAST_STAGE_SHARE = 0.12; // visual weight of the open-ended "Deep Fast" segment

function segmentWidth(stage: (typeof FASTING_STAGES)[number]): string {
  if (stage.endHours === Infinity) return `${(LAST_STAGE_SHARE * 100).toFixed(1)}%`;
  const span = stage.endHours - stage.startHours;
  return `${(((span / FINITE_SPAN) * (1 - LAST_STAGE_SHARE)) * 100).toFixed(1)}%`;
}

export default function FastingStageView({ startedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    const startMs = new Date(startedAt).getTime();
    const update = () => setElapsed(Date.now() - startMs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const isActive = !!startedAt;
  const stage = getStage(elapsed);
  const next = getNextStage(stage);
  const progress = stageProgress(elapsed, stage);

  const msUntilNext = next ? next.startHours * 3_600_000 - elapsed : null;

  const accent = 'var(--rs-accent)';
  const accentRgb = 'var(--rs-accent-rgb)';
  const muted = `rgba(${accentRgb},0.5)`;
  const dimmed = `rgba(${accentRgb},0.25)`;

  return (
    <div className="rounded-lg p-4 mb-4" style={panelStyle}>
      {/* Stage name + elapsed */}
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span
          className="text-2xl font-bold tracking-tight leading-none"
          style={{ color: accent, textShadow: `0 0 20px rgba(${accentRgb},0.35)` }}
        >
          {stage.name}
        </span>
        <span
          className="font-mono text-lg shrink-0"
          style={{ color: isActive ? accent : muted }}
        >
          {isActive ? fmtElapsed(elapsed) : '—'}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm mb-4 leading-snug" style={{ color: muted }}>
        {stage.description}
      </p>

      {/* Progress bar toward next stage */}
      {isActive && (
        <div className="mb-4">
          <div
            className="h-2 rounded-full overflow-hidden mb-1.5"
            style={{ background: `rgba(${accentRgb},0.12)` }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(progress * 100).toFixed(1)}%`,
                background: stage.endHours === Infinity
                  ? `rgba(${accentRgb},0.5)`
                  : accent,
              }}
            />
          </div>
          <div className="text-xs" style={{ color: muted }}>
            {next && msUntilNext !== null && msUntilNext > 0
              ? <>{fmtCountdown(msUntilNext)} until <strong style={{ color: accent }}>{next.name}</strong></>
              : stage.endHours === Infinity
                ? 'In deep fast'
                : <strong style={{ color: accent }}>Entering {next?.name}</strong>
            }
          </div>
        </div>
      )}

      {/* Stage strip */}
      <div
        className="flex rounded-md overflow-hidden mb-4"
        style={{ border: `1px solid rgba(${accentRgb},0.15)`, height: 36 }}
        role="list"
        aria-label="Fasting stages"
      >
        {FASTING_STAGES.map((s, idx) => {
          const isPast = isActive && elapsed > s.endHours * 3_600_000;
          const isCurrent = isActive && s.id === stage.id;
          const isFuture = !isPast && !isCurrent;

          let bg: string;
          if (isCurrent) bg = `rgba(${accentRgb},0.22)`;
          else if (isPast) bg = `rgba(${accentRgb},0.1)`;
          else bg = 'transparent';

          return (
            <div
              key={s.id}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-col items-center justify-center relative"
              style={{
                width: segmentWidth(s),
                background: bg,
                borderRight: idx < FASTING_STAGES.length - 1
                  ? `1px solid rgba(${accentRgb},0.12)`
                  : undefined,
                transition: 'background 0.6s',
              }}
            >
              <span
                className="text-[10px] font-semibold leading-none text-center px-1 truncate w-full text-center"
                style={{
                  color: isCurrent ? accent : isFuture ? dimmed : muted,
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {s.name}
              </span>
              {isCurrent && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: accent, opacity: 0.8 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] leading-snug" style={{ color: `rgba(${accentRgb},0.35)` }}>
        Approximate, based on general fasting research. Not medical advice.
      </p>
    </div>
  );
}
