'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { API } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Game {
  date: string;
  dateTime: string;
  opponent: string;
  opponentAbbr: string;
  isHome: boolean;
  score?: string | null;
  result?: 'W' | 'L' | '?';
  time?: string;
}

interface NewsItem { title: string; url: string; date: string | null; }

interface TeamData {
  key: string;
  name: string;
  abbreviation: string;
  sport: string;
  logo: string;
  color: string | null;
  record: string | null;
  lastGame: Game | null;
  nextGame: Game | null;
  recentGames: Game[];
  upcomingGames: Game[];
  news: NewsItem[];
  error?: string;
}

interface SportsData {
  updated: string;
  teams: Record<string, TeamData>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEAM_ORDER = ['LAD', 'LAL', 'LAK', 'SF'];

const SPORT_BADGE: Record<string, string> = {
  MLB: 'bg-blue-900/40 text-blue-300',
  NBA: 'bg-purple-900/40 text-purple-300',
  NHL: 'bg-slate-700/60 text-slate-300',
  NFL: 'bg-red-900/40 text-red-300',
};

function relDate(dateStr: string): string {
  if (!dateStr) return '';
  const d    = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days === 0)  return 'Today';
  if (days === 1)  return 'Yesterday';
  if (days <= 6)   return `${days}d ago`;
  if (days <= 13)  return '1 week ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function upcomingRelDate(dateStr: string): string {
  if (!dateStr) return '';
  const d    = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 6)  return `in ${days} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function countdown(dateTimeISO: string, now: Date): string {
  const diff = new Date(dateTimeISO).getTime() - now.getTime();
  if (diff <= 0) return 'Live / Starting soon';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 47) return `in ${Math.floor(h / 24)}d`;
  if (h > 0)  return `in ${h}h ${m}m`;
  return `in ${m}m ${s}s`;
}

function isCountdownWorthy(dateTimeISO: string): boolean {
  const diff = new Date(dateTimeISO).getTime() - Date.now();
  return diff > 0 && diff < 48 * 3600000;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// ─── TeamWidget ───────────────────────────────────────────────────────────────

function TeamWidget({ team, now, updated }: { team: TeamData; now: Date; updated: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const color = team.color ?? '#b87333';

  const resultBadge = (r: string | undefined) =>
    r === 'W'
      ? 'bg-green-900/50 text-green-400 border-green-700/50'
      : r === 'L'
      ? 'bg-red-900/50 text-red-400 border-red-700/50'
      : 'bg-muted/50 text-muted-foreground border-primary/20';

  return (
    <div
      className="glass-surface rounded-xl overflow-hidden flex flex-col"
      style={{ borderColor: `${color}40` }}
    >
      {/* Team header bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${color}22 0%, transparent 70%)` }}
      >
        {team.logo && (
          <img
            src={team.logo}
            alt={team.name}
            className="w-10 h-10 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base leading-tight" style={{ color: 'hsl(var(--secondary))' }}>
              {team.name}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${SPORT_BADGE[team.sport] ?? ''}`}>
              {team.sport}
            </span>
          </div>
          {team.record && (
            <p className="text-sm font-mono" style={{ color }}>
              {team.record}
            </p>
          )}
        </div>
      </div>

      {/* Last + Next game */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {/* Last game */}
        {team.lastGame ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs w-10 shrink-0">Last</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold ${resultBadge(team.lastGame.result)}`}>
              {team.lastGame.result}
            </span>
            <span className="text-foreground">
              {team.lastGame.isHome ? 'vs' : '@'} {team.lastGame.opponentAbbr}
            </span>
            {team.lastGame.score && (
              <span className="text-muted-foreground font-mono text-xs">{team.lastGame.score}</span>
            )}
            <span className="text-muted-foreground text-xs ml-auto shrink-0">
              {relDate(team.lastGame.date)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No recent games</p>
        )}

        {/* Next game */}
        {team.nextGame ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs w-10 shrink-0">Next</span>
            <span className="text-foreground">
              {team.nextGame.isHome ? 'vs' : '@'} {team.nextGame.opponentAbbr}
            </span>
            <span className="text-muted-foreground text-xs">
              {team.nextGame.time ?? upcomingRelDate(team.nextGame.date)}
            </span>
            {/* Live countdown if within 48h */}
            {isCountdownWorthy(team.nextGame.dateTime) && (
              <span
                className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {countdown(team.nextGame.dateTime, now)}
              </span>
            )}
            {!isCountdownWorthy(team.nextGame.dateTime) && (
              <span className="text-muted-foreground text-xs ml-auto">
                {upcomingRelDate(team.nextGame.date)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No upcoming games scheduled</p>
        )}
      </div>

      {/* View More button + timestamp */}
      <div className="px-4 pb-3 space-y-2">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-xs py-1.5 rounded border transition-colors"
          style={{
            borderColor: `${color}50`,
            color: expanded ? '#0f0f0f' : color,
            backgroundColor: expanded ? color : 'transparent',
          }}
        >
          {expanded ? 'Show Less ▲' : 'View More ▼'}
        </button>
        {updated && (
          <p className="text-[10px] text-muted-foreground/50 text-right">
            Last updated{' '}
            {new Date(updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' · '}
            {new Date(updated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-5" style={{ borderColor: `${color}30` }}>
          {/* Recent games */}
          {team.recentGames.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Last {team.recentGames.length} Games
              </h4>
              <div className="space-y-1.5">
                {team.recentGames.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20 shrink-0">{fmtDate(g.date)}</span>
                    <span className={`px-1.5 py-0.5 rounded border font-bold text-[10px] ${resultBadge(g.result)}`}>
                      {g.result}
                    </span>
                    <span className="text-foreground">
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </span>
                    {g.score && (
                      <span className="ml-auto text-muted-foreground font-mono">{g.score}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming schedule */}
          {team.upcomingGames.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Next {Math.min(team.upcomingGames.length, 7)} Games
              </h4>
              <div className="space-y-1.5">
                {team.upcomingGames.slice(0, 7).map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20 shrink-0">{fmtDate(g.date)}</span>
                    <span className="text-foreground">
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </span>
                    <span className="ml-auto text-muted-foreground">{g.time ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News */}
          {team.news.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Recent News
              </h4>
              <div className="space-y-2">
                {team.news.map((n, i) => (
                  <a
                    key={i}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs hover:underline leading-snug"
                    style={{ color }}
                  >
                    {n.title}
                    {n.date && (
                      <span className="text-muted-foreground ml-1.5 not-italic font-normal">
                        · {relDate(n.date)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SportsPage() {
  const [data, setData]       = useState<SportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [now, setNow]         = useState(new Date());
  // module-level cache to avoid re-fetching when switching nav tabs
  const cacheRef = useRef<{ ts: number; data: SportsData } | null>(null);

  // Live clock for countdown timers (updates every 10s — fine granularity for hours/days)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const fetchSports = useCallback(async (force = false) => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 min client-side cache
    if (!force && cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setData(cacheRef.current.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/sports`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: SportsData = await res.json();
      cacheRef.current = { ts: Date.now(), data: d };
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSports(); }, [fetchSports]);

  const teams = data
    ? TEAM_ORDER.map(k => data.teams[k]).filter(Boolean)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="glass-surface rounded-2xl px-6 py-4">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Sports Hub
        </h1>
      </div>

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-surface rounded-xl h-36 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Team grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map(team => (
            <TeamWidget key={team.key} team={team} now={now} updated={data?.updated ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
