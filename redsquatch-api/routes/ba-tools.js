'use strict';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ba_tool_progress (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    game_key        VARCHAR(50) NOT NULL,
    score           INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    best_streak     INTEGER NOT NULL DEFAULT 0,
    rounds_played   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, game_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ba_tool_progress_client_id ON ba_tool_progress(client_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

const VALID_GAME_KEYS = ['user-story', 'acceptance-criteria', 'elicitation-technique', 'moscow-prioritization'];

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (username) {
    const result = await db.query('SELECT id FROM client_users WHERE username = $1 LIMIT 1', [username]);
    if (result.rows.length > 0) return result.rows[0].id;
  }
  return 1;
}

async function ensureRow(db, clientId, gameKey) {
  await db.query(
    `INSERT INTO ba_tool_progress (client_id, game_key) VALUES ($1, $2)
     ON CONFLICT (client_id, game_key) DO NOTHING`,
    [clientId, gameKey]
  );
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET /:gameKey — fetch progress row, creating it (zeroed) on first visit
  router.get('/:gameKey', auth, async (req, res) => {
    try {
      const { gameKey } = req.params;
      if (!VALID_GAME_KEYS.includes(gameKey)) {
        return res.status(400).json({ error: `gameKey must be one of ${VALID_GAME_KEYS.join(', ')}` });
      }
      const clientId = await getClientId(db, req);
      await ensureRow(db, clientId, gameKey);
      const result = await db.query(
        `SELECT * FROM ba_tool_progress WHERE client_id = $1 AND game_key = $2`,
        [clientId, gameKey]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('BA tools fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  // PUT /:gameKey — body: { correct: boolean } — server owns the scoring math
  // so a client bug (or a curious user in devtools) can't fabricate a streak.
  router.put('/:gameKey', auth, async (req, res) => {
    try {
      const { gameKey } = req.params;
      if (!VALID_GAME_KEYS.includes(gameKey)) {
        return res.status(400).json({ error: `gameKey must be one of ${VALID_GAME_KEYS.join(', ')}` });
      }
      const { correct } = req.body || {};
      if (typeof correct !== 'boolean') {
        return res.status(400).json({ error: 'correct must be a boolean' });
      }
      const clientId = await getClientId(db, req);
      await ensureRow(db, clientId, gameKey);
      const result = await db.query(
        `UPDATE ba_tool_progress SET
           score = score + CASE WHEN $3 THEN 1 ELSE 0 END,
           current_streak = CASE WHEN $3 THEN current_streak + 1 ELSE 0 END,
           best_streak = GREATEST(best_streak, CASE WHEN $3 THEN current_streak + 1 ELSE best_streak END),
           rounds_played = rounds_played + 1,
           updated_at = NOW()
         WHERE client_id = $1 AND game_key = $2
         RETURNING *`,
        [clientId, gameKey, correct]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('BA tools update error:', err.message);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
