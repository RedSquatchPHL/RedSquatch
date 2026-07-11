'use client';

import { useRef, useState } from 'react';
import { API } from '@/lib/api';
import styles from '@/styles/work.module.css';

export default function WorkItemImportButton({
  onImported,
}: {
  onImported: (result: { imported: number; duplicates: number }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const content = await file.text();
      const res = await fetch(`${API}/api/client/work-items/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();
      onImported(data);
    } catch (err) {
      setError('Import failed. Check the file format and try again.');
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
        accept=".md,.markdown,text/markdown,text/plain"
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
        {busy ? 'Importing…' : 'Import Markdown'}
      </button>
      {error && <span className={styles.importError}>{error}</span>}
    </div>
  );
}
