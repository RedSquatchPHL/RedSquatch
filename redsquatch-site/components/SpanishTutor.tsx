'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Plus, Trash2, BarChart3, Volume2, SkipForward } from 'lucide-react';
import { API } from '@/lib/api';

interface VocabItem {
  id: number;
  item_type: 'word' | 'conjugation';
  front: string;
  back: string;
  part_of_speech: string | null;
  example_sentence: string | null;
  hint: string | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  box: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at: string | null;
  next_review_at: string;
}

interface Milestone {
  id: number;
  milestone_type: string;
  unlocked_at: string;
}

interface ReviewFeedback {
  wasCorrect: boolean;
  quality: number;
  correctAnswer: string;
  typedAnswer: string;
}

type Mode = 'vocab' | 'conjugations' | 'cloze' | 'immersion';
type Difficulty = 'all' | 'beginner' | 'intermediate' | 'advanced';

const MILESTONE_LABELS: Record<string, string> = {
  streak_7: '🔥 7-Day Streak',
  streak_30: '🔥 30-Day Streak',
  words_100: '📚 100 Words',
  conjugations_50: '🎯 50 Conjugations',
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const weaknessScore = (v: VocabItem) => {
  const attempts = v.correct_count + v.incorrect_count;
  const errorRate = attempts > 0 ? v.incorrect_count / attempts : 0.5;
  return (5 - v.box) + errorRate * 3;
};

const boxColor = (box: number) => {
  if (box >= 5) return { background: 'rgba(34,197,94,0.18)', color: '#4ade80' };
  if (box >= 3) return { background: 'rgba(184,115,51,0.18)', color: '#d4a373' };
  return { background: 'rgba(224,120,86,0.18)', color: '#e07856' };
};

// Blanks the target Spanish word out of its own example sentence. Some seed
// examples use a grammatically-agreed form that doesn't literally match the
// stored word (e.g. back="blanco" but the sentence says "blanca") — rather
// than show a broken/impossible blank, callers should drop items where
// `found` comes back false.
function buildCloze(item: VocabItem): { sentence: string; found: boolean } {
  if (!item.example_sentence) return { sentence: '', found: false };
  const idx = item.example_sentence.toLowerCase().indexOf(item.back.toLowerCase());
  if (idx === -1) return { sentence: '', found: false };
  const blanked =
    item.example_sentence.slice(0, idx) + '_____' + item.example_sentence.slice(idx + item.back.length);
  return { sentence: blanked, found: true };
}

// Browser-native TTS — no backend, no dependency, degrades silently where unsupported.
function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'es-MX';
  window.speechSynthesis.speak(utter);
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/api/client/spanish${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return res.json();
}

export default function SpanishTutor() {
  const [mode, setMode] = useState<Mode>('vocab');
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [dueOnly, setDueOnly] = useState(false);

  const [wordBank, setWordBank] = useState<VocabItem[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  // Vocab drills
  const [pool, setPool] = useState<VocabItem[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [poolLoading, setPoolLoading] = useState(false);
  const [drillAnswer, setDrillAnswer] = useState('');
  const [drillFeedback, setDrillFeedback] = useState<ReviewFeedback | null>(null);

  // Conjugations
  const [conjugation, setConjugation] = useState<{ verb: string; tense: string; forms: VocabItem[] } | null>(null);
  const [conjIndex, setConjIndex] = useState(0);
  const [conjAnswer, setConjAnswer] = useState('');
  const [conjFeedback, setConjFeedback] = useState<ReviewFeedback | null>(null);

  // Cloze
  const [clozePool, setClozePool] = useState<VocabItem[]>([]);
  const [clozeIndex, setClozeIndex] = useState(0);
  const [clozeLoading, setClozeLoading] = useState(false);
  const [clozeAnswer, setClozeAnswer] = useState('');
  const [clozeFeedback, setClozeFeedback] = useState<ReviewFeedback | null>(null);

  // Immersion
  const [immersionActive, setImmersionActive] = useState(false);
  const [immersionWord, setImmersionWord] = useState<VocabItem | null>(null);
  const [immersionTimer, setImmersionTimer] = useState(5);
  const [immersionAnswer, setImmersionAnswer] = useState('');
  const [immersionScore, setImmersionScore] = useState({ correct: 0, total: 0 });
  const [immersionFeedback, setImmersionFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [immersionDone, setImmersionDone] = useState(false);

  // Add word form
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newType, setNewType] = useState<'word' | 'conjugation'>('word');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('beginner');

  const loadSidebar = async () => {
    const [vocabRes, streakRes, milestonesRes] = await Promise.all([
      api('/vocab'),
      api('/streaks'),
      api('/milestones'),
    ]);
    setWordBank(vocabRes?.vocab || []);
    if (streakRes) setStreak({ current: streakRes.current || 0, longest: streakRes.longest || 0 });
    setMilestones(milestonesRes?.milestones || []);
  };

  useEffect(() => {
    loadSidebar();
  }, []);

  const loadDrillPool = async () => {
    setPoolLoading(true);
    const diffParam = difficulty !== 'all' ? `?difficulty=${difficulty}` : '';
    const data = dueOnly ? await api(`/vocab/due${diffParam}`) : await api(`/vocab${diffParam}`);
    const items: VocabItem[] = (data?.vocab || []).filter((v: VocabItem) => v.item_type === 'word');
    setPool(shuffle(items));
    setDrillIndex(0);
    setDrillAnswer('');
    setDrillFeedback(null);
    setPoolLoading(false);
  };

  useEffect(() => {
    if (mode === 'vocab') loadDrillPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, dueOnly]);

  const loadClozePool = async () => {
    setClozeLoading(true);
    const diffParam = difficulty !== 'all' ? `?difficulty=${difficulty}` : '';
    const data = dueOnly ? await api(`/vocab/due${diffParam}`) : await api(`/vocab${diffParam}`);
    const items: VocabItem[] = (data?.vocab || []).filter(
      (v: VocabItem) => v.item_type === 'word' && buildCloze(v).found
    );
    setClozePool(shuffle(items));
    setClozeIndex(0);
    setClozeAnswer('');
    setClozeFeedback(null);
    setClozeLoading(false);
  };

  useEffect(() => {
    if (mode === 'cloze') loadClozePool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, dueOnly]);

  const showBanner = (msg: string) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 3500);
  };

  const submitReview = async (itemId: number, answer: string) => {
    const data = await api(`/vocab/${itemId}/review`, { method: 'POST', body: JSON.stringify({ answer }) });
    if (data?.streak) setStreak(data.streak);
    if (data?.newMilestones?.length) {
      for (const m of data.newMilestones) {
        showBanner(`New milestone unlocked: ${MILESTONE_LABELS[m.milestone_type] || m.milestone_type}!`);
      }
      const milestonesRes = await api('/milestones');
      setMilestones(milestonesRes?.milestones || []);
    }
    // refresh word bank stats quietly
    const vocabRes = await api('/vocab');
    setWordBank(vocabRes?.vocab || []);
    return data as { item?: VocabItem; wasCorrect?: boolean; quality?: number; correctAnswer?: string } | undefined;
  };

  const gradeDrillCard = async () => {
    const item = pool[drillIndex];
    if (!item) return;
    const data = await submitReview(item.id, drillAnswer);
    setDrillFeedback({
      wasCorrect: !!data?.wasCorrect,
      quality: data?.quality ?? 0,
      correctAnswer: data?.correctAnswer ?? item.back,
      typedAnswer: drillAnswer,
    });
    setTimeout(() => {
      setDrillFeedback(null);
      setDrillAnswer('');
      if (drillIndex + 1 >= pool.length) {
        setDrillIndex(pool.length); // past the end -> session complete state
      } else {
        setDrillIndex((i) => i + 1);
      }
    }, 1600);
  };

  const loadConjugation = async () => {
    const diffParam = difficulty !== 'all' ? { difficulty } : {};
    const data = await api('/conjugations', { method: 'POST', body: JSON.stringify(diffParam) });
    if (data?.forms) {
      setConjugation({ verb: data.verb, tense: data.tense, forms: data.forms });
      setConjIndex(0);
      setConjAnswer('');
      setConjFeedback(null);
    }
  };

  useEffect(() => {
    if (mode === 'conjugations') loadConjugation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const gradeConjForm = async () => {
    if (!conjugation) return;
    const form = conjugation.forms[conjIndex];
    const data = await submitReview(form.id, conjAnswer);
    setConjFeedback({
      wasCorrect: !!data?.wasCorrect,
      quality: data?.quality ?? 0,
      correctAnswer: data?.correctAnswer ?? form.back,
      typedAnswer: conjAnswer,
    });
    setTimeout(() => {
      setConjFeedback(null);
      setConjAnswer('');
      if (conjIndex + 1 >= conjugation.forms.length) {
        loadConjugation();
      } else {
        setConjIndex((i) => i + 1);
      }
    }, 1600);
  };

  const gradeClozeCard = async () => {
    const item = clozePool[clozeIndex];
    if (!item) return;
    const data = await submitReview(item.id, clozeAnswer);
    setClozeFeedback({
      wasCorrect: !!data?.wasCorrect,
      quality: data?.quality ?? 0,
      correctAnswer: data?.correctAnswer ?? item.back,
      typedAnswer: clozeAnswer,
    });
    setTimeout(() => {
      setClozeFeedback(null);
      setClozeAnswer('');
      if (clozeIndex + 1 >= clozePool.length) {
        setClozeIndex(clozePool.length);
      } else {
        setClozeIndex((i) => i + 1);
      }
    }, 1600);
  };

  // ─── Immersion ──────────────────────────────────────────────────────────

  const nextImmersionWord = async () => {
    const diffParam = difficulty !== 'all' ? `?difficulty=${difficulty}` : '';
    const data = await api(`/immersion${diffParam}`);
    setImmersionWord(data?.item || null);
    setImmersionAnswer('');
    setImmersionFeedback(null);
    setImmersionTimer(5);
  };

  const startImmersion = async () => {
    setImmersionScore({ correct: 0, total: 0 });
    setImmersionDone(false);
    setImmersionActive(true);
    await nextImmersionWord();
  };

  const settleImmersionWord = (skip: boolean) => {
    if (!immersionWord) return;
    if (skip) {
      setImmersionScore((s) => ({ ...s, total: s.total + 1 }));
      nextImmersionWord();
      return;
    }
    const correct = immersionAnswer.trim().toLowerCase() === immersionWord.front.trim().toLowerCase();
    setImmersionFeedback(correct ? 'correct' : 'wrong');
    setImmersionScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setTimeout(() => nextImmersionWord(), 900);
  };

  useEffect(() => {
    if (!immersionActive || !immersionWord || immersionFeedback) return;
    if (immersionTimer <= 0) {
      settleImmersionWord(false);
      return;
    }
    const t = setTimeout(() => setImmersionTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersionTimer, immersionActive, immersionWord, immersionFeedback]);

  const endImmersion = () => {
    setImmersionActive(false);
    setImmersionDone(true);
  };

  // ─── Add / delete word bank items ──────────────────────────────────────

  const addWord = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    await api('/vocab', {
      method: 'POST',
      body: JSON.stringify({
        front: newFront.trim(),
        back: newBack.trim(),
        hint: newHint.trim() || undefined,
        item_type: newType,
        difficulty_level: newDifficulty === 'all' ? 'beginner' : newDifficulty,
      }),
    });
    setNewFront('');
    setNewBack('');
    setNewHint('');
    loadSidebar();
  };

  const deleteWord = async (id: number) => {
    await api(`/vocab/${id}`, { method: 'DELETE' });
    loadSidebar();
  };

  const stats = useMemo(() => {
    const total = wordBank.length;
    const mastered = wordBank.filter((v) => v.box >= 5).length;
    return { total, mastered, pct: total > 0 ? Math.round((mastered / total) * 100) : 0 };
  }, [wordBank]);

  const weakestFirst = useMemo(() => [...wordBank].sort((a, b) => weaknessScore(b) - weaknessScore(a)), [wordBank]);

  const currentCard = pool[drillIndex];
  const drillComplete = mode === 'vocab' && !poolLoading && pool.length > 0 && drillIndex >= pool.length;
  const currentClozeCard = clozePool[clozeIndex];
  const clozeComplete = mode === 'cloze' && !clozeLoading && clozePool.length > 0 && clozeIndex >= clozePool.length;

  const FeedbackBanner = ({ feedback }: { feedback: ReviewFeedback }) => (
    <div
      className="mt-3 flex items-center justify-center gap-2 text-center text-sm font-semibold rounded-lg py-2 px-3"
      style={
        feedback.wasCorrect
          ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }
          : { background: 'rgba(224,120,86,0.12)', color: '#e07856', border: '1px solid rgba(224,120,86,0.35)' }
      }
    >
      <span>
        {feedback.wasCorrect
          ? feedback.quality === 5
            ? 'Correct!'
            : `Close — you wrote "${feedback.typedAnswer}", answer was "${feedback.correctAnswer}"`
          : `Not quite — answer was "${feedback.correctAnswer}"`}
      </span>
      <button onClick={() => speak(feedback.correctAnswer)} title="Play pronunciation" style={{ cursor: 'pointer', opacity: 0.7 }}>
        <Volume2 size={15} />
      </button>
    </div>
  );

  const AnswerForm = ({
    value,
    onChange,
    onSubmit,
    disabled,
    placeholder = 'Type the Spanish translation…',
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    disabled: boolean;
    placeholder?: string;
  }) => (
    <div className="flex gap-2">
      <input
        autoFocus
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && value.trim() && onSubmit()}
        disabled={disabled}
        className="glass-input flex-1 px-3 py-2 rounded text-sm text-center"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="glass-btn px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Spanish Tutor
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,115,51,0.25)' }}>
          <Flame size={18} style={{ color: streak.current > 0 ? '#e07856' : 'rgba(255,255,255,0.3)' }} />
          <span className="font-bold text-sm" style={{ color: '#d4a373' }}>
            {streak.current} day{streak.current === 1 ? '' : 's'}
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>(best {streak.longest})</span>
        </div>
      </div>

      {banner && (
        <div className="mb-4 rounded-lg px-4 py-2 text-sm text-center" style={{ background: 'rgba(184,115,51,0.15)', border: '1px solid #b87333', color: '#d4a373' }}>
          {banner}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'vocab', label: 'Vocab Drills' },
          { key: 'conjugations', label: 'Conjugations' },
          { key: 'cloze', label: 'Cloze' },
          { key: 'immersion', label: 'Immersion' },
        ] as { key: Mode; label: string }[]).map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={
              mode === m.key
                ? { background: 'rgba(184,115,51,0.18)', border: '1px solid #b87333', color: '#d4a373' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,115,51,0.15)', color: 'rgba(255,255,255,0.5)' }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          {/* Difficulty + due filter (vocab & conjugations & cloze & immersion) */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(['all', 'beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="px-3 py-1 rounded text-xs capitalize transition-colors"
                style={
                  difficulty === d
                    ? { background: 'rgba(184,115,51,0.2)', color: '#d4a373' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {d}
              </button>
            ))}
            {(mode === 'vocab' || mode === 'cloze') && (
              <label className="flex items-center gap-1.5 text-xs ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
                Due for review only
              </label>
            )}
          </div>

          {/* VOCAB DRILLS */}
          {mode === 'vocab' && (
            <div className="glass-surface rounded-xl p-6" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
              {poolLoading ? (
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
              ) : pool.length === 0 ? (
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Nothing to drill right now — try a different filter.
                </p>
              ) : drillComplete ? (
                <div className="text-center py-6">
                  <BarChart3 size={28} className="mx-auto mb-2" style={{ color: '#d4a373' }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#d4a373' }}>Session Complete</h3>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {pool.length} word{pool.length === 1 ? '' : 's'} reviewed
                  </p>
                  <button onClick={loadDrillPool} className="glass-btn px-4 py-2 rounded-lg text-sm font-semibold">
                    New Session
                  </button>
                </div>
              ) : currentCard ? (
                <>
                  <div className="flex items-center justify-between text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>Card {drillIndex + 1} of {pool.length}</span>
                    <span className="capitalize">{currentCard.difficulty_level}</span>
                  </div>
                  <div className="text-center py-8">
                    <div className="text-2xl font-bold mb-2" style={{ color: '#d4a373' }}>
                      {currentCard.front}
                    </div>
                  </div>
                  <AnswerForm
                    value={drillAnswer}
                    onChange={setDrillAnswer}
                    onSubmit={gradeDrillCard}
                    disabled={!!drillFeedback}
                  />
                  {drillFeedback && <FeedbackBanner feedback={drillFeedback} />}
                </>
              ) : null}
            </div>
          )}

          {/* CONJUGATIONS */}
          {mode === 'conjugations' && (
            <div className="glass-surface rounded-xl p-6" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
              {!conjugation ? (
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>{conjugation.verb} — {conjugation.tense}</span>
                    <span>Form {conjIndex + 1} of {conjugation.forms.length}</span>
                  </div>
                  <div className="text-center py-8">
                    <div className="text-2xl font-bold mb-2" style={{ color: '#d4a373' }}>
                      {conjugation.forms[conjIndex]?.front}
                    </div>
                  </div>
                  <AnswerForm
                    value={conjAnswer}
                    onChange={setConjAnswer}
                    onSubmit={gradeConjForm}
                    disabled={!!conjFeedback}
                    placeholder="Type the conjugated form…"
                  />
                  {conjFeedback && <FeedbackBanner feedback={conjFeedback} />}
                  {!conjFeedback && (
                    <button onClick={loadConjugation} className="w-full mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Skip to a new verb
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* CLOZE */}
          {mode === 'cloze' && (
            <div className="glass-surface rounded-xl p-6" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
              {clozeLoading ? (
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
              ) : clozePool.length === 0 ? (
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No words with a usable example sentence for this filter yet.
                </p>
              ) : clozeComplete ? (
                <div className="text-center py-6">
                  <BarChart3 size={28} className="mx-auto mb-2" style={{ color: '#d4a373' }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#d4a373' }}>Session Complete</h3>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {clozePool.length} sentence{clozePool.length === 1 ? '' : 's'} reviewed
                  </p>
                  <button onClick={loadClozePool} className="glass-btn px-4 py-2 rounded-lg text-sm font-semibold">
                    New Session
                  </button>
                </div>
              ) : currentClozeCard ? (
                <>
                  <div className="flex items-center justify-between text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>Sentence {clozeIndex + 1} of {clozePool.length}</span>
                    <span className="capitalize">{currentClozeCard.difficulty_level}</span>
                  </div>
                  <div className="text-center py-8">
                    <div className="text-xl font-semibold mb-2" style={{ color: '#d4a373' }}>
                      {buildCloze(currentClozeCard).sentence}
                    </div>
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      ({currentClozeCard.front})
                    </div>
                  </div>
                  <AnswerForm
                    value={clozeAnswer}
                    onChange={setClozeAnswer}
                    onSubmit={gradeClozeCard}
                    disabled={!!clozeFeedback}
                    placeholder="Fill in the missing word…"
                  />
                  {clozeFeedback && <FeedbackBanner feedback={clozeFeedback} />}
                </>
              ) : null}
            </div>
          )}

          {/* IMMERSION */}
          {mode === 'immersion' && (
            <div className="glass-surface rounded-xl p-6" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
              {!immersionActive && !immersionDone && (
                <div className="text-center py-6">
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Rapid-fire: 5 seconds per word, type the English translation. No hints.
                  </p>
                  <button onClick={startImmersion} className="glass-btn px-6 py-2 rounded-lg text-sm font-semibold">
                    Start Session
                  </button>
                </div>
              )}

              {immersionActive && immersionWord && (
                <>
                  <div className="flex items-center justify-between text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>Score: {immersionScore.correct}/{immersionScore.total}</span>
                    <span style={{ color: immersionTimer <= 2 ? '#e07856' : 'rgba(255,255,255,0.4)' }}>⏱ {immersionTimer}s</span>
                  </div>
                  <div className="text-center py-6">
                    <div className="text-3xl font-bold mb-2" style={{ color: '#d4a373' }}>{immersionWord.back}</div>
                    {immersionWord.example_sentence && (
                      <div className="text-sm italic" style={{ color: 'rgba(255,255,255,0.5)' }}>{immersionWord.example_sentence}</div>
                    )}
                    {immersionFeedback && (
                      <div className="mt-3 text-sm font-semibold" style={{ color: immersionFeedback === 'correct' ? '#4ade80' : '#e07856' }}>
                        {immersionFeedback === 'correct' ? 'Correct!' : `Answer: ${immersionWord.front}`}
                      </div>
                    )}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Type the English translation…"
                    value={immersionAnswer}
                    onChange={(e) => setImmersionAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && settleImmersionWord(false)}
                    disabled={!!immersionFeedback}
                    className="glass-input w-full px-3 py-2 rounded text-sm mb-3 text-center"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => settleImmersionWord(true)}
                      disabled={!!immersionFeedback}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm"
                      style={{ background: 'rgba(184,115,51,0.12)', color: '#d4a373' }}
                    >
                      <SkipForward size={14} /> Pass
                    </button>
                    <button onClick={endImmersion} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                      End Session
                    </button>
                  </div>
                </>
              )}

              {immersionDone && (
                <div className="text-center py-6">
                  <BarChart3 size={28} className="mx-auto mb-2" style={{ color: '#d4a373' }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#d4a373' }}>Session Complete</h3>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {immersionScore.correct}/{immersionScore.total} correct
                  </p>
                  <button onClick={startImmersion} className="glass-btn px-4 py-2 rounded-lg text-sm font-semibold">
                    New Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span>Mastered</span>
              <span>{stats.mastered} / {stats.total}</span>
            </div>
            <div className="w-full h-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-2 rounded transition-all"
                style={{ width: `${stats.pct}%`, background: 'linear-gradient(90deg, #b87333, #d4a373)' }}
              />
            </div>
          </div>

          {milestones.length > 0 && (
            <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#d4a373' }}>Milestones</h4>
              <div className="flex flex-wrap gap-1.5">
                {milestones.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(184,115,51,0.15)', border: '1px solid rgba(184,115,51,0.4)', color: '#d4a373' }}
                  >
                    {MILESTONE_LABELS[m.milestone_type] || m.milestone_type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add word */}
          <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: '#d4a373' }}>Add a word or conjugation</h4>
            <input
              type="text"
              placeholder="English"
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              className="glass-input w-full px-2 py-1.5 rounded text-xs mb-1.5"
            />
            <input
              type="text"
              placeholder="Spanish"
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              className="glass-input w-full px-2 py-1.5 rounded text-xs mb-1.5"
            />
            <input
              type="text"
              placeholder="Hint (optional)"
              value={newHint}
              onChange={(e) => setNewHint(e.target.value)}
              className="glass-input w-full px-2 py-1.5 rounded text-xs mb-1.5"
            />
            <div className="flex gap-1.5 mb-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value as 'word' | 'conjugation')} className="glass-input flex-1 px-2 py-1.5 rounded text-xs">
                <option value="word">Word</option>
                <option value="conjugation">Conjugation</option>
              </select>
              <select value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value as Difficulty)} className="glass-input flex-1 px-2 py-1.5 rounded text-xs">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <button onClick={addWord} className="glass-btn w-full flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold">
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Word bank */}
          <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: '#d4a373' }}>Word Bank (weakest first)</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {weakestFirst.map((v) => {
                const c = boxColor(v.box);
                return (
                  <div key={v.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex-1 min-w-0 truncate">
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{v.front}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}> → {v.back}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={c}>Box {v.box}</span>
                      <button onClick={() => deleteWord(v.id)} title="Delete">
                        <Trash2 size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
