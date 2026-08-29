'use strict';

// Canonical checklist for the ServiceNow Certified Application Developer (CAD)
// path — source: learning-paths.pdf (ServiceNow University, Aug 2026 edition),
// "Developer" section, the Certified Application Developer branch specifically
// (Welcome to ServiceNow -> Scripting Fundamentals -> Application Development
// Fundamentals -> CAD exam -> ongoing Delta testing), plus the PDF's own
// "Additional recommendations for Application Developer paths" list as an
// optional stage. Darryl already holds CSA, so Stage 0 is pre-seeded complete.
//
// `stageOrder` groups items into the horizontal stage bar on the frontend.
// `defaultStatus` seeds items that are already done as 'completed' on first visit.
const SNOW_CAREER_ITEMS = [
  // Stage 0 — Foundation (already complete)
  { itemId: 'welcome-to-snow', title: 'Welcome to ServiceNow', stage: 0, stageLabel: 'Foundation', description: 'Free on-demand orientation course.', defaultStatus: 'completed' },
  { itemId: 'csa', title: 'Certified System Administrator (CSA)', stage: 0, stageLabel: 'Foundation', description: 'Already held — not required for CAD, but the natural prerequisite experience.', defaultStatus: 'completed' },

  // Stage 1 — Core developer skills (the CAD branch itself)
  { itemId: 'scripting-fundamentals', title: 'Scripting in ServiceNow Fundamentals', stage: 1, stageLabel: 'Core Developer Skills', description: 'Free on-demand, 3-day ILT option.' },
  { itemId: 'app-dev-fundamentals', title: 'Application Development Fundamentals', stage: 1, stageLabel: 'Core Developer Skills', description: 'Free on-demand, 3-day ILT option.' },

  // Stage 2 — The certification itself
  { itemId: 'cad-exam', title: 'Certified Application Developer (CAD)', stage: 2, stageLabel: 'Certification', description: 'The exam/credential this whole path is building toward.' },

  // Stage 3 — Optional breadth, per the PDF's "Additional recommendations for
  // Application Developer paths" — not required for CAD, but rounds out the skillset.
  { itemId: 'atf-essentials', title: 'Automated Test Framework (ATF) Essentials', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'flow-designer-fundamentals', title: 'Flow Designer Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'integration-hub-fundamentals', title: 'Integration Hub Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'cmdb-fundamentals', title: 'Configuration Management Database (CMDB) Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand, 3-day ILT option.' },
  { itemId: 'csdm-fundamentals', title: 'Common Service Data Model (CSDM) Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'platform-analytics-overview', title: 'Platform Analytics Overview', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'rpa-essentials', title: 'Robotic Process Automation (RPA) Essentials', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'service-portal-fundamentals', title: 'Service Portal Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand, 2-day ILT option.' },
  { itemId: 'service-portal-advanced', title: 'Service Portal Advanced', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'source-control-fundamentals', title: 'Source Control Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },
  { itemId: 'ui-builder-fundamentals', title: 'UI Builder Fundamentals', stage: 3, stageLabel: 'Recommended Breadth', description: 'Free on-demand.' },

  // Stage 4 — Maintaining the credential
  { itemId: 'delta-testing', title: 'Ongoing Delta testing', stage: 4, stageLabel: 'Maintain Certification', description: 'Required periodically to keep CAD current as the platform releases new versions.' },
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS snow_career_items (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    item_id       VARCHAR(50) NOT NULL,
    stage         INTEGER NOT NULL,
    stage_label   VARCHAR(100) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'not_started',
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, item_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_snow_career_items_client_id ON snow_career_items(client_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
  // Keep stage/label/title/description in sync with the canonical list above so
  // edits here (renaming a stage, tweaking copy) don't require a manual DB fix —
  // only status/notes are left alone since those are the user's own progress.
  for (const item of SNOW_CAREER_ITEMS) {
    await db.query(
      `UPDATE snow_career_items SET stage = $1, stage_label = $2, title = $3, description = $4
       WHERE item_id = $5`,
      [item.stage, item.stageLabel, item.title, item.description, item.itemId]
    );
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

// Idempotent — INSERT only fires for item_ids that don't already exist for this
// client, so a first-time visitor gets the full pathway pre-seeded (with Stage 0
// pre-checked as completed) without a separate setup step.
async function seedForClient(db, clientId) {
  for (const item of SNOW_CAREER_ITEMS) {
    await db.query(
      `INSERT INTO snow_career_items (client_id, item_id, stage, stage_label, title, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id, item_id) DO NOTHING`,
      [clientId, item.itemId, item.stage, item.stageLabel, item.title, item.description, item.defaultStatus || 'not_started']
    );
  }
}

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full pathway, seeding the canonical items on first visit
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedForClient(db, clientId);
      const result = await db.query(
        `SELECT * FROM snow_career_items WHERE client_id = $1 ORDER BY stage, id`,
        [clientId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('SNOW career fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch ServiceNow career pathway' });
    }
  });

  // PUT /:id — body: { status?, notes? }
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { status, notes } = req.body || {};
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }

      const cols = [];
      const values = [];
      if (status !== undefined) { values.push(status); cols.push(`status = $${values.length}`); }
      if (notes !== undefined) { values.push(notes); cols.push(`notes = $${values.length}`); }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id, clientId);
      const result = await db.query(
        `UPDATE snow_career_items SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND client_id = $${values.length}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('SNOW career update error:', err.message);
      res.status(500).json({ error: 'Failed to update ServiceNow career item' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
