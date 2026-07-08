'use client';

import { X } from 'lucide-react';

interface AppletModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AppletModal({ isOpen, title, onClose, children }: AppletModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden"
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
              {title}
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

          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
