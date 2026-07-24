'use client';

import { useState } from 'react';
import TypeBadge from '@/components/TypeBadge';
import styles from '@/styles/work.module.css';

export type WorkCard = {
  id: number;
  ticket_number: string;
  task_type: string;
  priority: string | null;
  short_description: string;
  opened_at: string | null;
  state: string;
  done: boolean;
  follow_up_at: string | null;
  backburner: boolean;
  parent_id: number | null;
  description: string | null;
  related_project: string | null;
  related_enhancement: string | null;
  imported_at: string;
  created_at: string;
};

export const FOLLOW_UP_MINUTES_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240];

// Demand > {Project, Enhancement} > Story > Scrum Task, with Release also
// optionally tied to a Story. ServiceNow Request/Defect sit outside the
// hierarchy — no parent question for them.
export const ALLOWED_PARENT_TYPES: Record<string, string[]> = {
  STSK: ['STRY'],
  STRY: ['PRJ', 'ENHC'],
  PRJ: ['DMND'],
  ENHC: ['DMND'],
  RLSE: ['STRY'],
};

export const TYPE_NAME: Record<string, string> = {
  DMND: 'Demand',
  PRJ: 'Project',
  ENHC: 'Enhancement',
  STRY: 'Story',
  STSK: 'Scrum Task',
  RLSE: 'Release',
  SNWR: 'ServiceNow Request',
  DFCT: 'Defect',
};

const PRIORITY_COLOR: Record<string, { border: string; color: string; bg: string }> = {
  '1': { border: '#e08a3c', color: '#e08a3c', bg: 'rgba(224,138,60,0.20)' },
  '2': { border: '#e08a3c', color: '#e08a3c', bg: 'rgba(224,138,60,0.14)' },
  '3': { border: '#b87333', color: '#b87333', bg: 'rgba(184,115,51,0.16)' },
  '4': { border: '#d4a373', color: '#d4a373', bg: 'rgba(212,163,115,0.12)' },
  '5': { border: 'rgba(184,115,51,0.4)', color: 'rgba(184,115,51,0.6)', bg: 'rgba(184,115,51,0.06)' },
};
const FALLBACK_PRIORITY = { border: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)' };

function PriorityBadge({ priority }: { priority: string }) {
  const num = priority.match(/^(\d+)/)?.[1] ?? '';
  const s = PRIORITY_COLOR[num] ?? FALLBACK_PRIORITY;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.85rem',
        fontWeight: 600,
        padding: '0.1rem 0.5rem',
        border: `2px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        letterSpacing: '0.02em',
      }}
    >
      {priority}
    </span>
  );
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'due';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDurationLabel(min: number): string {
  if (min % 60 === 0) return `${min / 60}h`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export default function WorkCard({
  card,
  allCards,
  now,
  pulsing,
  onToggleDone,
  onToggleBackburner,
  onSetFollowUp,
  onSetParent,
  onOpenJournal,
}: {
  card: WorkCard;
  allCards: WorkCard[];
  now: number;
  pulsing: boolean;
  onToggleDone: (id: number) => void;
  onToggleBackburner: (id: number) => void;
  onSetFollowUp: (id: number, minutes: number | null) => void;
  onSetParent: (id: number, parentId: number | null) => void;
  onOpenJournal: (id: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const followUpActive = card.follow_up_at != null;
  const remainingMs = followUpActive ? new Date(card.follow_up_at as string).getTime() - now : 0;
  const allowedParentTypes = ALLOWED_PARENT_TYPES[card.task_type];
  const hasDetails = !!(card.description || card.related_project || card.related_enhancement);

  function handleFollowUpClick() {
    if (followUpActive) {
      onSetFollowUp(card.id, null);
      setPickerOpen(false);
    } else {
      setPickerOpen(o => !o);
    }
  }

  return (
    <div className={`${styles.card} ${pulsing ? styles.cardPulsing : ''}`}>
      <div className={styles.cardBadges}>
        <TypeBadge type={card.task_type} />
        {card.priority && <PriorityBadge priority={card.priority} />}
        <span className={styles.mono}>{card.ticket_number}</span>
      </div>

      <p className={styles.cardDescription}>{card.short_description}</p>

      <div className={styles.cardMeta}>
        {card.opened_at && <span>Opened {new Date(card.opened_at).toLocaleDateString()}</span>}
        <span>{card.state}</span>
      </div>

      {hasDetails && (
        <>
          <button
            type="button"
            className={styles.cardDetailsToggle}
            onClick={() => setDetailsOpen(o => !o)}
          >
            {detailsOpen ? 'Hide details ▴' : 'Show details ▾'}
          </button>
          {detailsOpen && (
            <div className={styles.cardDetailsText}>
              {card.related_project && <div><strong>Project:</strong> {card.related_project}</div>}
              {card.related_enhancement && <div><strong>Enhancement:</strong> {card.related_enhancement}</div>}
              {card.description}
            </div>
          )}
        </>
      )}

      {allowedParentTypes && (
        <div className={styles.parentPicker}>
          <label className={styles.parentPickerLabel}>
            Is this part of another {allowedParentTypes.map(t => TYPE_NAME[t]).join(' or ')}?
          </label>
          <select
            className={styles.parentPickerSelect}
            value={card.parent_id ?? ''}
            onChange={e => onSetParent(card.id, e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— None —</option>
            {allCards
              .filter(c => allowedParentTypes.includes(c.task_type) && c.id !== card.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.ticket_number} — {c.short_description}</option>
              ))}
          </select>
        </div>
      )}

      <div className={styles.cardToggles}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${card.done ? styles.toggleBtnActive : ''}`}
          onClick={() => onToggleDone(card.id)}
        >
          Done
        </button>

        <div className={styles.followUpWrap}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${followUpActive ? styles.toggleBtnActive : ''}`}
            onClick={handleFollowUpClick}
          >
            {followUpActive ? `Follow Up · ${formatRemaining(remainingMs)}` : 'Follow Up'}
          </button>
          {pickerOpen && !followUpActive && (
            <div className={styles.durationPicker}>
              {FOLLOW_UP_MINUTES_OPTIONS.map(min => (
                <button
                  key={min}
                  type="button"
                  className={styles.durationOption}
                  onClick={() => { onSetFollowUp(card.id, min); setPickerOpen(false); }}
                >
                  {formatDurationLabel(min)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={`${styles.toggleBtn} ${card.backburner ? styles.toggleBtnActive : ''}`}
          onClick={() => onToggleBackburner(card.id)}
        >
          Backburner
        </button>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => onOpenJournal(card.id)}
        >
          Journal
        </button>
      </div>
    </div>
  );
}
