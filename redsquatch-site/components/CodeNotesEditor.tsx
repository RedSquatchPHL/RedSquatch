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
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/themes/prism-tomorrow.css';
import { Copy, Check } from 'lucide-react';
import { API } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
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
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface CodeNotesEditorProps {
  height?: string;
}

export default function CodeNotesEditor({ height = '400px' }: CodeNotesEditorProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/quick-notes`, { credentials: 'include' });
        const data = await res.json();
        if (data?.note) {
          setCode(data.note.content ?? '');
          setLanguage(data.note.language || 'javascript');
        }
      } catch {
        // no saved note yet - start blank
      } finally {
        hydrated.current = true;
        setLoading(false);
      }
    })();
  }, []);

  const save = (nextCode: string, nextLanguage: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/client/quick-notes`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: nextCode, language: nextLanguage }),
        });
        if (!res.ok) throw new Error('save failed');
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 800);
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (hydrated.current) save(value, language);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    if (hydrated.current) save(code, value);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const highlight = (value: string) =>
    Prism.highlight(value, Prism.languages[language] || Prism.languages.javascript, language);

  return (
    <div
      className="glass-surface rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(184,115,51,0.25)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 p-3 border-b"
        style={{ borderColor: 'rgba(184,115,51,0.15)' }}
      >
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved'}
          {status === 'error' && 'Save failed'}
        </span>

        <button
          onClick={handleCopy}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Copy code"
          style={{ color: '#d4a373' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Editor */}
      <div className="overflow-auto" style={{ height, background: '#1a1a1a' }}>
        {!loading && (
          <Editor
            value={code}
            onValueChange={handleCodeChange}
            highlight={highlight}
            padding={16}
            placeholder="// Write your code notes here..."
            textareaId="code-notes-editor"
            style={{
              fontFamily: 'ui-monospace, "Courier New", monospace',
              fontSize: 13,
              minHeight: '100%',
            }}
          />
        )}
      </div>
    </div>
  );
}
