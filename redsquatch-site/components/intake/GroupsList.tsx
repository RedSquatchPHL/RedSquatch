'use client';

import type { WorkGroup } from './types';

interface Props {
  groups: WorkGroup[];
  loading: boolean;
  selectedGroupId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

const STATUS_BADGE_VARIANT: Record<string, string> = {
  'In Discovery': 'active',
  'In Planning':  'active',
  'In Build':     'active',
  'In Test':      'active',
  'Done':         'jade',
  'On Hold':      'warning',
};

export default function GroupsList({ groups, loading, selectedGroupId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(184,115,51,0.2)]">
        <h2 className="text-xs font-semibold tracking-wider text-[#d4a373]">Groups</h2>
        <button
          onClick={onNew}
          className="text-xs px-2 py-1 bg-[rgba(184,115,51,0.2)] hover:bg-[rgba(184,115,51,0.35)] text-[#b87333] border border-[rgba(184,115,51,0.3)]"
        >
          + New Group
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-white/40 text-sm py-8">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-white/40 text-sm py-8 px-4">
            No groups yet.{' '}
            <button onClick={onNew} className="text-[#b87333] hover:underline">Create one →</button>
          </div>
        ) : (
          <ul>
            {groups.map(g => (
              <li key={g.id}>
                <div
                  onClick={() => onSelect(g.id)}
                  className={`group flex items-start justify-between gap-2 px-4 py-3 cursor-pointer border-b border-[rgba(255,255,255,0.05)] ${
                    selectedGroupId === g.id
                      ? 'bg-[rgba(184,115,51,0.15)]'
                      : 'hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white truncate">{g.name}</span>
                      {g.follow_up_flag && (
                        <span title={g.follow_up_date ? `Follow up: ${g.follow_up_date}` : 'Follow up flagged'} className="text-yellow-400 text-xs">●</span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className={`status-badge ${STATUS_BADGE_VARIANT[g.status] ?? ''}`}>{g.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(g.id); }}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs px-1.5 py-1"
                    aria-label="Delete group"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
