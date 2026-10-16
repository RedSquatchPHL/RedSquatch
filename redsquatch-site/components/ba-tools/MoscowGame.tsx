'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Flame, Trophy } from 'lucide-react';
import { API } from '@/lib/api';
import { MOSCOW_ROUNDS, MOSCOW_CATEGORY_LABELS, type MoscowCategory } from '@/lib/ba-content';

interface Progress {
  score: number;
  current_streak: number;
  best_streak: number;
  rounds_played: number;
}

const CATEGORIES: MoscowCategory[] = ['must', 'should', 'could', 'wont'];

// Content is always authored Must/Should/Could/Won't in that fixed order —
// shuffle for display so the round can't be solved by position alone.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MoscowGame() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, MoscowCategory>>({});
  const [submitted, setSubmitted] = useState(false);

  const round = MOSCOW_ROUNDS[roundIndex % MOSCOW_ROUNDS.length];
  const items = useMemo(() => shuffle(round.items), [round.id]);
  const allPicked = items.every(item => picks[item.id]);
  const allCorrect = submitted && items.every(item => picks[item.id] === item.category);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/ba-tools/moscow-prioritization`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        setProgress(await res.json());
      } catch {
        setError('Could not load your saved progress — check your connection.');
      }
    })();
  }, []);

  function choose(itemId: string, category: MoscowCategory) {
    if (submitted) return;
    setPicks(prev => ({ ...prev, [itemId]: category }));
  }

  async function submit() {
    if (!allPicked || submitted) return;
    const correct = round.items.every(item => picks[item.id] === item.category);
    setSubmitted(true);
    try {
      const res = await fetch(`${API}/api/client/ba-tools/moscow-prioritization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ correct }),
      });
      if (!res.ok) throw new Error('update failed');
      setProgress(await res.json());
    } catch {
      setError('Could not save that round — check your connection.');
    }
  }

  function nextRound() {
    setPicks({});
    setSubmitted(false);
    setRoundIndex(i => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs" style={{ color: '#93A4B8' }}>
          Classify every item, then submit — the round only scores as correct if all four match.
        </span>
        {progress && (
          <div className="flex items-center gap-4 text-xs" style={{ color: '#E8935A' }}>
            <span className="flex items-center gap-1"><Trophy size={13} /> {progress.score} pts</span>
            <span className="flex items-center gap-1"><Flame size={13} /> streak {progress.current_streak}</span>
            <span style={{ color: '#93A4B8' }}>best {progress.best_streak}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs px-3 py-2" style={{ background: 'rgba(200,60,60,0.12)', color: '#F0708F' }}>
          {error}
        </div>
      )}

      <div
        className="text-sm p-3"
        style={{ background: 'rgba(217,122,56,0.08)', border: '1px solid rgba(217,122,56,0.25)', color: '#E8935A' }}
      >
        {round.context}
      </div>

      <div className="flex flex-col gap-3">
        {items.map(item => {
          const picked = picks[item.id];
          const isCorrect = submitted && picked === item.category;
          const isWrong = submitted && picked !== undefined && picked !== item.category;

          return (
            <div
              key={item.id}
              className="p-3"
              style={{
                border: '1px solid ' + (isCorrect ? 'rgba(76,175,80,0.5)' : isWrong ? 'rgba(220,80,80,0.5)' : 'rgba(217,122,56,0.25)'),
                background: isCorrect ? 'rgba(76,175,80,0.1)' : isWrong ? 'rgba(220,80,80,0.1)' : 'rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-start gap-2">
                {submitted && (isCorrect
                  ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#5FBF8F' }} />
                  : isWrong
                    ? <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#F0708F' }} />
                    : <span className="w-4" />)}
                <span className="text-sm" style={{ color: '#E2E8F0' }}>{item.text}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                {CATEGORIES.map(cat => {
                  const isSelected = picked === cat;
                  const isTheAnswer = submitted && cat === item.category;
                  return (
                    <button
                      key={cat}
                      onClick={() => choose(item.id, cat)}
                      disabled={submitted}
                      className="text-xs px-2.5 py-1 transition-colors disabled:cursor-default"
                      style={{
                        border: '1px solid ' + (isTheAnswer ? 'rgba(76,175,80,0.6)' : isSelected ? 'rgba(217,122,56,0.6)' : 'rgba(44,36,32,0.15)'),
                        background: isTheAnswer ? 'rgba(76,175,80,0.15)' : isSelected ? 'rgba(217,122,56,0.18)' : 'transparent',
                        color: isTheAnswer ? '#5FBF8F' : isSelected ? '#E8935A' : '#93A4B8',
                      }}
                    >
                      {MOSCOW_CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-2 pl-6 text-xs" style={{ color: isCorrect ? '#5FBF8F' : '#F0708F' }}>
                  {!isCorrect && <span className="font-semibold">{MOSCOW_CATEGORY_LABELS[item.category]}: </span>}
                  {item.rationale}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        {submitted ? (
          <>
            <span className="text-xs" style={{ color: allCorrect ? '#5FBF8F' : '#F0708F' }}>
              {allCorrect ? 'All four correct!' : 'Some of these landed in the wrong bucket — see the notes above.'}
            </span>
            <button onClick={nextRound} className="px-4 py-1.5 text-xs font-semibold" style={{ background: '#D97A38', color: '#0F151B', border: 'none', cursor: 'pointer' }}>
              Next round
            </button>
          </>
        ) : (
          <>
            <span className="text-xs" style={{ color: '#93A4B8' }}>
              {allPicked ? 'Ready to submit.' : `${round.items.filter(i => picks[i.id]).length}/${round.items.length} classified`}
            </span>
            <button
              onClick={submit}
              disabled={!allPicked}
              className="px-4 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-default" style={{ background: '#D97A38', color: '#0F151B', border: 'none' }}
            >
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
