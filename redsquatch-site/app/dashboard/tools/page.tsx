'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import TipTapEditor from '@/components/TipTapEditor';
import GamesModal from '@/components/GamesModal';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

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
      <div className="glass-surface rounded-2xl px-6 py-4 w-full max-w-4xl">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Tools
        </h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Quick access to your internal services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-4xl">
        {tools.map((tool) => (
          <a
            key={tool.id}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group cursor-pointer"
          >
            <div
              className="glass-surface relative h-40 rounded-xl overflow-hidden transition-all duration-300"
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#b87333';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(184,115,51,0.22)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
              }}
            >
              <div className="relative h-full p-4 flex flex-col justify-between z-10">
                <div>
                  <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
                    {tool.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1 transition-colors duration-300 group-hover:text-[#b87333]">
                    {tool.name}
                  </h2>
                </div>

                <div className="flex items-end justify-between">
                  <p className="text-xs flex-1" style={{ color: '#d4a373' }}>
                    {tool.description}
                  </p>
                  <span
                    className="text-xl ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{ color: '#b87333' }}
                  >
                    →
                  </span>
                </div>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
              />
            </div>
          </a>
        ))}

        {/* Joplin Link */}
        <a
          href="https://joplin.redsquatch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group cursor-pointer"
        >
          <div
            className="glass-surface relative h-40 rounded-xl overflow-hidden transition-all duration-300"
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#b87333';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(184,115,51,0.22)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
          >
            <div className="relative h-full p-4 flex flex-col justify-between z-10">
              <div>
                <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
                  📝
                </div>
                <h2 className="text-lg font-semibold text-white mb-1 transition-colors duration-300 group-hover:text-[#b87333]">
                  Joplin
                </h2>
              </div>

              <div className="flex items-end justify-between">
                <p className="text-xs flex-1" style={{ color: '#d4a373' }}>
                  Notes & tasks
                </p>
                <span
                  className="text-xl ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ color: '#b87333' }}
                >
                  →
                </span>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
            />
          </div>
        </a>

        {/* Focus Button */}
        <button
          onClick={() => setGamesOpen(true)}
          className="group cursor-pointer"
        >
          <div
            className="glass-surface relative h-40 rounded-xl overflow-hidden transition-all duration-300"
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#b87333';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(184,115,51,0.22)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
          >
            <div className="relative h-full p-4 flex flex-col justify-between z-10">
              <div>
                <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
                  🎯
                </div>
                <h2 className="text-lg font-semibold text-white mb-1 transition-colors duration-300 group-hover:text-[#b87333]">
                  Focus
                </h2>
              </div>

              <div className="flex items-end justify-between">
                <p className="text-xs flex-1" style={{ color: '#d4a373' }}>
                  Mind games
                </p>
                <span
                  className="text-xl ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ color: '#b87333' }}
                >
                  →
                </span>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
            />
          </div>
        </button>
      </div>

      {tools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: '#d4a373' }}>No tools available</p>
        </div>
      )}

      <div className="mt-6 max-w-4xl w-full mb-8">
        <p className="text-xs text-center" style={{ color: '#d4a373' }}>
          Each tool opens in a new window. Services are managed independently and may require separate login.
        </p>
      </div>

      <div className="mt-12 max-w-4xl w-full">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-6">
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

      <GamesModal isOpen={gamesOpen} onClose={() => setGamesOpen(false)} />
    </div>
  );
}
