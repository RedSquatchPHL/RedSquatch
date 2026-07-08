import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Check, X as XIcon, Plus, Trash2, BarChart3 } from 'lucide-react';

type ItemType = 'word' | 'conjugation';

interface VocabItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
  type: ItemType;
  box: number; // Leitner box 1-5 (5 = mastered)
  correctCount: number;
  incorrectCount: number;
  lastReviewed: string | null;
  nextReview: string; // YYYY-MM-DD, due date
}

interface StreakData {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

const VOCAB_KEY = 'spanish-tutor-vocab';
const STREAK_KEY = 'spanish-tutor-streak';
const DRILL_SIZE_KEY = 'spanish-tutor-drillsize';

// days until next review once an item lands in a given box
const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 14];

const todayStr = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type SeedItem = Pick<VocabItem, 'id' | 'front' | 'back' | 'type' | 'hint'>;

const WORDS: SeedItem[] = [
  { id: 'w-hello', front: 'hello', back: 'hola', type: 'word' },
  { id: 'w-goodbye', front: 'goodbye', back: 'adiós', type: 'word' },
  { id: 'w-please', front: 'please', back: 'por favor', type: 'word' },
  { id: 'w-thanks', front: 'thank you', back: 'gracias', type: 'word' },
  { id: 'w-yes', front: 'yes', back: 'sí', type: 'word' },
  { id: 'w-no', front: 'no', back: 'no', type: 'word' },
  { id: 'w-water', front: 'water', back: 'agua', type: 'word' },
  { id: 'w-house', front: 'house', back: 'casa', type: 'word' },
  { id: 'w-dog', front: 'dog', back: 'perro', type: 'word' },
  { id: 'w-cat', front: 'cat', back: 'gato', type: 'word' },
  { id: 'w-friend', front: 'friend', back: 'amigo', type: 'word' },
  { id: 'w-family', front: 'family', back: 'familia', type: 'word' },
  { id: 'w-food', front: 'food', back: 'comida', type: 'word' },
  { id: 'w-day', front: 'day', back: 'día', type: 'word' },
  { id: 'w-night', front: 'night', back: 'noche', type: 'word' },
  { id: 'w-today', front: 'today', back: 'hoy', type: 'word' },
  { id: 'w-tomorrow', front: 'tomorrow', back: 'mañana', type: 'word' },
  { id: 'w-yesterday', front: 'yesterday', back: 'ayer', type: 'word' },
  { id: 'w-good', front: 'good', back: 'bueno', type: 'word' },
  { id: 'w-bad', front: 'bad', back: 'malo', type: 'word' },
  { id: 'w-big', front: 'big', back: 'grande', type: 'word' },
  { id: 'w-small', front: 'small', back: 'pequeño', type: 'word' },
  { id: 'w-happy', front: 'happy', back: 'feliz', type: 'word' },
  { id: 'w-sad', front: 'sad', back: 'triste', type: 'word' },
  { id: 'w-book', front: 'book', back: 'libro', type: 'word' },
  { id: 'w-school', front: 'school', back: 'escuela', type: 'word' },
  { id: 'w-work', front: 'work', back: 'trabajo', type: 'word' },
  { id: 'w-city', front: 'city', back: 'ciudad', type: 'word' },
  { id: 'w-country', front: 'country', back: 'país', type: 'word' },
  { id: 'w-money', front: 'money', back: 'dinero', type: 'word' },
  { id: 'w-love', front: 'love', back: 'amor', type: 'word' },
  { id: 'w-name', front: 'name', back: 'nombre', type: 'word' },
  { id: 'w-year', front: 'year', back: 'año', type: 'word' },
  { id: 'w-week', front: 'week', back: 'semana', type: 'word' },
  { id: 'w-month', front: 'month', back: 'mes', type: 'word' },
  { id: 'w-red', front: 'red', back: 'rojo', type: 'word' },
  { id: 'w-blue', front: 'blue', back: 'azul', type: 'word' },
  { id: 'w-green', front: 'green', back: 'verde', type: 'word' },
  { id: 'w-white', front: 'white', back: 'blanco', type: 'word' },
  { id: 'w-black', front: 'black', back: 'negro', type: 'word' },
];

const VERBS: { verb: string; forms: [string, string, string][] }[] = [
  { verb: 'hablar', forms: [['yo', 'hablo', 'I speak'], ['tú', 'hablas', 'you speak'], ['él/ella', 'habla', 'he/she speaks'], ['nosotros', 'hablamos', 'we speak'], ['ellos', 'hablan', 'they speak']] },
  { verb: 'comer', forms: [['yo', 'como', 'I eat'], ['tú', 'comes', 'you eat'], ['él/ella', 'come', 'he/she eats'], ['nosotros', 'comemos', 'we eat'], ['ellos', 'comen', 'they eat']] },
  { verb: 'vivir', forms: [['yo', 'vivo', 'I live'], ['tú', 'vives', 'you live'], ['él/ella', 'vive', 'he/she lives'], ['nosotros', 'vivimos', 'we live'], ['ellos', 'viven', 'they live']] },
  { verb: 'ser', forms: [['yo', 'soy', 'I am'], ['tú', 'eres', 'you are'], ['él/ella', 'es', 'he/she is'], ['nosotros', 'somos', 'we are'], ['ellos', 'son', 'they are']] },
  { verb: 'estar', forms: [['yo', 'estoy', 'I am'], ['tú', 'estás', 'you are'], ['él/ella', 'está', 'he/she is'], ['nosotros', 'estamos', 'we are'], ['ellos', 'están', 'they are']] },
  { verb: 'tener', forms: [['yo', 'tengo', 'I have'], ['tú', 'tienes', 'you have'], ['él/ella', 'tiene', 'he/she has'], ['nosotros', 'tenemos', 'we have'], ['ellos', 'tienen', 'they have']] },
  { verb: 'ir', forms: [['yo', 'voy', 'I go'], ['tú', 'vas', 'you go'], ['él/ella', 'va', 'he/she goes'], ['nosotros', 'vamos', 'we go'], ['ellos', 'van', 'they go']] },
  { verb: 'hacer', forms: [['yo', 'hago', 'I do/make'], ['tú', 'haces', 'you do/make'], ['él/ella', 'hace', 'he/she does/makes'], ['nosotros', 'hacemos', 'we do/make'], ['ellos', 'hacen', 'they do/make']] },
  { verb: 'querer', forms: [['yo', 'quiero', 'I want'], ['tú', 'quieres', 'you want'], ['él/ella', 'quiere', 'he/she wants'], ['nosotros', 'queremos', 'we want'], ['ellos', 'quieren', 'they want']] },
];

const CONJUGATIONS: SeedItem[] = VERBS.flatMap(({ verb, forms }) =>
  forms.map(([pronoun, conjugated, meaning]) => ({
    id: `c-${verb}-${pronoun.replace(/[^a-z]/gi, '')}`,
    front: `${verb} (${pronoun})`,
    back: conjugated,
    hint: meaning,
    type: 'conjugation' as const,
  }))
);

const SEED_VOCAB: SeedItem[] = [...WORDS, ...CONJUGATIONS];

function loadVocab(): VocabItem[] {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to reseed
  }
  const seeded: VocabItem[] = SEED_VOCAB.map((v) => ({
    ...v,
    box: 1,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewed: null,
    nextReview: todayStr(),
  }));
  localStorage.setItem(VOCAB_KEY, JSON.stringify(seeded));
  return seeded;
}

const saveVocab = (items: VocabItem[]) => localStorage.setItem(VOCAB_KEY, JSON.stringify(items));

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to default
  }
  return { current: 0, longest: 0, lastCompletedDate: null };
}

const saveStreak = (s: StreakData) => localStorage.setItem(STREAK_KEY, JSON.stringify(s));

const weaknessScore = (v: VocabItem) => {
  const attempts = v.correctCount + v.incorrectCount;
  const errorRate = attempts > 0 ? v.incorrectCount / attempts : 0.5;
  return (5 - v.box) + errorRate * 3;
};

function buildDrill(vocab: VocabItem[], size: number): VocabItem[] {
  const today = todayStr();
  const due = vocab.filter((v) => v.nextReview <= today).sort((a, b) => weaknessScore(b) - weaknessScore(a));
  let pool = due;
  if (pool.length < size) {
    const rest = vocab.filter((v) => v.nextReview > today).sort((a, b) => weaknessScore(b) - weaknessScore(a));
    pool = [...pool, ...rest];
  }
  const top = pool.slice(0, Math.max(size * 2, size));
  const picked = shuffle(top).slice(0, size);
  return picked.length > 0 ? picked : shuffle(vocab).slice(0, size);
}

function gradeItem(item: VocabItem, correct: boolean): VocabItem {
  const box = correct ? Math.min(item.box + 1, 5) : 1;
  return {
    ...item,
    box,
    correctCount: item.correctCount + (correct ? 1 : 0),
    incorrectCount: item.incorrectCount + (correct ? 0 : 1),
    lastReviewed: todayStr(),
    nextReview: addDays(todayStr(), BOX_INTERVAL_DAYS[box]),
  };
}

function completeDrillDay(streak: StreakData): StreakData {
  const today = todayStr();
  if (streak.lastCompletedDate === today) return streak;
  const yesterday = addDays(today, -1);
  const current = streak.lastCompletedDate === yesterday ? streak.current + 1 : 1;
  return { current, longest: Math.max(streak.longest, current), lastCompletedDate: today };
}

const boxColor = (box: number) => {
  if (box >= 5) return 'bg-green-700';
  if (box >= 3) return 'bg-amber-700';
  return 'bg-red-800/80';
};

type Phase = 'idle' | 'drilling' | 'summary';

export default function SpanishTutor() {
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastCompletedDate: null });
  const [drillSize, setDrillSize] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [session, setSession] = useState<VocabItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });

  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newType, setNewType] = useState<ItemType>('word');

  useEffect(() => {
    setVocab(loadVocab());
    setStreak(loadStreak());
    const storedSize = localStorage.getItem(DRILL_SIZE_KEY);
    if (storedSize) setDrillSize(parseInt(storedSize, 10));
  }, []);

  const stats = useMemo(() => {
    const total = vocab.length;
    const mastered = vocab.filter((v) => v.box >= 5).length;
    const dueToday = vocab.filter((v) => v.nextReview <= todayStr()).length;
    const totalCorrect = vocab.reduce((s, v) => s + v.correctCount, 0);
    const totalIncorrect = vocab.reduce((s, v) => s + v.incorrectCount, 0);
    const attempts = totalCorrect + totalIncorrect;
    const accuracy = attempts > 0 ? Math.round((totalCorrect / attempts) * 100) : 0;
    return { total, mastered, dueToday, accuracy };
  }, [vocab]);

  const weakestFirst = useMemo(
    () => [...vocab].sort((a, b) => weaknessScore(b) - weaknessScore(a)),
    [vocab]
  );

  const setDrillSizePersist = (n: number) => {
    setDrillSize(n);
    localStorage.setItem(DRILL_SIZE_KEY, String(n));
  };

  const startDrill = () => {
    setSession(buildDrill(vocab, drillSize));
    setCardIndex(0);
    setRevealed(false);
    setResults({ correct: 0, incorrect: 0 });
    setPhase('drilling');
  };

  const grade = (correct: boolean) => {
    const item = session[cardIndex];
    const updatedItem = gradeItem(item, correct);
    const newVocab = vocab.map((v) => (v.id === item.id ? updatedItem : v));
    setVocab(newVocab);
    saveVocab(newVocab);
    setResults((r) => ({ correct: r.correct + (correct ? 1 : 0), incorrect: r.incorrect + (correct ? 0 : 1) }));

    if (cardIndex + 1 >= session.length) {
      const newStreak = completeDrillDay(streak);
      setStreak(newStreak);
      saveStreak(newStreak);
      setPhase('summary');
    } else {
      setCardIndex((i) => i + 1);
      setRevealed(false);
    }
  };

  const addWord = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const item: VocabItem = {
      id: `custom-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      hint: newHint.trim() || undefined,
      type: newType,
      box: 1,
      correctCount: 0,
      incorrectCount: 0,
      lastReviewed: null,
      nextReview: todayStr(),
    };
    const updated = [...vocab, item];
    setVocab(updated);
    saveVocab(updated);
    setNewFront('');
    setNewBack('');
    setNewHint('');
  };

  const deleteWord = (id: string) => {
    const updated = vocab.filter((v) => v.id !== id);
    setVocab(updated);
    saveVocab(updated);
  };

  const currentCard = session[cardIndex];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-gradient-to-br from-slate-950 to-slate-900 text-slate-50 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-playfair">Spanish Tutor</h1>
        <div className="flex items-center gap-2 bg-slate-800 bg-opacity-50 px-3 py-1.5 rounded-lg border border-amber-700 border-opacity-30">
          <Flame size={18} className={streak.current > 0 ? 'text-orange-400' : 'text-slate-500'} />
          <span className="font-semibold text-sm">
            {streak.current} day{streak.current === 1 ? '' : 's'}
          </span>
          <span className="text-xs text-slate-400">(best {streak.longest})</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Words', value: stats.total },
          { label: 'Mastered', value: stats.mastered },
          { label: 'Due Today', value: stats.dueToday },
          { label: 'Accuracy', value: `${stats.accuracy}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-20 text-center"
          >
            <div className="text-xl font-bold text-amber-400">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Drill area */}
      {phase === 'idle' && (
        <div className="mb-6 p-4 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
          <h3 className="text-lg font-playfair mb-3">Daily Drill</h3>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-400">Words per drill:</span>
            {[5, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setDrillSizePersist(n)}
                className={`px-3 py-1 rounded text-sm transition ${
                  drillSize === n ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={startDrill}
            disabled={vocab.length === 0}
            className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition font-semibold"
          >
            Start Drill
          </button>
        </div>
      )}

      {phase === 'drilling' && currentCard && (
        <div className="mb-6 p-6 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span>
              Card {cardIndex + 1} of {session.length}
            </span>
            <span className="uppercase tracking-wide">{currentCard.type}</span>
          </div>

          <div className="text-center py-8">
            <div className="text-2xl font-bold mb-2">{currentCard.front}</div>
            {revealed && (
              <div className="mt-4">
                <div className="text-3xl font-bold text-amber-400">{currentCard.back}</div>
                {currentCard.hint && <div className="text-sm text-slate-400 mt-1">{currentCard.hint}</div>}
              </div>
            )}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition font-semibold"
            >
              Show Answer
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => grade(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg transition font-semibold"
              >
                <XIcon size={18} /> Missed It
              </button>
              <button
                onClick={() => grade(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg transition font-semibold"
              >
                <Check size={18} /> Got It
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'summary' && (
        <div className="mb-6 p-6 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30 text-center">
          <BarChart3 size={28} className="mx-auto text-amber-400 mb-2" />
          <h3 className="text-xl font-playfair mb-1">Drill Complete</h3>
          <p className="text-slate-300 mb-4">
            {results.correct}/{results.correct + results.incorrect} correct
          </p>
          <p className="text-sm text-orange-400 flex items-center justify-center gap-1 mb-4">
            <Flame size={16} /> Streak: {streak.current} day{streak.current === 1 ? '' : 's'} (best {streak.longest})
          </p>
          <button
            onClick={() => setPhase('idle')}
            className="bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition font-semibold"
          >
            Done
          </button>
        </div>
      )}

      {/* Add word */}
      <div className="mb-6 p-4 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Add a word or conjugation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <input
            type="text"
            placeholder="Front (e.g. hablar (yo))"
            value={newFront}
            onChange={(e) => setNewFront(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500"
          />
          <input
            type="text"
            placeholder="Back (e.g. hablo)"
            value={newBack}
            onChange={(e) => setNewBack(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500"
          />
          <input
            type="text"
            placeholder="Hint (optional)"
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ItemType)}
            className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50"
          >
            <option value="word">Word</option>
            <option value="conjugation">Conjugation</option>
          </select>
        </div>
        <button
          onClick={addWord}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition text-sm font-semibold"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Word bank */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Word Bank (weakest first)</h3>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {weakestFirst.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between px-3 py-2 bg-slate-800 bg-opacity-30 rounded border border-amber-700 border-opacity-10"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm">{v.front}</span>
                <span className="text-xs text-slate-500 ml-2">→ {v.back}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${boxColor(v.box)}`}>Box {v.box}</span>
                <button
                  onClick={() => deleteWord(v.id)}
                  className="text-slate-500 hover:text-red-400 transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
