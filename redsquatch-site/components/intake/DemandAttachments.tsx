'use client';

import { useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/api';

interface Attachment {
  id: number;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}

interface Props {
  demandFormId: number;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
};

export default function DemandAttachments({ demandFormId }: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/client/files/demand/${demandFormId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load attachments');
      const data = await res.json();
      setFiles(data?.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [demandFormId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API}/api/client/files/demand/${demandFormId}`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: number) => {
    if (!confirm('Delete this attachment permanently?')) return;
    try {
      const res = await fetch(`${API}/api/client/files/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete attachment');
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs text-[#d4a373]">Attachments</label>
        <label
          className={`text-xs border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-3 py-1.5 cursor-pointer ${uploading ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {uploading ? 'Uploading...' : 'Upload Transcript'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-xs text-white/30">Loading attachments...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-white/30">No attachments yet.</p>
      ) : (
        <ul className="space-y-1">
          {files.map(f => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 border-b border-[rgba(184,115,51,0.1)] py-1.5"
            >
              <div className="min-w-0">
                <div className="text-sm text-white/80 truncate" title={f.original_name}>{f.original_name}</div>
                <div className="text-xs text-white/30">
                  {formatBytes(f.size_bytes)} &middot; {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={`${API}/api/client/files/${f.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#d4a373] hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => deleteFile(f.id)}
                  className="text-xs text-red-400/70 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
