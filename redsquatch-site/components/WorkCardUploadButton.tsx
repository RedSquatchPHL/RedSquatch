'use client';

import { useRef, useState } from 'react';
import { API } from '@/lib/api';
import styles from '@/styles/work.module.css';

export type ImportResult = {
  imported: number;
  updated: number;
  removed: number;
  needsReview: unknown[];
};

export default function WorkCardUploadButton({
  onImported,
}: {
  onImported: (result: ImportResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // No explicit Content-Type — the browser sets the multipart boundary itself.
      const res = await fetch(`${API}/api/client/work-cards/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Import failed');
      onImported(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Check the file format and try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={styles.importWrap}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className={styles.hiddenInput}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        className="glass-btn"
        style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer' }}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Importing…' : 'Upload Report'}
      </button>
      {error && <span className={styles.importError}>{error}</span>}
    </div>
  );
}
