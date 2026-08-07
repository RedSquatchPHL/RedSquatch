'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Flame, Trophy } from 'lucide-react';
import { API } from '@/lib/api';
import { USER_STORY_ROUNDS, type StoryOption } from '@/lib/ba-content';

interface Progress {
  score: number;
  current_streak: number;
  best_streak: number;
  rounds_played: number;
}

// Fisher-Yates — options are re-shuffled per round mount so the "solid" story
// isn't always in the same slot across replays.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function UserStoryGame() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const round = USER_STORY_ROUNDS[roundIndex % USER_STORY_ROUNDS.length];
  const options = useMemo(() => shuffle(round.options), [round.id]);
  const picked = options.find(o => o.id === pickedId) ?? null;
  const correctOption = options.find(o => o.correct) as StoryOption;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/ba-tools/user-story`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        setProgress(await res.json());
      } catch {
        setError('Could not load your saved progress — check your connection.');
      }
    })();
  }, []);

  async function pick(option: StoryOption) {
    if (pickedId) return;
    setPickedId(option.id);
    try {
      const res = await fetch(`${API}/api/client/ba-tools/user-story`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ correct: option.correct }),
      });
      if (!res.ok) throw new Error('update failed');
      setProgress(await res.json());
    } catch {
      setError('Could not save that round — check your connection.');
    }
  }

  function nextRound() {
    setPickedId(null);
    setRoundIndex(i => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Pick the one solid user story — the rest are flawed in different ways.
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

      <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(212,163,115,0.7)' }}>
        {round.theme}
      </div>

      <div className="flex flex-col gap-2.5">
        {options.map(option => {
          const isPicked = pickedId === option.id;
          const revealed = pickedId !== null;
          const showAsCorrect = revealed && option.correct;
          const showAsWrong = revealed && isPicked && !option.correct;

          return (
            <button
              key={option.id}
              onClick={() => pick(option)}
              disabled={revealed}
              className="text-left rounded-lg p-3 transition-colors disabled:cursor-default"
              style={{
                border: '1px solid ' + (showAsCorrect ? 'rgba(76,175,80,0.5)' : showAsWrong ? 'rgba(220,80,80,0.5)' : 'rgba(184,115,51,0.25)'),
                background: showAsCorrect ? 'rgba(76,175,80,0.1)' : showAsWrong ? 'rgba(220,80,80,0.1)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-start gap-2">
                {revealed && (option.correct
                  ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4caf50' }} />
                  : isPicked
                    ? <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#dc5050' }} />
                    : <span className="w-4" />)}
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{option.text}</span>
              </div>
              {revealed && (isPicked || option.correct) && (
                <div className="mt-2 pl-6 text-xs" style={{ color: option.correct ? '#8fce8f' : '#e08787' }}>
                  {option.flaw && <span className="font-semibold">{option.flaw}: </span>}
                  {option.explanation}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {pickedId && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: picked?.correct ? '#8fce8f' : '#e08787' }}>
            {picked?.correct ? 'Correct!' : `Not quite — "${correctOption.text.slice(0, 40)}..." was the solid one.`}
          </span>
          <button
            onClick={nextRound}
            className="glass-btn px-4 py-1.5 rounded text-xs font-semibold"
          >
            Next round
          </button>
        </div>
      )}
    </div>
  );
}
