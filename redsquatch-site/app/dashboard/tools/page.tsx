'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import TipTapEditor from '@/components/TipTapEditor';
import GamesModal from '@/components/GamesModal';
import RconSection from '@/components/RconSection';
import { WorldsPanel } from '@/components/WorldsPanel';
import { ExternalLink, Zap } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

const iconMap: Record<string, React.ReactNode> = {
  notebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-2h2v-2h-2v2zm0-4h2V7h-2v6z"/>
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 5.23 11.08 5 12 5c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45c.9-.86 1.48-2.04 1.48-3.36.01-2.59-2.24-4.71-5.07-4.59z"/>
    </svg>
  ),
  'file-pdf': (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
      <text x="12" y="18" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">PDF</text>
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M19 2H5c-1.1 0-2 .9-2 2v18l7-3 7 3V4c0-1.1-.9-2-2-2z"/>
    </svg>
  ),
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch(`${API}/api/client/tools`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch tools');
        }

        const data = await res.json();
        setTools(data.tools);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Tools fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#b87333' }}>Loading tools...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      {/* Header */}
      <div className="glass-surface rounded-2xl px-6 py-4 w-full max-w-5xl">
        <h1 className="text-3xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Tools & Services
        </h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Quick access to your internal services. Each opens in a new window.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group cursor-pointer transition-all duration-300"
            >
              <div
                className="glass-surface rounded-xl p-3 h-full flex flex-col gap-2 border border-transparent"
                style={{
                  borderColor: 'rgba(184,115,51,0.22)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '#b87333';
                  el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(184,115,51,0.22)';
                  el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon & Name Header */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: tool.color + '22' }}
                  >
                    <div style={{ color: tool.color }}>
                      {iconMap[tool.icon] || <Zap size={24} />}
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    style={{ color: '#d4a373' }}
                  />
                </div>

                {/* Name & Description */}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm" style={{ color: '#d4a373' }}>
                    {tool.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {tool.description}
                  </p>
                </div>

                {/* Hover Indicator */}
                <div
                  className="h-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  style={{ background: `linear-gradient(to right, transparent, ${tool.color}, transparent)` }}
                />
              </div>
            </a>
          ))}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: '#d4a373' }}>No tools available</p>
          </div>
        )}
      </div>

      {/* Quick Notes Section */}
      <div className="mt-8 max-w-5xl w-full">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Quick Notes
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Rich-text editor for quick notes and thoughts
          </p>
        </div>
        <TipTapEditor
          placeholder="Write your notes here... Use formatting buttons for bold, italic, headings, lists, and links."
          height="400px"
        />
      </div>

      {/* Minecraft Server Control */}
      <div className="mt-12 max-w-5xl w-full">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Minecraft Server Control
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Manage the Minecraft Bedrock server: whitelist, give items, teleport, and control
          </p>
        </div>
        <RconSection />
      </div>

      {/* Minecraft World Management */}
      <div className="mt-12 max-w-5xl w-full mb-8">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Minecraft World Management
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Manage 3 world slots with automatic backup and restore
          </p>
        </div>
        <WorldsPanel />
      </div>

      <GamesModal isOpen={gamesOpen} onClose={() => setGamesOpen(false)} />
    </div>
  );
}
