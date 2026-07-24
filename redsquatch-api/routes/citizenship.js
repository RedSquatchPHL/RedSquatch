'use strict';

// Canonical document definition — one entry per document TYPE. Each type expands to
// `copies` independent rows (one per physical/digital copy) since the UI tracks each
// copy's status separately (e.g. Copy 1 obtained, Copy 2 still pending scan).
//
// Structure follows the actual lineage chain for the citizenship claim:
//   1. me_mother          — the first linkage: Darryl's own BC, then his mother's
//                           BC and marriage certificate(s).
//   2. maternal_grandmother — Carolyn N. Gomez's BC and DC.
//   3. maternal_ggp       — Carolyn's parents, Benito & Virginia Gomez (BC/DC each).
//   4. paternal_grandfather — just his BC; born in Mexico so the paper trail is
//                           shorter, but he's still living, which is why the
//                           Pedro Fan Tracker applet exists (locating/confirming
//                           records for a living relative is a different kind of
//                           search than archival grandparent records).
//   5. apostilles         — final notarization step, unchanged.
//
// `originalRetained: true` marks the only documents where Darryl keeps the
// physical original — everything else is scan-only (per his note that
// originals are only retained for his own vital records and the apostilles).
const CITIZENSHIP_DOCUMENTS = [
  { docId: 'me-bc', title: 'My Birth Certificate', category: 'me_mother', copies: 2, originalRetained: true },
  { docId: 'mother-bc', title: 'Mother’s Birth Certificate', category: 'me_mother', copies: 2 },
  { docId: 'mother-mc', title: 'Mother’s Marriage Certificate(s)', category: 'me_mother', copies: 2 },

  { docId: 'mgm-bc', title: 'Carolyn N. Gomez — Birth Certificate', category: 'maternal_grandmother', copies: 2 },
  { docId: 'mgm-dc', title: 'Carolyn N. Gomez — Death Certificate', category: 'maternal_grandmother', copies: 2 },

  { docId: 'benito-bc', title: 'Benito Gomez — Birth Certificate', category: 'maternal_ggp', copies: 2 },
  { docId: 'benito-dc', title: 'Benito Gomez — Death Certificate', category: 'maternal_ggp', copies: 2 },
  { docId: 'virginia-bc', title: 'Virginia Gomez — Birth Certificate', category: 'maternal_ggp', copies: 2 },
  { docId: 'virginia-dc', title: 'Virginia Gomez — Death Certificate', category: 'maternal_ggp', copies: 2 },

  { docId: 'pgf-bc', title: 'Paternal Grandfather — Birth Certificate (Mexico)', category: 'paternal_grandfather', copies: 2 },

  { docId: 'apos-us-my-bc', title: 'US Birth Certificate Apostille (My copy)', category: 'apostilles', copies: 1, originalRetained: true },
  { docId: 'apos-us-other', title: 'US Document Apostille (Other)', category: 'apostilles', copies: 1, originalRetained: true },
];

// Old doc_ids from the previous generic (me/parent/maternal_gp/paternal_gp/great_gp)
// structure. Confirmed on 2026-07-23 that every one of these rows was still
// `not_started` with no storage_location/scan_url/notes, so deleting them during
// migration loses nothing — it just clears out rows the new canonical list replaces.
const RETIRED_DOC_IDS = [
  'parent-bc', 'parent-mc',
  'mgp-bc', 'mgp-dc', 'mgp-mc',
  'pgp-bc', 'pgp-dc', 'pgp-mc',
  'ggp-bc', 'ggp-dc', 'ggp-mc',
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
  await db.query(
    `DELETE FROM citizenship_documents WHERE doc_id = ANY($1::text[])`,
    [RETIRED_DOC_IDS]
  );
  // Seeding only INSERTs missing rows (ON CONFLICT DO NOTHING), so a doc_id that
  // survives across a re-categorization (e.g. me-bc: 'me' -> 'me_mother') needs its
  // category/title synced explicitly here — otherwise it keeps stale values forever
  // while status/storage_location/scan_url/notes are left untouched.
  for (const doc of CITIZENSHIP_DOCUMENTS) {
    await db.query(
      `UPDATE citizenship_documents SET category = $1, title = $2 WHERE doc_id = $3`,
      [doc.category, doc.title, doc.docId]
    );
  }
}

const ORIGINAL_RETAINED_DOC_IDS = new Set(
  CITIZENSHIP_DOCUMENTS.filter(d => d.originalRetained).map(d => d.docId)
);

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
      const documents = result.rows.map(row => ({
        ...row,
        original_retained: ORIGINAL_RETAINED_DOC_IDS.has(row.doc_id),
      }));
      res.json({ documents });
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
