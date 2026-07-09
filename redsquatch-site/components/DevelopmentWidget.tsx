'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css';
import { Plus, X, Copy, Trash2, Check, Pencil } from 'lucide-react';
import { API } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'css', label: 'CSS' },
  { value: 'markup', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface NoteTab {
  id: number;
  title: string;
  language: string;
  content: string;
  dirty: boolean;
  status: SaveStatus;
  lastSavedAt: Date | null;
}

const highlight = (value: string, language: string) => {
  const grammar = Prism.languages[language] || Prism.languages.plaintext || Prism.languages.markup;
  return Prism.highlight(value, grammar, language);
};

const timeLabel = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');

export default function DevelopmentWidget() {
  const [tabs, setTabs] = useState<NoteTab[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/notes`, { credentials: 'include' });
        const data = await res.json();
        let loaded: NoteTab[] = (data?.notes || []).map((n: any) => ({
          id: n.id,
          title: n.title || 'Untitled',
          language: n.language || 'plaintext',
          content: n.content ?? '',
          dirty: false,
          status: 'idle' as SaveStatus,
          lastSavedAt: null,
        }));

        if (loaded.length === 0) {
          const created = await fetch(`${API}/api/client/notes`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Untitled', content: '', language: 'plaintext' }),
          }).then((r) => r.json());
          if (created?.note) {
            loaded = [{
              id: created.note.id,
              title: created.note.title || 'Untitled',
              language: created.note.language || 'plaintext',
              content: created.note.content ?? '',
              dirty: false,
              status: 'idle',
              lastSavedAt: null,
            }];
          }
        }

        setTabs(loaded);
        setActiveId(loaded[0]?.id ?? null);
      } catch {
        // start with nothing; user can still hit + New Tab once loading clears
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId) || null;

  const persist = (id: number, patch: { title?: string; content?: string; language?: string }) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'saving' } : t)));
    saveTimers.current[id] = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/client/notes/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('save failed');
        setTabs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, dirty: false, status: 'saved', lastSavedAt: new Date() } : t))
        );
      } catch {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'error' } : t)));
      }
    }, 800);
  };

  const updateActive = (patch: { title?: string; content?: string; language?: string }) => {
    if (!activeTab) return;
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, ...patch, dirty: true } : t)));
    persist(activeTab.id, patch);
  };

  const newTab = async () => {
    try {
      const res = await fetch(`${API}/api/client/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: '', language: 'plaintext' }),
      });
      const data = await res.json();
      if (data?.note) {
        const tab: NoteTab = {
          id: data.note.id,
          title: data.note.title || 'Untitled',
          language: data.note.language || 'plaintext',
          content: data.note.content ?? '',
          dirty: false,
          status: 'idle',
          lastSavedAt: null,
        };
        setTabs((prev) => [...prev, tab]);
        setActiveId(tab.id);
      }
    } catch {
      // ignore — user can retry
    }
  };

  const duplicateActive = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}/api/client/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${activeTab.title} copy`,
          content: activeTab.content,
          language: activeTab.language,
        }),
      });
      const data = await res.json();
      if (data?.note) {
        const tab: NoteTab = {
          id: data.note.id,
          title: data.note.title || 'Untitled',
          language: data.note.language || 'plaintext',
          content: data.note.content ?? '',
          dirty: false,
          status: 'idle',
          lastSavedAt: null,
        };
        setTabs((prev) => [...prev, tab]);
        setActiveId(tab.id);
      }
    } catch {
      // ignore
    }
  };

  const closeTab = (id: number) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) {
        const fallback = next[idx] || next[idx - 1] || next[0];
        setActiveId(fallback ? fallback.id : null);
      }
      return next;
    });
  };

  const deleteTab = async (id: number) => {
    if (!window.confirm('Delete this note permanently? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api/client/notes/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch {
      // fall through to local removal regardless
    }
    closeTab(id);
  };

  const commitRename = (id: number) => {
    const title = renameValue.trim() || 'Untitled';
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title, dirty: true } : t)));
    persist(id, { title });
    setRenamingId(null);
  };

  useEffect(() => {
    if (tabs.length === 0 && !loading) {
      newTab();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, loading]);

  return (
    <div
      className="glass-surface rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid rgba(184,115,51,0.25)' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-2 pt-2 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(184,115,51,0.15)' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors flex-shrink-0"
              style={{
                background: isActive ? 'rgba(184,115,51,0.12)' : 'rgba(255,255,255,0.02)',
                borderTop: `1px solid ${isActive ? '#b87333' : 'rgba(184,115,51,0.15)'}`,
                borderLeft: `1px solid ${isActive ? 'rgba(184,115,51,0.4)' : 'transparent'}`,
                borderRight: `1px solid ${isActive ? 'rgba(184,115,51,0.4)' : 'transparent'}`,
              }}
            >
              {renamingId === tab.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(tab.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="glass-input text-xs px-1 py-0.5 rounded w-24"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(tab.id);
                    setRenameValue(tab.title);
                  }}
                  className="text-xs whitespace-nowrap"
                  style={{ color: isActive ? '#d4a373' : 'rgba(255,255,255,0.5)' }}
                  title="Double-click to rename"
                >
                  {tab.title}
                </span>
              )}
              {tab.dirty && <span style={{ color: '#b87333' }} title="Unsaved changes">•</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-50 hover:opacity-100 transition-opacity"
                title="Close tab"
              >
                <X size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>
          );
        })}
        <button
          onClick={newTab}
          className="flex items-center justify-center p-1.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
          title="New tab"
        >
          <Plus size={16} style={{ color: '#d4a373' }} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Loading…
        </div>
      ) : activeTab ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-3" style={{ borderBottom: '1px solid rgba(184,115,51,0.15)' }}>
            <Select value={activeTab.language} onValueChange={(value) => updateActive({ language: value })}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <button
              onClick={() => {
                setRenamingId(activeTab.id);
                setRenameValue(activeTab.title);
              }}
              className="p-2 rounded hover:bg-white/5 transition-colors"
              title="Rename tab"
            >
              <Pencil size={14} style={{ color: '#d4a373' }} />
            </button>
            <button
              onClick={duplicateActive}
              className="p-2 rounded hover:bg-white/5 transition-colors"
              title="Duplicate tab"
            >
              <Copy size={14} style={{ color: '#d4a373' }} />
            </button>
            <button
              onClick={() => deleteTab(activeTab.id)}
              className="p-2 rounded hover:bg-white/5 transition-colors"
              title="Delete note"
            >
              <Trash2 size={14} style={{ color: '#b87333' }} />
            </button>
          </div>

          {/* Editor */}
          <div className="overflow-auto" style={{ height: '440px', background: '#1a1a1a' }}>
            <Editor
              value={activeTab.content}
              onValueChange={(value) => updateActive({ content: value })}
              highlight={(value) => highlight(value, activeTab.language)}
              padding={16}
              placeholder="// Write your code or notes here..."
              textareaId={`dev-widget-editor-${activeTab.id}`}
              style={{
                fontFamily: 'ui-monospace, "Courier New", monospace',
                fontSize: 13,
                minHeight: '100%',
              }}
            />
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs"
            style={{ borderTop: '1px solid rgba(184,115,51,0.15)', color: 'rgba(255,255,255,0.35)' }}
          >
            {activeTab.status === 'saving' && <span>Saving…</span>}
            {activeTab.status === 'saved' && (
              <span className="flex items-center gap-1">
                <Check size={12} /> Saved at {timeLabel(activeTab.lastSavedAt)}
              </span>
            )}
            {activeTab.status === 'error' && <span style={{ color: '#e07856' }}>Save failed</span>}
            {activeTab.status === 'idle' && !activeTab.dirty && <span>No changes yet</span>}
            {activeTab.dirty && activeTab.status !== 'saving' && <span>Unsaved changes</span>}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No tabs open.
        </div>
      )}
    </div>
  );
}
