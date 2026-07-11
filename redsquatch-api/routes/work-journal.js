'use strict';

// Work Journal — per-work-item session log, taggable into work groups via
// work_group_contents (content_type = 'journal_entry').
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS work_journal (
    id              SERIAL PRIMARY KEY,
    work_item_id    INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    session_start   TIME,
    session_end     TIME,
    why             TEXT,
    what            TEXT,
    how             TEXT,
    session_status  VARCHAR(20) NOT NULL DEFAULT 'Starting',
    blockers        TEXT,
    next            TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_journal_item ON work_journal(work_item_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET /work-items/:id/journal — entries for a work item, most recent first
  router.get('/work-items/:id/journal', auth, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM work_journal WHERE work_item_id = $1 ORDER BY session_date DESC, created_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Journal fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // POST /work-items/:id/journal — create an entry
  router.post('/work-items/:id/journal', auth, async (req, res) => {
    try {
      const { session_date, session_start, session_end, why, what, how, session_status, blockers, next } = req.body || {};
      const result = await db.query(
        `INSERT INTO work_journal
           (work_item_id, session_date, session_start, session_end, why, what, how, session_status, blockers, next)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, COALESCE($8, 'Starting'), $9, $10)
         RETURNING *`,
        [req.params.id, session_date || null, session_start || null, session_end || null,
         why || null, what || null, how || null, session_status || null, blockers || null, next || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Journal create error:', err.message);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // PUT /journal/:journal_id — update an entry
  router.put('/journal/:journal_id', auth, async (req, res) => {
    try {
      const fields = [
        'session_date', 'session_start', 'session_end', 'why', 'what',
        'how', 'session_status', 'blockers', 'next',
      ];
      const cols = [];
      const values = [];
      for (const f of fields) {
        if (req.body?.[f] !== undefined) {
          values.push(req.body[f]);
          cols.push(`${f} = $${values.length}`);
        }
      }
      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      values.push(req.params.journal_id);
      const result = await db.query(
        `UPDATE work_journal SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Journal update error:', err.message);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  // PUT /journal/:journal_id/add-to-group — body: { group_id }
  router.put('/journal/:journal_id/add-to-group', auth, async (req, res) => {
    try {
      const { group_id } = req.body || {};
      if (!group_id) return res.status(400).json({ error: 'group_id is required' });

      const journal = await db.query('SELECT id FROM work_journal WHERE id = $1', [req.params.journal_id]);
      if (journal.rows.length === 0) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      await db.query(
        `INSERT INTO work_group_contents (group_id, content_type, content_id) VALUES ($1, 'journal_entry', $2)`,
        [group_id, req.params.journal_id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Journal add-to-group error:', err.message);
      res.status(500).json({ error: 'Failed to add journal entry to group' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
