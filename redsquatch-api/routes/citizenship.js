'use strict';

// Canonical document definition — one entry per document TYPE. Each type expands to
// `copies` independent rows (one per physical/digital copy) since the UI tracks each
// copy's status separately (e.g. Copy 1 obtained, Copy 2 still pending scan).
const CITIZENSHIP_DOCUMENTS = [
  { docId: 'me-bc', title: 'Birth Certificate', category: 'me', copies: 2 },

  { docId: 'parent-bc', title: 'Parent Birth Certificate', category: 'parent', copies: 2 },
  { docId: 'parent-mc', title: 'Parent Marriage Certificate', category: 'parent', copies: 2 },

  { docId: 'mgp-bc', title: 'Maternal Grandparent Birth Certificate', category: 'maternal_gp', copies: 2 },
  { docId: 'mgp-dc', title: 'Maternal Grandparent Death Certificate', category: 'maternal_gp', copies: 2 },
  { docId: 'mgp-mc', title: 'Maternal Grandparent Marriage Certificate', category: 'maternal_gp', copies: 2 },

  { docId: 'pgp-bc', title: 'Paternal Grandparent Birth Certificate', category: 'paternal_gp', copies: 2 },
  { docId: 'pgp-dc', title: 'Paternal Grandparent Death Certificate', category: 'paternal_gp', copies: 2 },
  { docId: 'pgp-mc', title: 'Paternal Grandparent Marriage Certificate', category: 'paternal_gp', copies: 2 },

  { docId: 'ggp-bc', title: 'Great-Grandparent Birth Certificate', category: 'great_gp', copies: 2 },
  { docId: 'ggp-dc', title: 'Great-Grandparent Death Certificate', category: 'great_gp', copies: 2 },
  { docId: 'ggp-mc', title: 'Great-Grandparent Marriage Certificate', category: 'great_gp', copies: 2 },

  { docId: 'apos-us-my-bc', title: 'US Birth Certificate Apostille (My copy)', category: 'apostilles', copies: 1 },
  { docId: 'apos-us-other', title: 'US Document Apostille (Other)', category: 'apostilles', copies: 1 },
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS citizenship_documents (
    id                SERIAL PRIMARY KEY,
    client_id         INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    doc_id            VARCHAR(50) NOT NULL,
    copy_number       INTEGER NOT NULL DEFAULT 1,
    title             VARCHAR(255) NOT NULL,
    category          VARCHAR(50) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'not_started',
    storage_location  VARCHAR(500),
    scan_url          VARCHAR(500),
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, doc_id, copy_number)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_citizenship_documents_client_id ON citizenship_documents(client_id)`,
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

// Ensures the 26 canonical copy-rows exist for this client (idempotent — INSERT
// only fires for rows that don't already exist via ON CONFLICT DO NOTHING), so a
// first-time visitor gets the full checklist without a separate setup step.
async function seedForClient(db, clientId) {
  for (const doc of CITIZENSHIP_DOCUMENTS) {
    for (let copyNumber = 1; copyNumber <= doc.copies; copyNumber++) {
      await db.query(
        `INSERT INTO citizenship_documents (client_id, doc_id, copy_number, title, category)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id, doc_id, copy_number) DO NOTHING`,
        [clientId, doc.docId, copyNumber, doc.title, doc.category]
      );
    }
  }
}

const VALID_STATUSES = ['not_started', 'pending_scan', 'obtained', 'archived'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full checklist, seeding the canonical rows on first visit
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedForClient(db, clientId);
      const result = await db.query(
        `SELECT * FROM citizenship_documents WHERE client_id = $1
         ORDER BY category, doc_id, copy_number`,
        [clientId]
      );
      res.json({ documents: result.rows });
    } catch (err) {
      console.error('Citizenship fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch citizenship documents' });
    }
  });

  // PUT /:id — body: { status?, storage_location?, scan_url?, notes? }
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { status, storage_location, scan_url, notes } = req.body || {};
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }

      const cols = [];
      const values = [];
      if (status !== undefined) { values.push(status); cols.push(`status = $${values.length}`); }
      if (storage_location !== undefined) { values.push(storage_location); cols.push(`storage_location = $${values.length}`); }
      if (scan_url !== undefined) { values.push(scan_url); cols.push(`scan_url = $${values.length}`); }
      if (notes !== undefined) { values.push(notes); cols.push(`notes = $${values.length}`); }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id, clientId);
      const result = await db.query(
        `UPDATE citizenship_documents SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND client_id = $${values.length}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Citizenship update error:', err.message);
      res.status(500).json({ error: 'Failed to update citizenship document' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
