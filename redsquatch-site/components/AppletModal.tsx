'use client';

import { X } from 'lucide-react';

interface AppletModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  // 'tonatiuh' = the /ws dark-glass look. Default keeps the original copper-on-black
  // modal, which /hs/mexican and /hs/health still use.
  tone?: 'default' | 'tonatiuh';
}

export default function AppletModal({ isOpen, title, onClose, children, wide, tone = 'default' }: AppletModalProps) {
  if (!isOpen) return null;

  const t = tone === 'tonatiuh'
    ? {
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(22,30,40,0.97)',
        shadow: '0 8px 40px rgba(0,0,0,0.6)',
        divider: '1px solid rgba(255,255,255,0.08)',
        title: '#E2E8F0',
        close: '#93A4B8',
        font: "'Cabinet Grotesk', sans-serif",
      }
    : {
        border: '1px solid rgba(184,115,51,0.4)',
        background: 'rgba(10,8,6,0.95)',
        shadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(184,115,51,0.15)',
        divider: '1px solid rgba(184,115,51,0.25)',
        title: '#d4a373',
        close: '#d4a373',
        font: undefined,
      };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`rounded-2xl w-full ${wide ? 'max-w-6xl' : 'max-w-4xl'} max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden`}
          style={{
            border: t.border,
            background: t.background,
            boxShadow: t.shadow,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="flex justify-between items-center px-6 py-4 flex-shrink-0"
            style={{ borderBottom: t.divider }}
          >
            <h2 className="text-xl font-bold" style={{ color: t.title, fontFamily: t.font }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors ${tone === 'tonatiuh' ? 'hover:bg-white/10' : 'hover:bg-copper/10'}`}
              title="Close"
              aria-label="Close"
              style={{ color: t.close }}
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
