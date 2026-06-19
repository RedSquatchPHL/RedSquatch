'use client';

import { useState } from 'react';
import { Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Link } from 'lucide-react';

interface TipTapEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  height?: string;
}

export default function TipTapEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  height = '300px',
}: TipTapEditorProps) {
  const [content, setContent] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    onChange?.(newContent);
  };

  const applyFormat = (format: string) => {
    const textarea = document.getElementById('tiptap-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'text';
    let replacement = '';

    switch (format) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `_${selectedText}_`;
        break;
      case 'underline':
        replacement = `<u>${selectedText}</u>`;
        break;
      case 'h1':
        replacement = `# ${selectedText}`;
        break;
      case 'h2':
        replacement = `## ${selectedText}`;
        break;
      case 'ul':
        replacement = `\n• ${selectedText}\n`;
        break;
      case 'ol':
        replacement = `\n1. ${selectedText}\n`;
        break;
      case 'link':
        replacement = `[${selectedText}](url)`;
        break;
      default:
        return;
    }

    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    handleChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  return (
    <div
      className="glass-surface rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        border: '1px solid rgba(184,115,51,0.25)',
        height: isExpanded ? '90vh' : height,
      }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 p-3 border-b"
        style={{ borderColor: 'rgba(184,115,51,0.15)' }}
      >
        <button
          onClick={() => applyFormat('bold')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Bold"
          style={{ color: '#d4a373' }}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => applyFormat('italic')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Italic"
          style={{ color: '#d4a373' }}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => applyFormat('underline')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Underline"
          style={{ color: '#d4a373' }}
        >
          <Underline size={16} />
        </button>

        <div
          className="w-px h-6"
          style={{ background: 'rgba(184,115,51,0.2)' }}
        />

        <button
          onClick={() => applyFormat('h1')}
          className="p-2 rounded hover:bg-copper/10 transition-colors text-xs font-bold"
          title="Heading 1"
          style={{ color: '#d4a373' }}
        >
          H1
        </button>
        <button
          onClick={() => applyFormat('h2')}
          className="p-2 rounded hover:bg-copper/10 transition-colors text-xs font-bold"
          title="Heading 2"
          style={{ color: '#d4a373' }}
        >
          H2
        </button>

        <div
          className="w-px h-6"
          style={{ background: 'rgba(184,115,51,0.2)' }}
        />

        <button
          onClick={() => applyFormat('ul')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Bullet List"
          style={{ color: '#d4a373' }}
        >
          <List size={16} />
        </button>
        <button
          onClick={() => applyFormat('ol')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Ordered List"
          style={{ color: '#d4a373' }}
        >
          <ListOrdered size={16} />
        </button>

        <div
          className="w-px h-6"
          style={{ background: 'rgba(184,115,51,0.2)' }}
        />

        <button
          onClick={() => applyFormat('link')}
          className="p-2 rounded hover:bg-copper/10 transition-colors"
          title="Link"
          style={{ color: '#d4a373' }}
        >
          <Link size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded hover:bg-copper/10 transition-colors text-xs font-medium"
          title={isExpanded ? 'Collapse' : 'Expand'}
          style={{ color: '#d4a373' }}
        >
          {isExpanded ? '↙' : '↗'}
        </button>
      </div>

      {/* Editor */}
      <textarea
        id="tiptap-editor"
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full p-4 resize-none focus:outline-none text-sm"
        style={{
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'ui-monospace, "Courier New", monospace',
          height: isExpanded ? 'calc(90vh - 56px)' : `calc(${height} - 56px)`,
        }}
      />
    </div>
  );
}
