'use strict';

const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Shelved'];
const VALID_RECOMMENDATIONS = ['Adopt', 'Experiment', 'Monitor', 'Reject'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS client_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS research_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    requested_by VARCHAR(255),
    date_requested DATE,
    evaluated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Not Started',
    executive_summary TEXT,
    definition TEXT,
    core_mechanics TEXT,
    pricing_cost_structure TEXT,
    use_case_1 TEXT,
    use_case_2 TEXT,
    current_vs_new_process TEXT,
    pros_strengths TEXT,
    cons_risks_limitations TEXT,
    recommendation VARCHAR(50),
    next_steps TEXT,
    converted_to_goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    flagged_for_deletion BOOLEAN DEFAULT FALSE,
    flagged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_research_client_id ON research_entries(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_research_flagged ON research_entries(flagged_for_deletion)`,
  `CREATE INDEX IF NOT EXISTS idx_research_status ON research_entries(status)`,
];

const UPDATABLE_FIELDS = [
  'topic_name', 'requested_by', 'date_requested', 'evaluated_by', 'status',
  'executive_summary', 'definition', 'core_mechanics', 'pricing_cost_structure',
  'use_case_1', 'use_case_2', 'current_vs_new_process', 'pros_strengths',
  'cons_risks_limitations', 'recommendation', 'next_steps',
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
  await db.query(`
    INSERT INTO client_users (username, password_hash)
    VALUES ('acme_client', '$2b$10$p8DMKQQiF.xfhKJqAzjFRe2U3Aif16SIvpXSGCMGKW3fymbcpM8.K')
    ON CONFLICT (username) DO NOTHING
  `);
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

async function getEntryForClient(db, id, clientId) {
  const result = await db.query(
    'SELECT * FROM research_entries WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return { status: 404 };
  const entry = result.rows[0];
  if (entry.client_id !== clientId) return { status: 403 };
  return { status: 200, entry };
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
        `SELECT * FROM research_entries
         WHERE client_id = $1
         ORDER BY created_at DESC`,
        [clientId]
      );
      res.json({ entries: result.rows });
    } catch (err) {
      console.error('Research list error:', err.message);
      res.status(500).json({ error: 'Failed to fetch research entries' });
    }
  });

  router.post('/', auth, async (req, res) => {
    const { topic_name, status } = req.body;
    if (!topic_name?.trim()) return res.status(400).json({ error: 'topic_name is required' });
    const st = VALID_STATUSES.includes(status) ? status : 'Not Started';
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO research_entries (client_id, topic_name, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [clientId, topic_name.trim(), st]
      );
      res.status(201).json({ entry: result.rows[0] });
    } catch (err) {
      console.error('Research create error:', err.message);
      res.status(500).json({ error: 'Failed to create research entry' });
    }
  });

  router.get('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const check = await getEntryForClient(db, req.params.id, clientId);
      if (check.status === 404) return res.status(404).json({ error: 'Research entry not found' });
      if (check.status === 403) return res.status(403).json({ error: 'Forbidden' });
      res.json({ entry: check.entry });
    } catch (err) {
      console.error('Research fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch research entry' });
    }
  });

  router.put('/:id', auth, async (req, res) => {
    const { topic_name, status } = req.body;
    if (topic_name !== undefined && !topic_name?.trim()) {
      return res.status(400).json({ error: 'topic_name cannot be empty' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (req.body.recommendation !== undefined &&
        req.body.recommendation !== null &&
        req.body.recommendation !== '' &&
        !VALID_RECOMMENDATIONS.includes(req.body.recommendation)) {
      return res.status(400).json({ error: 'Invalid recommendation' });
    }

    try {
      const clientId = await getClientId(db, req);
      const check = await getEntryForClient(db, req.params.id, clientId);
      if (check.status === 404) return res.status(404).json({ error: 'Research entry not found' });
      if (check.status === 403) return res.status(403).json({ error: 'Forbidden' });

      const sets = [];
      const vals = [];
      for (const field of UPDATABLE_FIELDS) {
        if (req.body[field] !== undefined) {
          vals.push(req.body[field] === '' ? null : req.body[field]);
          sets.push(`${field} = $${vals.length}`);
        }
      }
      if (sets.length === 0) return res.json({ entry: check.entry });

      vals.push(req.params.id);
      const result = await db.query(
        `UPDATE research_entries SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      res.json({ entry: result.rows[0] });
    } catch (err) {
      console.error('Research update error:', err.message);
      res.status(500).json({ error: 'Failed to update research entry' });
    }
  });

  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const check = await getEntryForClient(db, req.params.id, clientId);
      if (check.status === 404) return res.status(404).json({ error: 'Research entry not found' });
      if (check.status === 403) return res.status(403).json({ error: 'Forbidden' });

      await db.query(
        `UPDATE research_entries
         SET flagged_for_deletion = TRUE, flagged_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Research delete error:', err.message);
      res.status(500).json({ error: 'Failed to flag research entry' });
    }
  });

  router.post('/:id/convert-to-goal', auth, async (req, res) => {
    const { goal_id } = req.body;
    if (!goal_id) return res.status(400).json({ error: 'goal_id is required' });

    const client = await db.connect();
    try {
      const clientId = await getClientId(db, req);
      const check = await getEntryForClient(db, req.params.id, clientId);
      if (check.status === 404) return res.status(404).json({ error: 'Research entry not found' });
      if (check.status === 403) return res.status(403).json({ error: 'Forbidden' });

      const goalCheck = await client.query('SELECT id FROM goals WHERE id = $1', [goal_id]);
      if (goalCheck.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });

      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE research_entries
         SET converted_to_goal_id = $1,
             flagged_for_deletion = TRUE,
             flagged_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [goal_id, req.params.id]
      );
      await client.query('COMMIT');
      res.json({ entry: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Research convert error:', err.message);
      res.status(500).json({ error: 'Failed to convert research to goal' });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations };
