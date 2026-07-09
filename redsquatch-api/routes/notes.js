'use strict';

// Multi-tab notes storage (supersedes the old single-row quick_notes route).
const SCHEMA_STATEMENTS = [
  `ALTER TABLE quick_notes DROP CONSTRAINT IF EXISTS quick_notes_client_id_key`,
  `ALTER TABLE quick_notes ADD COLUMN IF NOT EXISTS title VARCHAR(100) DEFAULT 'Untitled'`,
  `CREATE INDEX IF NOT EXISTS idx_quick_notes_client_id ON quick_notes(client_id)`,
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

  // GET / — all notes/tabs for the current user
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT id, title, language, content, created_at, updated_at
         FROM quick_notes WHERE client_id = $1 ORDER BY id ASC`,
        [clientId]
      );
      res.json({ notes: result.rows });
    } catch (err) {
      console.error('Notes fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  // GET /:id — single note (tab content)
  router.get('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM quick_notes WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
      res.json({ note: result.rows[0] });
    } catch (err) {
      console.error('Note fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  // POST / — create new tab/note
  router.post('/', auth, async (req, res) => {
    const { title, content, language } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO quick_notes (client_id, title, content, language)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, title?.trim() || 'Untitled', content ?? '', language || 'plaintext']
      );
      res.status(201).json({ note: result.rows[0] });
    } catch (err) {
      console.error('Note create error:', err.message);
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  // PUT /:id — update note (content, language, title)
  router.put('/:id', auth, async (req, res) => {
    const { title, content, language } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query(
        'SELECT * FROM quick_notes WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
      const n = existing.rows[0];
      const result = await db.query(
        `UPDATE quick_notes SET
          title      = $1,
          content    = $2,
          language   = $3,
          updated_at = NOW()
         WHERE id = $4 AND client_id = $5 RETURNING *`,
        [
          title !== undefined ? (title?.trim() || 'Untitled') : n.title,
          content !== undefined ? content : n.content,
          language || n.language,
          req.params.id,
          clientId,
        ]
      );
      res.json({ note: result.rows[0] });
    } catch (err) {
      console.error('Note update error:', err.message);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'DELETE FROM quick_notes WHERE id = $1 AND client_id = $2 RETURNING id',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Note delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations, getClientId };
