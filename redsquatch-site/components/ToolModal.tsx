'use client';

import { X } from 'lucide-react';
import type { ToolName } from '@/hooks/useToolModal';

interface ToolModalProps {
  isOpen: boolean;
  tool: ToolName | null;
  onClose: () => void;
}

const TOOL_CONFIG: Record<ToolName, { label: string; url: string }> = {
  grampsweb: { label: 'Grampsweb', url: 'https://gramps.redsquatch.com' },
  stirling: { label: 'Stirling-PDF', url: 'https://pdf.redsquatch.com' },
};

export default function ToolModal({ isOpen, tool, onClose }: ToolModalProps) {
  if (!isOpen || !tool) return null;

  const { label, url } = TOOL_CONFIG[tool];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col pointer-events-auto overflow-hidden"
          style={{
            border: '1px solid rgba(184,115,51,0.4)',
            background: 'rgba(10,8,6,0.95)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(184,115,51,0.15)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="flex justify-between items-center px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(184,115,51,0.25)' }}
          >
            <h2 className="text-xl font-bold" style={{ color: '#d4a373' }}>
              {label}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-copper/10 rounded transition-colors"
              title="Close"
              style={{ color: '#d4a373' }}
            >
              <X size={22} />
            </button>
          </div>

          <iframe
            src={url}
            title={label}
            className="flex-1 w-full"
            style={{ border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </>
  );
}
