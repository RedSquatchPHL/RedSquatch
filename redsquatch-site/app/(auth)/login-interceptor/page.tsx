'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginInterceptor() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'work' | 'home' | null>(null);

  const handleModeSelect = (mode: 'work' | 'home') => {
    setSelectedMode(mode);

    // Route based on selection
    setTimeout(() => {
      router.push(mode === 'work' ? '/ws/dashboard' : '/hs/dashboard');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      {/* Background grid effect (subtle) */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(184,115,51,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(184,115,51,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-playfair text-[#d4a373] mb-2">
            RedSquatch
          </h1>
          <p className="text-[#b87333] text-sm tracking-widest uppercase">
            Command Center
          </p>
        </div>

        {/* Two-column selector */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* WorkSquatch */}
          <button
            onClick={() => handleModeSelect('work')}
            className={`group relative p-8 rounded-lg transition-all duration-300 cursor-pointer ${
              selectedMode === 'work'
                ? 'scale-105 border-[#b87333] bg-[rgba(184,115,51,0.1)]'
                : 'border-[rgba(184,115,51,0.2)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(184,115,51,0.4)] hover:bg-[rgba(255,255,255,0.05)]'
            } border`}
          >
            <div className="text-left">
              <h2 className="text-4xl font-playfair text-[#b87333] mb-1">
                WorkSquatch
              </h2>
              <p className="text-xs text-[#d4a373] tracking-widest">
                by RedSquatch
              </p>

              {selectedMode === 'work' && (
                <div className="mt-4 text-xs text-[#d4a373] animate-pulse">
                  → Entering...
                </div>
              )}
            </div>
          </button>

          {/* HomeSquatch */}
          <button
            onClick={() => handleModeSelect('home')}
            className={`group relative p-8 rounded-lg transition-all duration-300 cursor-pointer ${
              selectedMode === 'home'
                ? 'scale-105 border-[#b87333] bg-[rgba(184,115,51,0.1)]'
                : 'border-[rgba(184,115,51,0.2)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(184,115,51,0.4)] hover:bg-[rgba(255,255,255,0.05)]'
            } border`}
          >
            <div className="text-right">
              <h2 className="text-4xl font-playfair text-[#b87333] mb-1">
                HomeSquatch
              </h2>
              <p className="text-xs text-[#d4a373] tracking-widest">
                by RedSquatch
              </p>

              {selectedMode === 'home' && (
                <div className="mt-4 text-xs text-[#d4a373] animate-pulse">
                  → Entering...
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="text-center text-xs text-slate-600">
          <p>Select a mode to continue.</p>
        </div>
      </div>
    </div>
  );
}
