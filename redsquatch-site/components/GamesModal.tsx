'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Wordle from './Wordle';
import TwentyFortyEight from './TwentyFortyEight';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GamesModal({ isOpen, onClose }: GamesModalProps) {
  const [activeGame, setActiveGame] = useState<'wordle' | '2048' | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="glass-surface rounded-2xl p-8 max-w-2xl w-full pointer-events-auto overflow-y-auto max-h-[90vh]"
          style={{
            border: '1px solid rgba(184,115,51,0.4)',
            background: 'rgba(15,12,8,0.85)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#d4a373' }}>
              Games
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-copper/10 rounded transition-colors"
              title="Close"
              style={{ color: '#d4a373' }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Game Selection */}
          {!activeGame && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveGame('wordle')}
                className="p-6 rounded-xl border-2 transition-all duration-300 text-center"
                style={{
                  borderColor: 'rgba(184,115,51,0.3)',
                  color: '#d4a373',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#b87333';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(184,115,51,0.1)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,115,51,0.3)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div className="text-4xl mb-2">📝</div>
                <h3 className="font-semibold">Wordle</h3>
                <p className="text-xs mt-2" style={{ color: 'rgba(212,163,115,0.7)' }}>
                  Guess the word in 6 tries
                </p>
              </button>

              <button
                onClick={() => setActiveGame('2048')}
                className="p-6 rounded-xl border-2 transition-all duration-300 text-center"
                style={{
                  borderColor: 'rgba(184,115,51,0.3)',
                  color: '#d4a373',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#b87333';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(184,115,51,0.1)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,115,51,0.3)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div className="text-4xl mb-2">🎮</div>
                <h3 className="font-semibold">2048</h3>
                <p className="text-xs mt-2" style={{ color: 'rgba(212,163,115,0.7)' }}>
                  Slide tiles to reach 2048
                </p>
              </button>
            </div>
          )}

          {/* Wordle Game */}
          {activeGame === 'wordle' && (
            <div>
              <Wordle onBack={() => setActiveGame(null)} />
            </div>
          )}

          {/* 2048 Game */}
          {activeGame === '2048' && (
            <div>
              <TwentyFortyEight onBack={() => setActiveGame(null)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
