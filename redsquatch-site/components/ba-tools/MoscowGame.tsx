'use client';

import { useEffect, useState } from 'react';
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

export default function MoscowGame() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, MoscowCategory>>({});
  const [submitted, setSubmitted] = useState(false);

  const round = MOSCOW_ROUNDS[roundIndex % MOSCOW_ROUNDS.length];
  const allPicked = round.items.every(item => picks[item.id]);
  const allCorrect = submitted && round.items.every(item => picks[item.id] === item.category);

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
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Classify every item, then submit — the round only scores as correct if all four match.
        </span>
        {progress && (
          <div className="flex items-center gap-4 text-xs" style={{ color: '#d4a373' }}>
            <span className="flex items-center gap-1"><Trophy size={13} /> {progress.score} pts</span>
            <span className="flex items-center gap-1"><Flame size={13} /> streak {progress.current_streak}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>best {progress.best_streak}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(200,60,60,0.12)', color: '#e08787' }}>
          {error}
        </div>
      )}

      <div
        className="text-sm rounded-lg p-3"
        style={{ background: 'rgba(184,115,51,0.08)', border: '1px solid rgba(184,115,51,0.25)', color: '#d4a373' }}
      >
        {round.context}
      </div>

      <div className="flex flex-col gap-3">
        {round.items.map(item => {
          const picked = picks[item.id];
          const isCorrect = submitted && picked === item.category;
          const isWrong = submitted && picked !== undefined && picked !== item.category;

          return (
            <div
              key={item.id}
              className="rounded-lg p-3"
              style={{
                border: '1px solid ' + (isCorrect ? 'rgba(76,175,80,0.5)' : isWrong ? 'rgba(220,80,80,0.5)' : 'rgba(184,115,51,0.25)'),
                background: isCorrect ? 'rgba(76,175,80,0.1)' : isWrong ? 'rgba(220,80,80,0.1)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-start gap-2">
                {submitted && (isCorrect
                  ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4caf50' }} />
                  : isWrong
                    ? <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#dc5050' }} />
                    : <span className="w-4" />)}
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.text}</span>
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
                      className="text-xs px-2.5 py-1 rounded-full transition-colors disabled:cursor-default"
                      style={{
                        border: '1px solid ' + (isTheAnswer ? 'rgba(76,175,80,0.6)' : isSelected ? 'rgba(184,115,51,0.6)' : 'rgba(255,255,255,0.15)'),
                        background: isTheAnswer ? 'rgba(76,175,80,0.15)' : isSelected ? 'rgba(184,115,51,0.18)' : 'transparent',
                        color: isTheAnswer ? '#8fce8f' : isSelected ? '#d4a373' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {MOSCOW_CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-2 pl-6 text-xs" style={{ color: isCorrect ? '#8fce8f' : '#e08787' }}>
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
            <span className="text-xs" style={{ color: allCorrect ? '#8fce8f' : '#e08787' }}>
              {allCorrect ? 'All four correct!' : 'Some of these landed in the wrong bucket — see the notes above.'}
            </span>
            <button onClick={nextRound} className="glass-btn px-4 py-1.5 rounded text-xs font-semibold">
              Next round
            </button>
          </>
        ) : (
          <>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {allPicked ? 'Ready to submit.' : `${round.items.filter(i => picks[i.id]).length}/${round.items.length} classified`}
            </span>
            <button
              onClick={submit}
              disabled={!allPicked}
              className="glass-btn px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-default"
            >
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
