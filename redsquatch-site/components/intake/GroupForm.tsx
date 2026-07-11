'use client';

import { useState } from 'react';
import type { WorkGroup, GroupStatus } from './types';
import { GROUP_STATUSES } from './types';

interface Props {
  group: WorkGroup | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    status: GroupStatus;
    follow_up_flag: boolean;
    follow_up_date: string | null;
  }) => Promise<void>;
}

export default function GroupForm({ group, onClose, onSave }: Props) {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [status, setStatus] = useState<GroupStatus>(group?.status ?? 'In Discovery');
  const [followUpFlag, setFollowUpFlag] = useState(group?.follow_up_flag ?? false);
  const [followUpDate, setFollowUpDate] = useState(group?.follow_up_date?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        status,
        follow_up_flag: followUpFlag,
        follow_up_date: followUpFlag && followUpDate ? followUpDate : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#161616] border border-[rgba(184,115,51,0.3)] p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg text-[#d4a373] font-medium mb-4">{group ? 'Edit Group' : 'New Group'}</h2>

        {error && (
          <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[#d4a373]">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.3)] text-white px-0 py-1.5 focus:outline-none focus:border-[#d4a373] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#d4a373]">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.3)] text-white px-0 py-1.5 resize-none focus:outline-none focus:border-[#d4a373] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#d4a373]">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as GroupStatus)}
              className="w-full bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white px-2 py-1.5 focus:outline-none focus:border-[#d4a373] transition-colors"
            >
              {GROUP_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="follow-up-flag"
              checked={followUpFlag}
              onChange={e => setFollowUpFlag(e.target.checked)}
              className="accent-[#b87333]"
            />
            <label htmlFor="follow-up-flag" className="text-xs text-[#d4a373]">Follow-up flag</label>
          </div>

          {followUpFlag && (
            <div className="space-y-1">
              <label className="text-xs text-[#d4a373]">Follow-up date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.3)] text-white px-0 py-1.5 focus:outline-none focus:border-[#d4a373] transition-colors"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white/50 hover:text-white px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="text-sm bg-[#b87333] hover:bg-[#b87333]/80 text-[#0f0f0f] font-semibold px-4 py-1.5 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : group ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
