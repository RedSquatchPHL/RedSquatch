'use client';
import { RconPanel } from './RconPanel';
import { X } from 'lucide-react';

interface RconModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RconModal({ isOpen, onClose }: RconModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-surface rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative"
        style={{
          border: '1px solid rgba(184,115,51,0.3)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:opacity-70 transition-opacity"
          style={{ color: '#d4a373' }}
        >
          <X size={20} />
        </button>

        <RconPanel />
      </div>
    </div>
  );
}
