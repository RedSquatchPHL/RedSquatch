'use strict';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS spanish_vocab (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL DEFAULT 'word',
    front VARCHAR(200) NOT NULL,
    back VARCHAR(200) NOT NULL,
    part_of_speech VARCHAR(50),
    example_sentence TEXT,
    hint VARCHAR(200),
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    box INTEGER DEFAULT 1,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_spanish_vocab_client_id ON spanish_vocab(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_spanish_vocab_next_review ON spanish_vocab(client_id, next_review_at)`,
  `ALTER TABLE spanish_vocab ADD COLUMN IF NOT EXISTS easiness_factor NUMERIC(4,2) DEFAULT 2.5`,
  `ALTER TABLE spanish_vocab ADD COLUMN IF NOT EXISTS interval_days NUMERIC DEFAULT 0`,
  `ALTER TABLE spanish_vocab ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0`,
  `ALTER TABLE client_users ADD COLUMN IF NOT EXISTS spanish_streak_current INTEGER DEFAULT 0`,
  `ALTER TABLE client_users ADD COLUMN IF NOT EXISTS spanish_streak_longest INTEGER DEFAULT 0`,
  `ALTER TABLE client_users ADD COLUMN IF NOT EXISTS spanish_last_review_date DATE`,
  `CREATE TABLE IF NOT EXISTS tutor_milestones (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, milestone_type)
  )`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (username) {
    const result = await db.query(
      'SELECT id FROM client_users WHERE username = $1 LIMIT 1',
      [username]
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }
  return 1;
}

// ─── Seed vocabulary ──────────────────────────────────────────────────────

const WORDS = [
  ['hello', 'hola', 'interjection', 'beginner', '¡Hola! ¿Cómo estás?'],
  ['goodbye', 'adiós', 'interjection', 'beginner', 'Adiós, nos vemos mañana.'],
  ['please', 'por favor', 'adverb', 'beginner', 'Ayúdame, por favor.'],
  ['thank you', 'gracias', 'interjection', 'beginner', 'Gracias por tu ayuda.'],
  ['yes', 'sí', 'adverb', 'beginner', 'Sí, quiero ir.'],
  ['no', 'no', 'adverb', 'beginner', 'No, gracias.'],
  ['water', 'agua', 'noun', 'beginner', 'Necesito un vaso de agua.'],
  ['house', 'casa', 'noun', 'beginner', 'Mi casa es grande.'],
  ['dog', 'perro', 'noun', 'beginner', 'El perro corre en el parque.'],
  ['cat', 'gato', 'noun', 'beginner', 'El gato duerme todo el día.'],
  ['friend', 'amigo', 'noun', 'beginner', 'Él es mi mejor amigo.'],
  ['family', 'familia', 'noun', 'beginner', 'Mi familia vive en Madrid.'],
  ['food', 'comida', 'noun', 'beginner', 'La comida está deliciosa.'],
  ['day', 'día', 'noun', 'beginner', 'Hoy es un buen día.'],
  ['night', 'noche', 'noun', 'beginner', 'La noche es tranquila.'],
  ['today', 'hoy', 'adverb', 'beginner', 'Hoy voy al trabajo.'],
  ['tomorrow', 'mañana', 'adverb', 'beginner', 'Mañana viajo a Chile.'],
  ['yesterday', 'ayer', 'adverb', 'beginner', 'Ayer llovió mucho.'],
  ['good', 'bueno', 'adjective', 'beginner', 'Este libro es muy bueno.'],
  ['bad', 'malo', 'adjective', 'beginner', 'El clima está malo hoy.'],
  ['book', 'libro', 'noun', 'beginner', 'Leo un libro nuevo.'],
  ['school', 'escuela', 'noun', 'beginner', 'Los niños van a la escuela.'],
  ['name', 'nombre', 'noun', 'beginner', '¿Cuál es tu nombre?'],
  ['year', 'año', 'noun', 'beginner', 'Este año viajaré mucho.'],
  ['week', 'semana', 'noun', 'beginner', 'Trabajo cinco días a la semana.'],
  ['month', 'mes', 'noun', 'beginner', 'El mes que viene es diciembre.'],
  ['red', 'rojo', 'adjective', 'beginner', 'El coche es rojo.'],
  ['blue', 'azul', 'adjective', 'beginner', 'El cielo es azul.'],
  ['green', 'verde', 'adjective', 'beginner', 'La hierba es verde.'],
  ['white', 'blanco', 'adjective', 'beginner', 'La nieve es blanca.'],
  ['black', 'negro', 'adjective', 'beginner', 'El gato es negro.'],
  ['big', 'grande', 'adjective', 'intermediate', 'Vivimos en una ciudad grande.'],
  ['small', 'pequeño', 'adjective', 'intermediate', 'Tengo un perro pequeño.'],
  ['happy', 'feliz', 'adjective', 'intermediate', 'Estoy muy feliz hoy.'],
  ['sad', 'triste', 'adjective', 'intermediate', 'Ella está triste por la noticia.'],
  ['work', 'trabajo', 'noun', 'intermediate', 'Tengo mucho trabajo esta semana.'],
  ['city', 'ciudad', 'noun', 'intermediate', 'Nueva York es una ciudad grande.'],
  ['country', 'país', 'noun', 'intermediate', 'España es un país hermoso.'],
  ['money', 'dinero', 'noun', 'advanced', 'Necesito ahorrar dinero.'],
  ['love', 'amor', 'noun', 'advanced', 'El amor es importante.'],
];

const VERBS = [
  { verb: 'hablar', difficulty: 'beginner', forms: [['yo', 'hablo', 'I speak'], ['tú', 'hablas', 'you speak'], ['él/ella', 'habla', 'he/she speaks'], ['nosotros', 'hablamos', 'we speak'], ['ellos', 'hablan', 'they speak']] },
  { verb: 'comer', difficulty: 'beginner', forms: [['yo', 'como', 'I eat'], ['tú', 'comes', 'you eat'], ['él/ella', 'come', 'he/she eats'], ['nosotros', 'comemos', 'we eat'], ['ellos', 'comen', 'they eat']] },
  { verb: 'vivir', difficulty: 'beginner', forms: [['yo', 'vivo', 'I live'], ['tú', 'vives', 'you live'], ['él/ella', 'vive', 'he/she lives'], ['nosotros', 'vivimos', 'we live'], ['ellos', 'viven', 'they live']] },
  { verb: 'ser', difficulty: 'beginner', forms: [['yo', 'soy', 'I am'], ['tú', 'eres', 'you are'], ['él/ella', 'es', 'he/she is'], ['nosotros', 'somos', 'we are'], ['ellos', 'son', 'they are']] },
  { verb: 'estar', difficulty: 'beginner', forms: [['yo', 'estoy', 'I am'], ['tú', 'estás', 'you are'], ['él/ella', 'está', 'he/she is'], ['nosotros', 'estamos', 'we are'], ['ellos', 'están', 'they are']] },
  { verb: 'tener', difficulty: 'intermediate', forms: [['yo', 'tengo', 'I have'], ['tú', 'tienes', 'you have'], ['él/ella', 'tiene', 'he/she has'], ['nosotros', 'tenemos', 'we have'], ['ellos', 'tienen', 'they have']] },
  { verb: 'ir', difficulty: 'intermediate', forms: [['yo', 'voy', 'I go'], ['tú', 'vas', 'you go'], ['él/ella', 'va', 'he/she goes'], ['nosotros', 'vamos', 'we go'], ['ellos', 'van', 'they go']] },
  { verb: 'hacer', difficulty: 'advanced', forms: [['yo', 'hago', 'I do/make'], ['tú', 'haces', 'you do/make'], ['él/ella', 'hace', 'he/she does/makes'], ['nosotros', 'hacemos', 'we do/make'], ['ellos', 'hacen', 'they do/make']] },
  { verb: 'querer', difficulty: 'advanced', forms: [['yo', 'quiero', 'I want'], ['tú', 'quieres', 'you want'], ['él/ella', 'quiere', 'he/she wants'], ['nosotros', 'queremos', 'we want'], ['ellos', 'quieren', 'they want']] },
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function ensureSeeded(db, clientId) {
  const countRes = await db.query('SELECT COUNT(*) FROM spanish_vocab WHERE client_id = $1', [clientId]);
  if (parseInt(countRes.rows[0].count, 10) > 0) return;

  const rows = [];
  for (const [front, back, pos, difficulty, example] of WORDS) {
    rows.push({ item_type: 'word', front, back, part_of_speech: pos, difficulty_level: difficulty, example_sentence: example, hint: null });
  }
  for (const { verb, difficulty, forms } of VERBS) {
    for (const [pronoun, conjugated, meaning] of forms) {
      rows.push({
        item_type: 'conjugation',
        front: `${verb} (${pronoun})`,
        back: conjugated,
        part_of_speech: 'verb',
        difficulty_level: difficulty,
        example_sentence: `${capitalize(pronoun)} ${conjugated}.`,
        hint: meaning,
      });
    }
  }

  for (const r of rows) {
    await db.query(
      `INSERT INTO spanish_vocab (client_id, item_type, front, back, part_of_speech, example_sentence, hint, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [clientId, r.item_type, r.front, r.back, r.part_of_speech, r.example_sentence, r.hint, r.difficulty_level]
    );
  }
}

// ─── Grading: Levenshtein edit distance -> SM-2 quality (0-5) ─────────────
// Typo-tolerant, deterministic, server-computed (never trust a client-
// asserted quality) so a missing accent or one-character slip doesn't grade
// the same as a wrong answer, but also doesn't get silently waved through.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function gradeAnswer(rawAnswer, rawCorrect) {
  const answer = (rawAnswer || '').trim().toLowerCase();
  const correct = (rawCorrect || '').trim().toLowerCase();
  if (!answer) return { quality: 0, wasCorrect: false };
  const dist = levenshtein(answer, correct);
  const ratio = dist / Math.max(answer.length, correct.length, 1);
  let quality;
  if (ratio === 0) quality = 5;
  else if (ratio <= 0.15) quality = 4;
  else if (ratio <= 0.35) quality = 3;
  else if (ratio <= 0.6) quality = 2;
  else quality = 1;
  return { quality, wasCorrect: quality >= 3 };
}

// ─── SM-2 spaced-repetition scheduling (SuperMemo 1987) ───────────────────
function sm2Step({ repetitions, interval, ef }, quality) {
  let nextRepetitions = repetitions;
  let nextInterval = interval;
  if (quality >= 3) {
    if (repetitions === 0) nextInterval = 1;
    else if (repetitions === 1) nextInterval = 6;
    else nextInterval = Math.round(interval * ef);
    nextRepetitions = repetitions + 1;
  } else {
    nextRepetitions = 0;
    nextInterval = 1;
  }
  const nextEf = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { repetitions: nextRepetitions, interval: nextInterval, ef: Number(nextEf.toFixed(2)) };
}

async function checkMilestones(db, clientId) {
  const unlocked = [];

  const userRes = await db.query('SELECT spanish_streak_current FROM client_users WHERE id = $1', [clientId]);
  const streak = userRes.rows[0]?.spanish_streak_current || 0;

  const wordCountRes = await db.query(
    `SELECT COUNT(*) FROM spanish_vocab WHERE client_id = $1 AND item_type = 'word' AND (correct_count + incorrect_count) > 0`,
    [clientId]
  );
  const conjCountRes = await db.query(
    `SELECT COUNT(*) FROM spanish_vocab WHERE client_id = $1 AND item_type = 'conjugation' AND (correct_count + incorrect_count) > 0`,
    [clientId]
  );
  const wordsReviewed = parseInt(wordCountRes.rows[0].count, 10);
  const conjReviewed = parseInt(conjCountRes.rows[0].count, 10);

  const candidates = [];
  if (streak >= 7) candidates.push('streak_7');
  if (streak >= 30) candidates.push('streak_30');
  if (wordsReviewed >= 100) candidates.push('words_100');
  if (conjReviewed >= 50) candidates.push('conjugations_50');

  for (const type of candidates) {
    const result = await db.query(
      `INSERT INTO tutor_milestones (client_id, milestone_type)
       VALUES ($1, $2) ON CONFLICT (client_id, milestone_type) DO NOTHING RETURNING *`,
      [clientId, type]
    );
    if (result.rows.length > 0) unlocked.push(result.rows[0]);
  }
  return unlocked;
}

async function bumpStreak(db, clientId) {
  const todayRes = await db.query('SELECT CURRENT_DATE AS today');
  const today = todayRes.rows[0].today;
  const userRes = await db.query(
    'SELECT spanish_streak_current, spanish_streak_longest, spanish_last_review_date FROM client_users WHERE id = $1',
    [clientId]
  );
  const u = userRes.rows[0];
  const lastDate = u.spanish_last_review_date;
  let current = u.spanish_streak_current || 0;
  const longest = u.spanish_streak_longest || 0;

  const sameDay = (a, b) => a && new Date(a).toDateString() === new Date(b).toDateString();
  if (sameDay(lastDate, today)) {
    // already logged today; no change
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    current = lastDate && sameDay(lastDate, yesterday) ? current + 1 : 1;
  }
  const newLongest = Math.max(longest, current);

  await db.query(
    `UPDATE client_users SET spanish_streak_current = $1, spanish_streak_longest = $2, spanish_last_review_date = $3 WHERE id = $4`,
    [current, newLongest, today, clientId]
  );
  return { current, longest: newLongest };
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET /vocab?difficulty=beginner&type=word
  router.get('/vocab', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await ensureSeeded(db, clientId);
      const { difficulty, type } = req.query;
      const params = [clientId];
      let query = 'SELECT * FROM spanish_vocab WHERE client_id = $1';
      if (difficulty && DIFFICULTIES.includes(difficulty)) {
        params.push(difficulty);
        query += ` AND difficulty_level = $${params.length}`;
      }
      if (type && ['word', 'conjugation'].includes(type)) {
        params.push(type);
        query += ` AND item_type = $${params.length}`;
      }
      query += ' ORDER BY id ASC';
      const result = await db.query(query, params);
      res.json({ vocab: result.rows });
    } catch (err) {
      console.error('Vocab fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch vocab' });
    }
  });

  // GET /vocab/due
  router.get('/vocab/due', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await ensureSeeded(db, clientId);
      const { difficulty } = req.query;
      const params = [clientId];
      let query = 'SELECT * FROM spanish_vocab WHERE client_id = $1 AND next_review_at <= NOW()';
      if (difficulty && DIFFICULTIES.includes(difficulty)) {
        params.push(difficulty);
        query += ` AND difficulty_level = $${params.length}`;
      }
      query += ' ORDER BY next_review_at ASC';
      const result = await db.query(query, params);
      res.json({ vocab: result.rows });
    } catch (err) {
      console.error('Vocab due fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch due vocab' });
    }
  });

  // POST /vocab -> add custom word/conjugation
  router.post('/vocab', auth, async (req, res) => {
    const { front, back, hint, part_of_speech, example_sentence, item_type, difficulty_level } = req.body;
    if (!front || !back) return res.status(400).json({ error: 'front and back are required' });
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO spanish_vocab (client_id, item_type, front, back, part_of_speech, example_sentence, hint, difficulty_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          clientId,
          ['word', 'conjugation'].includes(item_type) ? item_type : 'word',
          front.trim(),
          back.trim(),
          part_of_speech || null,
          example_sentence || null,
          hint || null,
          DIFFICULTIES.includes(difficulty_level) ? difficulty_level : 'beginner',
        ]
      );
      res.status(201).json({ item: result.rows[0] });
    } catch (err) {
      console.error('Vocab create error:', err.message);
      res.status(500).json({ error: 'Failed to add vocab item' });
    }
  });

  router.delete('/vocab/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'DELETE FROM spanish_vocab WHERE id = $1 AND client_id = $2 RETURNING id',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Vocab delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete vocab item' });
    }
  });

  // POST /vocab/:id/review { answer: string }
  // Server looks up the correct answer itself and grades it — the client
  // never asserts its own quality/correctness, it only supplies raw input.
  router.post('/vocab/:id/review', auth, async (req, res) => {
    const { answer } = req.body;
    if (typeof answer !== 'string') return res.status(400).json({ error: 'answer is required' });
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query(
        'SELECT * FROM spanish_vocab WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const item = existing.rows[0];

      const { quality, wasCorrect } = gradeAnswer(answer, item.back);
      const sm2 = sm2Step(
        { repetitions: item.repetitions || 0, interval: Number(item.interval_days) || 0, ef: Number(item.easiness_factor) || 2.5 },
        quality
      );
      const box = Math.max(1, Math.min(sm2.repetitions, 5));

      const result = await db.query(
        `UPDATE spanish_vocab SET
          box               = $1,
          repetitions       = $2,
          interval_days     = $3,
          easiness_factor   = $4,
          correct_count     = correct_count + $5,
          incorrect_count   = incorrect_count + $6,
          last_reviewed_at  = NOW(),
          next_review_at    = NOW() + ($7 || ' days')::interval,
          updated_at        = NOW()
         WHERE id = $8 RETURNING *`,
        [box, sm2.repetitions, sm2.interval, sm2.ef, wasCorrect ? 1 : 0, wasCorrect ? 0 : 1, sm2.interval, req.params.id]
      );

      const streak = await bumpStreak(db, clientId);
      const newMilestones = await checkMilestones(db, clientId);

      res.json({
        item: result.rows[0],
        quality,
        wasCorrect,
        correctAnswer: item.back,
        streak,
        newMilestones,
      });
    } catch (err) {
      console.error('Vocab review error:', err.message);
      res.status(500).json({ error: 'Failed to record review' });
    }
  });

  // GET /immersion?difficulty=beginner -> random word for rapid-fire mode
  router.get('/immersion', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await ensureSeeded(db, clientId);
      const { difficulty } = req.query;
      const params = [clientId];
      let query = `SELECT * FROM spanish_vocab WHERE client_id = $1 AND item_type = 'word'`;
      if (difficulty && DIFFICULTIES.includes(difficulty)) {
        params.push(difficulty);
        query += ` AND difficulty_level = $${params.length}`;
      }
      query += ' ORDER BY RANDOM() LIMIT 1';
      const result = await db.query(query, params);
      if (result.rows.length === 0) return res.status(404).json({ error: 'No vocab available' });
      res.json({ item: result.rows[0] });
    } catch (err) {
      console.error('Immersion fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch immersion word' });
    }
  });

  // GET /streaks
  router.get('/streaks', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT spanish_streak_current, spanish_streak_longest, spanish_last_review_date FROM client_users WHERE id = $1',
        [clientId]
      );
      const u = result.rows[0] || {};
      res.json({
        current: u.spanish_streak_current || 0,
        longest: u.spanish_streak_longest || 0,
        lastReviewDate: u.spanish_last_review_date || null,
      });
    } catch (err) {
      console.error('Streaks fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch streaks' });
    }
  });

  // GET /milestones
  router.get('/milestones', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM tutor_milestones WHERE client_id = $1 ORDER BY unlocked_at DESC',
        [clientId]
      );
      res.json({ milestones: result.rows });
    } catch (err) {
      console.error('Milestones fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  });

  // POST /conjugations -> random verb drill (all pronoun forms for one verb)
  router.post('/conjugations', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await ensureSeeded(db, clientId);
      const { difficulty } = req.body || {};
      const params = [clientId];
      let query = `SELECT DISTINCT split_part(front, ' (', 1) AS verb FROM spanish_vocab WHERE client_id = $1 AND item_type = 'conjugation'`;
      if (difficulty && DIFFICULTIES.includes(difficulty)) {
        params.push(difficulty);
        query += ` AND difficulty_level = $${params.length}`;
      }
      const verbsRes = await db.query(query, params);
      if (verbsRes.rows.length === 0) return res.status(404).json({ error: 'No conjugations available' });
      const verb = verbsRes.rows[Math.floor(Math.random() * verbsRes.rows.length)].verb;

      const formsRes = await db.query(
        `SELECT * FROM spanish_vocab WHERE client_id = $1 AND item_type = 'conjugation' AND front LIKE $2 ORDER BY id ASC`,
        [clientId, `${verb} (%`]
      );
      res.json({ verb, tense: 'present', forms: formsRes.rows });
    } catch (err) {
      console.error('Conjugation practice error:', err.message);
      res.status(500).json({ error: 'Failed to build conjugation practice' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations };
