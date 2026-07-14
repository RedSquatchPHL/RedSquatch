'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2, FileIcon } from 'lucide-react';
import { API } from '@/lib/api';
import { Progress } from '@/components/ui/progress';

const MAX_BYTES = 1024 * 1024 * 1024; // 1GB, mirrors the server-side multer limit

interface ClientFile {
  id: number;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
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

export default function FileTransferPanel() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/client/files`, { credentials: 'include' });
      const data = await res.json();
      setFiles(data?.files || []);
    } catch {
      // leave the previous list in place; user can retry via drag/drop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const uploadFile = useCallback((file: File) => {
    setError('');
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" is over the 1GB limit`);
      return;
    }

    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/client/files`);
    xhr.withCredentials = true;

    setUploadName(file.name);
    setUploadPct(0);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploadPct(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        loadFiles();
      } else {
        try {
          setError(JSON.parse(xhr.responseText)?.error || 'Upload failed');
        } catch {
          setError('Upload failed');
        }
      }
    };
    xhr.onerror = () => {
      setUploadPct(null);
      setError('Upload failed');
    };
    xhr.send(form);
  }, [loadFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const deleteFile = async (id: number) => {
    if (!window.confirm('Delete this file permanently? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api/client/files/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch {
      // fall through to refresh regardless
    }
    loadFiles();
  };

  return (
    <div
      className="glass-surface rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid rgba(184,115,51,0.25)' }}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 p-6 m-3 rounded-xl cursor-pointer transition-colors"
        style={{
          border: `1px dashed ${dragOver ? '#b87333' : 'rgba(184,115,51,0.35)'}`,
          background: dragOver ? 'rgba(184,115,51,0.08)' : 'transparent',
        }}
      >
        <Upload size={20} style={{ color: '#d4a373' }} />
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Drag a file here, or click to browse (up to 1GB)
        </span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {uploadPct !== null && (
        <div className="px-6 pb-3 space-y-1">
          <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="truncate">{uploadName}</span>
            <span>{uploadPct}%</span>
          </div>
          <Progress value={uploadPct} />
        </div>
      )}

      {error && (
        <div className="px-6 pb-3 text-xs" style={{ color: '#e07856' }}>
          {error}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(184,115,51,0.15)' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Loading…
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No files yet.
          </div>
        ) : (
          <ul>
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(184,115,51,0.1)' }}
              >
                <FileIcon size={16} style={{ color: '#d4a373', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.8)' }} title={f.original_name}>
                    {f.original_name}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`${API}/api/client/files/${f.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded hover:bg-white/5 transition-colors"
                  title="Download"
                >
                  <Download size={14} style={{ color: '#d4a373' }} />
                </a>
                <button
                  onClick={() => deleteFile(f.id)}
                  className="p-2 rounded hover:bg-white/5 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} style={{ color: '#b87333' }} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
