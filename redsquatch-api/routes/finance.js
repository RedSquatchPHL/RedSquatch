'use strict';

const DEFAULT_CATEGORIES = [
  'Income', 'Commission', 'Expenses', 'Lodging', 'Mileage', 'Travel',
  'Software', 'Marketing', 'Office', '1099', 'Tax Document',
  'Receipt', 'Invoice', 'Other',
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS finance_entries (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    person       VARCHAR(20) NOT NULL DEFAULT 'me',
    title        VARCHAR(255) NOT NULL,
    category     VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
    notes        TEXT,
    amount       NUMERIC(12,2),
    entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_entries_client_person
     ON finance_entries(client_id, person)`,
  `CREATE TABLE IF NOT EXISTS finance_categories (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    person       VARCHAR(20) NOT NULL,
    name         VARCHAR(100) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, person, name)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_categories_client_person
     ON finance_categories(client_id, person)`,
  // Additive migrations — safe to re-run
  `ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS end_date DATE`,
];

async function runMigrations(db) {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.query(stmt);
  }
}

function makeRouter(db) {
  const { Router } = require('express');
  const router = Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  async function getClientId(db, username) {
    const r = await db.query('SELECT id FROM client_users WHERE username = $1', [username]);
    return r.rows[0]?.id ?? null;
  }

  // Seed defaults for a person if they have no categories yet
  async function ensureCategories(clientId, person) {
    const { rows } = await db.query(
      'SELECT id FROM finance_categories WHERE client_id = $1 AND person = $2 LIMIT 1',
      [clientId, person]
    );
    if (rows.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await db.query(
          'INSERT INTO finance_categories (client_id, person, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [clientId, person, name]
        );
      }
    }
  }

  // ── Entries ──────────────────────────────────────────────────────────────

  // GET /api/client/finance?person=me
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const person = req.query.person || 'me';
      const { rows } = await db.query(
        `SELECT * FROM finance_entries
          WHERE client_id = $1 AND person = $2
          ORDER BY entry_date DESC, created_at DESC`,
        [clientId, person]
      );
      res.json({ entries: rows });
    } catch (err) {
      console.error('[finance GET /]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/client/finance
  router.post('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const { person = 'me', title, category = 'Uncategorized', notes, amount, entry_date, end_date } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
      const { rows } = await db.query(
        `INSERT INTO finance_entries (client_id, person, title, category, notes, amount, entry_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [clientId, person, title.trim(), (category || 'Uncategorized').trim(), notes || null, amount || null, entry_date || new Date().toISOString().slice(0, 10), end_date || null]
      );
      res.status(201).json({ entry: rows[0] });
    } catch (err) {
      console.error('[finance POST /]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/client/finance/:id
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const { title, category, notes, amount, entry_date, end_date } = req.body;
      const fields = [], values = [];
      let i = 1;
      if (title      !== undefined) { fields.push(`title = $${i++}`);      values.push(title.trim()); }
      if (category   !== undefined) { fields.push(`category = $${i++}`);   values.push((category || 'Uncategorized').trim()); }
      if (notes      !== undefined) { fields.push(`notes = $${i++}`);      values.push(notes || null); }
      if (amount     !== undefined) { fields.push(`amount = $${i++}`);     values.push(amount || null); }
      if (entry_date !== undefined) { fields.push(`entry_date = $${i++}`); values.push(entry_date); }
      if (end_date   !== undefined) { fields.push(`end_date = $${i++}`);   values.push(end_date || null); }
      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
      fields.push(`updated_at = NOW()`);
      values.push(req.params.id, clientId);
      const { rows } = await db.query(
        `UPDATE finance_entries SET ${fields.join(', ')}
          WHERE id = $${i++} AND client_id = $${i} RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
      res.json({ entry: rows[0] });
    } catch (err) {
      console.error('[finance PUT /:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/client/finance/:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const { rowCount } = await db.query(
        'DELETE FROM finance_entries WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Entry not found' });
      res.json({ deleted: true });
    } catch (err) {
      console.error('[finance DELETE /:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Categories ───────────────────────────────────────────────────────────

  // GET /api/client/finance/categories?person=me
  router.get('/categories', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const person = req.query.person || 'me';
      await ensureCategories(clientId, person);
      const { rows } = await db.query(
        'SELECT id, name FROM finance_categories WHERE client_id = $1 AND person = $2 ORDER BY name',
        [clientId, person]
      );
      res.json({ categories: rows });
    } catch (err) {
      console.error('[finance GET /categories]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/client/finance/categories
  router.post('/categories', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const { person = 'me', name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
      const { rows } = await db.query(
        `INSERT INTO finance_categories (client_id, person, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (client_id, person, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [clientId, person, name.trim()]
      );
      res.status(201).json({ category: rows[0] });
    } catch (err) {
      console.error('[finance POST /categories]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/client/finance/categories/:id
  router.delete('/categories/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req.session.user.username);
      if (!clientId) return res.status(404).json({ error: 'Client not found' });
      const { rowCount } = await db.query(
        'DELETE FROM finance_categories WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Category not found' });
      res.json({ deleted: true });
    } catch (err) {
      console.error('[finance DELETE /categories/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
