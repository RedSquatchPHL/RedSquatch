'use strict';

const multer = require('multer');
const { parseWorkCardsPdf } = require('../lib/parse-work-cards-pdf');
const { parseWorkCardsXlsx } = require('../lib/parse-work-cards-xlsx');

const FOLLOW_UP_MINUTES_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // report is a few dozen KB; 20MB is generous headroom

// Demand > {Project, Enhancement} > Story > Scrum Task, with Release also
// optionally tied to a Story. ServiceNow Request/Defect sit outside this
// hierarchy entirely (no parent question for them).
const ALLOWED_PARENT_TYPES = {
  STSK: ['STRY'],
  STRY: ['PRJ', 'ENHC'],
  PRJ: ['DMND'],
  ENHC: ['DMND'],
  RLSE: ['STRY'],
};

// Memory storage only — the file is parsed once into rows and never needs to be
// served back later, unlike routes/files.js's disk-backed client_files uploads.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS work_cards (
    id                SERIAL PRIMARY KEY,
    ticket_number     VARCHAR(50) UNIQUE NOT NULL,
    task_type         VARCHAR(20) NOT NULL,
    priority          VARCHAR(50) NOT NULL,
    short_description TEXT NOT NULL,
    opened_at         TIMESTAMP NOT NULL,
    state             VARCHAR(100) NOT NULL,
    done              BOOLEAN NOT NULL DEFAULT false,
    follow_up_at      TIMESTAMP,
    backburner        BOOLEAN NOT NULL DEFAULT false,
    imported_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_cards_backburner ON work_cards(backburner)`,
  `CREATE INDEX IF NOT EXISTS idx_work_cards_follow_up_at ON work_cards(follow_up_at)`,
  // Single-row guard so the midnight reset (in index.js) is a safe no-op if it's
  // already run for today's local calendar date, even across server restarts.
  `CREATE TABLE IF NOT EXISTS work_cards_reset_log (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_reset_date DATE NOT NULL
  )`,
  // Hierarchy: Demand > {Project, Enhancement} > Story > Scrum Task, single parent per card.
  `ALTER TABLE work_cards ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES work_cards(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_work_cards_parent_id ON work_cards(parent_id)`,
  // Long-form text (e.g. Demand's "Description" field) — separate from
  // short_description since it can run to multiple paragraphs. Nullable: most
  // task types (Scrum Task/Story/Enhancement/Release/etc.) never supply one.
  `ALTER TABLE work_cards ADD COLUMN IF NOT EXISTS description TEXT`,
  // Demand-only reference text naming which Project/Enhancement record(s) it
  // spawned — informational only. Actual PRJ/ENHC -> DMND linkage still goes
  // through parent_id, set manually via each Project/Enhancement card's picker.
  `ALTER TABLE work_cards ADD COLUMN IF NOT EXISTS related_project TEXT`,
  `ALTER TABLE work_cards ADD COLUMN IF NOT EXISTS related_enhancement TEXT`,
  // Demand's ServiceNow report has no Priority or Opened date column at all, so
  // those two are optional for Demand cards (still required for every other type
  // via the row validator in work-cards-shared.js, which is the actual gate).
  `ALTER TABLE work_cards ALTER COLUMN priority DROP NOT NULL`,
  `ALTER TABLE work_cards ALTER COLUMN opened_at DROP NOT NULL`,
  // Journal: a running list of dated notes per card, independent of the daily reset.
  `CREATE TABLE IF NOT EXISTS work_card_journal (
    id            SERIAL PRIMARY KEY,
    work_card_id  INTEGER NOT NULL REFERENCES work_cards(id) ON DELETE CASCADE,
    note          TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_card_journal_work_card_id ON work_card_journal(work_card_id)`,
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

  // POST /import — body: multipart file field "file" (.pdf or .xlsx ServiceNow report,
  // e.g. the daily task report, or a secondary Demand/Project report). Upserts every
  // parsed ticket, then removes existing cards of the SAME task type(s) as this batch
  // that are missing from it — scoped by type so a Demand-only upload can't wipe out
  // unrelated Enhancement/Story/Scrum Task cards from the daily report.
  router.post('/import', auth, (req, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File exceeds the 20MB limit' });
        }
        console.error('Work card upload error:', err.message);
        return res.status(400).json({ error: 'Upload failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      let parsed;
      try {
        const name = req.file.originalname.toLowerCase();
        if (req.file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
          parsed = await parseWorkCardsPdf(req.file.buffer);
        } else if (name.endsWith('.xlsx') || req.file.mimetype.includes('spreadsheet')) {
          parsed = parseWorkCardsXlsx(req.file.buffer);
        } else {
          return res.status(400).json({ error: 'Unsupported file type — upload a PDF or XLSX report' });
        }
      } catch (parseErr) {
        console.error('Work card parse error:', parseErr.message);
        return res.status(400).json({ error: 'Could not read that file' });
      }

      const { rows, needsReview } = parsed;
      if (rows.length === 0) {
        return res.status(400).json({ error: 'No recognizable rows found in the report', needsReview });
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        let imported = 0;
        let updated = 0;

        for (const row of rows) {
          const result = await client.query(
            `INSERT INTO work_cards (ticket_number, task_type, priority, short_description, opened_at, state, description, related_project, related_enhancement, imported_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (ticket_number) DO UPDATE SET
               task_type = EXCLUDED.task_type,
               priority = EXCLUDED.priority,
               short_description = EXCLUDED.short_description,
               opened_at = EXCLUDED.opened_at,
               state = EXCLUDED.state,
               description = EXCLUDED.description,
               related_project = EXCLUDED.related_project,
               related_enhancement = EXCLUDED.related_enhancement,
               imported_at = NOW()
             RETURNING (xmax = 0) AS inserted`,
            [
              row.ticket_number, row.task_type, row.priority, row.short_description, row.opened_at, row.state,
              row.description ?? null, row.related_project ?? null, row.related_enhancement ?? null,
            ]
          );
          if (result.rows[0].inserted) imported++;
          else updated++;
        }

        const tickets = rows.map(r => r.ticket_number);
        const importedTypes = [...new Set(rows.map(r => r.task_type))];
        const removedResult = await client.query(
          `DELETE FROM work_cards WHERE task_type = ANY($1::text[]) AND ticket_number != ALL($2::text[])`,
          [importedTypes, tickets]
        );

        await client.query('COMMIT');
        res.status(201).json({ imported, updated, removed: removedResult.rowCount, needsReview });
      } catch (dbErr) {
        await client.query('ROLLBACK');
        console.error('Work cards import error:', dbErr.message);
        res.status(500).json({ error: 'Failed to import work cards' });
      } finally {
        client.release();
      }
    });
  });

  // GET / — full card list; frontend partitions into carousel/backburner/done-list/
  // cascade/timer-tray client-side.
  router.get('/', auth, async (req, res) => {
    try {
      const result = await db.query(`SELECT * FROM work_cards ORDER BY ticket_number ASC`);
      res.json({ cards: result.rows });
    } catch (err) {
      console.error('Work cards fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work cards' });
    }
  });

  // PUT /:id — body may include any of: done (bool), backburner (bool),
  // follow_up_minutes (one of 30/60/.../240 — sets follow_up_at = now + duration),
  // clear_follow_up (true — clears follow_up_at), parent_id (number to link, or null
  // to unlink). Mirrors work-items.js's dynamic cols/values builder so callers only
  // send the fields they're actually toggling.
  router.put('/:id', auth, async (req, res) => {
    try {
      const { done, backburner, follow_up_minutes, clear_follow_up, parent_id } = req.body || {};
      const cols = [];
      const values = [];

      if (done !== undefined) { values.push(!!done); cols.push(`done = $${values.length}`); }
      if (backburner !== undefined) { values.push(!!backburner); cols.push(`backburner = $${values.length}`); }

      if (follow_up_minutes !== undefined) {
        if (!FOLLOW_UP_MINUTES_OPTIONS.includes(Number(follow_up_minutes))) {
          return res.status(400).json({ error: 'follow_up_minutes must be one of 30/60/90/120/150/180/210/240' });
        }
        values.push(Number(follow_up_minutes));
        cols.push(`follow_up_at = NOW() + ($${values.length} || ' minutes')::interval`);
      } else if (clear_follow_up === true) {
        cols.push(`follow_up_at = NULL`);
      }

      if (parent_id !== undefined) {
        if (parent_id === null) {
          cols.push(`parent_id = NULL`);
        } else if (Number(parent_id) === Number(req.params.id)) {
          return res.status(400).json({ error: 'A card cannot be its own parent' });
        } else {
          const [childRow, parentRow] = await Promise.all([
            db.query('SELECT task_type FROM work_cards WHERE id = $1', [req.params.id]),
            db.query('SELECT task_type FROM work_cards WHERE id = $1', [parent_id]),
          ]);
          if (childRow.rows.length === 0) return res.status(404).json({ error: 'Work card not found' });
          if (parentRow.rows.length === 0) return res.status(400).json({ error: 'Parent card not found' });

          const childType = childRow.rows[0].task_type;
          const parentType = parentRow.rows[0].task_type;
          const allowed = ALLOWED_PARENT_TYPES[childType] || [];
          if (!allowed.includes(parentType)) {
            return res.status(400).json({ error: `A ${childType} card cannot be linked to a ${parentType} parent` });
          }
          values.push(Number(parent_id));
          cols.push(`parent_id = $${values.length}`);
        }
      }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await db.query(
        `UPDATE work_cards SET ${cols.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Work card not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Work card update error:', err.message);
      res.status(500).json({ error: 'Failed to update work card' });
    }
  });

  // GET /:id/journal — notes for a card, newest first.
  router.get('/:id/journal', auth, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, work_card_id, note, created_at FROM work_card_journal WHERE work_card_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      res.json({ entries: result.rows });
    } catch (err) {
      console.error('Work card journal fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // POST /:id/journal — body: { note }
  router.post('/:id/journal', auth, async (req, res) => {
    try {
      const note = String(req.body?.note ?? '').trim();
      if (!note) return res.status(400).json({ error: 'note is required' });

      const result = await db.query(
        `INSERT INTO work_card_journal (work_card_id, note) VALUES ($1, $2)
         RETURNING id, work_card_id, note, created_at`,
        [req.params.id, note]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Work card journal create error:', err.message);
      res.status(500).json({ error: 'Failed to add journal entry' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter, FOLLOW_UP_MINUTES_OPTIONS, ALLOWED_PARENT_TYPES };
