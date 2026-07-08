'use strict';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS quick_notes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL UNIQUE REFERENCES client_users(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    language VARCHAR(50) DEFAULT 'javascript',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM quick_notes WHERE client_id = $1',
        [clientId]
      );
      res.json({ note: result.rows[0] || null });
    } catch (err) {
      console.error('Quick notes fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch quick note' });
    }
  });

  router.put('/', auth, async (req, res) => {
    const { content, language } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO quick_notes (client_id, content, language)
         VALUES ($1, $2, COALESCE($3, 'javascript'))
         ON CONFLICT (client_id) DO UPDATE
           SET content = EXCLUDED.content,
               language = EXCLUDED.language,
               updated_at = NOW()
         RETURNING *`,
        [clientId, content ?? '', language || null]
      );
      res.json({ note: result.rows[0] });
    } catch (err) {
      console.error('Quick notes save error:', err.message);
      res.status(500).json({ error: 'Failed to save quick note' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations };
