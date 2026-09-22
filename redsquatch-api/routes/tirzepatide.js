'use strict';

// Personal research tracker for comparing compounded tirzepatide pharmacies.
// No seed data — every row is one the user has actually looked into, so
// unlike citizenship.js/fan-tracker.js this has no canonical starter list.

const VALID_STATUSES = ['researching', 'contacted', 'ordered', 'rejected'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tirzepatide_compounders (
    id                            SERIAL PRIMARY KEY,
    client_id                     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name                          VARCHAR(255) NOT NULL,
    website_url                   VARCHAR(500),
    vial_size_mg                  NUMERIC(10,2),
    price_usd                     NUMERIC(10,2),
    subscription_price_usd        NUMERIC(10,2),
    subscription_interval         VARCHAR(20),
    shipping_cost_usd             NUMERIC(10,2),
    free_shipping_threshold_usd   NUMERIC(10,2),
    telehealth_required           BOOLEAN NOT NULL DEFAULT FALSE,
    telehealth_cost_usd           NUMERIC(10,2),
    labs_required                 BOOLEAN NOT NULL DEFAULT FALSE,
    status                        VARCHAR(20) NOT NULL DEFAULT 'researching',
    notes                         TEXT,
    last_checked_at               TIMESTAMP,
    created_at                    TIMESTAMP DEFAULT NOW(),
    updated_at                    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tirzepatide_compounders_client_id ON tirzepatide_compounders(client_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (username) {
    const result = await db.query('SELECT id FROM client_users WHERE username = $1 LIMIT 1', [username]);
    if (result.rows.length > 0) return result.rows[0].id;
  }
  return 1;
}

const NUMERIC_FIELDS = [
  'vial_size_mg', 'price_usd', 'subscription_price_usd', 'shipping_cost_usd',
  'free_shipping_threshold_usd', 'telehealth_cost_usd',
];
const BOOLEAN_FIELDS = ['telehealth_required', 'labs_required'];
const TEXT_FIELDS = ['website_url', 'subscription_interval', 'notes', 'last_checked_at'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full list for this client
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM tirzepatide_compounders WHERE client_id = $1 ORDER BY created_at, id`,
        [clientId]
      );
      res.json({ compounders: result.rows });
    } catch (err) {
      console.error('Tirzepatide compounders fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch compounders' });
    }
  });

  // POST / — body: { name, ...any of NUMERIC_FIELDS/BOOLEAN_FIELDS/TEXT_FIELDS, status? }
  router.post('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, status } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }

      const cols = ['client_id', 'name'];
      const placeholders = ['$1', '$2'];
      const values = [clientId, String(name).trim()];

      for (const field of [...NUMERIC_FIELDS, ...BOOLEAN_FIELDS, ...TEXT_FIELDS, 'status']) {
        if (req.body?.[field] === undefined) continue;
        values.push(req.body[field]);
        cols.push(field);
        placeholders.push(`$${values.length}`);
      }

      const result = await db.query(
        `INSERT INTO tirzepatide_compounders (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Tirzepatide compounder create error:', err.message);
      res.status(500).json({ error: 'Failed to add compounder' });
    }
  });

  // PUT /:id — body: any subset of the same fields
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { status } = req.body || {};
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }

      const cols = [];
      const values = [];
      for (const field of ['name', ...NUMERIC_FIELDS, ...BOOLEAN_FIELDS, ...TEXT_FIELDS, 'status']) {
        if (req.body?.[field] === undefined) continue;
        values.push(req.body[field]);
        cols.push(`${field} = $${values.length}`);
      }
      if (cols.length === 0) return res.status(400).json({ error: 'No fields to update' });

      values.push(req.params.id, clientId);
      const result = await db.query(
        `UPDATE tirzepatide_compounders SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND client_id = $${values.length}
         RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Compounder not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Tirzepatide compounder update error:', err.message);
      res.status(500).json({ error: 'Failed to update compounder' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM tirzepatide_compounders WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Compounder not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Tirzepatide compounder delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete compounder' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
