'use strict';

// Career Trajectory board — replaces the old Maintenance Chores lane on the Goals
// task board. Three lanes (not statuses): stay & grow in the current role, explore
// internally, explore externally. Single-tenant like tasks/work_roadmap_items.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS career_trajectory_items (
    id          SERIAL PRIMARY KEY,
    lane        VARCHAR(20) NOT NULL CHECK (lane IN ('stay', 'internal', 'external')),
    title       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_career_trajectory_lane ON career_trajectory_items(lane, sort_order)`,
];

// Seeded once from the 2026-08-21 1:1 with Crystal — concrete actions drawn from her
// feedback (requirements/communication consistency, reporting-analytics as a named
// strength, the open role-fit question) so the board isn't empty on first load.
const SEED_ITEMS = [
  { lane: 'stay', title: "Hold the Roadmap \"Consistently Demonstrate\" bar on every ticket — not just standout weeks like the PCC AI Build." },
  { lane: 'stay', title: "Ask Crystal for a concrete example of a \"complete, business-focused\" story before the next refinement, not after." },
  { lane: 'stay', title: "Get Jonah or Anita to sanity-check user stories before refinement so \"too prescriptive\" gets caught early." },
  { lane: 'stay', title: "The moment something looks like a real production issue, open the incident — don't research it quietly first." },

  { lane: 'internal', title: "Ask Crystal directly whether a reporting/analytics-heavy BA role exists on the team or elsewhere in the org — she named this as a real strength." },
  { lane: 'internal', title: "Use the sustainability metrics form as a live example — build it out to show the dev+BA hybrid work, since she raised no objection if it doesn't slow users down." },
  { lane: 'internal', title: "Talk to Pat about how Anita's dev/BA hybrid role took shape — is that a template worth asking for?" },

  { lane: 'external', title: "Update resume/LinkedIn to foreground reporting & analytics work specifically, not generic BA duties." },
  { lane: 'external', title: "Identify 2-3 target roles (BI analyst, analytics-leaning BA) and map the real gap against current experience." },
  { lane: 'external', title: "Set a personal checkpoint for the end of the 60-day review window, independent of how the review itself goes." },
];

// Content addition (2026-08-22) — the written warning surfaced a concrete example
// (SNWR0028146) that the verbal 1:1 alone didn't name specifically. Guarded by an
// exact-text existence check, so it's a no-op after it's inserted once.
const EXTRA_SEED_ITEMS = [
  { lane: 'stay', title: "Leave a comment trail the moment something is unclear or blocked — SNWR0028146 sitting a month (6/18–7/20) with zero notes is the exact pattern not to repeat." },
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM career_trajectory_items');
  if (rows[0].n === 0) {
    for (let i = 0; i < SEED_ITEMS.length; i++) {
      const item = SEED_ITEMS[i];
      await db.query(
        'INSERT INTO career_trajectory_items (lane, title, sort_order) VALUES ($1, $2, $3)',
        [item.lane, item.title, i]
      );
    }
  }

  for (const item of EXTRA_SEED_ITEMS) {
    const { rows: existing } = await db.query('SELECT id FROM career_trajectory_items WHERE title = $1', [item.title]);
    if (existing.length === 0) {
      const { rows: orderRows } = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM career_trajectory_items WHERE lane = $1',
        [item.lane]
      );
      await db.query(
        'INSERT INTO career_trajectory_items (lane, title, sort_order) VALUES ($1, $2, $3)',
        [item.lane, item.title, orderRows[0].next_order]
      );
    }
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — all items, sorted by lane then position
  router.get('/', auth, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM career_trajectory_items ORDER BY lane, sort_order ASC, created_at ASC`
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Career trajectory fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch career trajectory items' });
    }
  });

  // POST / — create a new card { lane, title }
  router.post('/', auth, async (req, res) => {
    const { lane, title } = req.body || {};
    if (!['stay', 'internal', 'external'].includes(lane)) {
      return res.status(400).json({ error: 'Invalid lane' });
    }
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    try {
      const { rows } = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM career_trajectory_items WHERE lane = $1`,
        [lane]
      );
      const result = await db.query(
        `INSERT INTO career_trajectory_items (lane, title, sort_order) VALUES ($1, $2, $3) RETURNING *`,
        [lane, title.trim(), rows[0].next_order]
      );
      res.status(201).json({ item: result.rows[0] });
    } catch (err) {
      console.error('Career trajectory create error:', err.message);
      res.status(500).json({ error: 'Failed to create career trajectory item' });
    }
  });

  // PUT /:id — move to a lane and/or edit title
  router.put('/:id', auth, async (req, res) => {
    const { lane, title } = req.body || {};
    try {
      const existing = await db.query('SELECT * FROM career_trajectory_items WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const item = existing.rows[0];
      let nextLane = lane || item.lane;
      let nextOrder = item.sort_order;
      if (lane && lane !== item.lane) {
        const { rows } = await db.query(
          `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM career_trajectory_items WHERE lane = $1`,
          [lane]
        );
        nextOrder = rows[0].next_order;
      }
      const result = await db.query(
        `UPDATE career_trajectory_items SET lane = $1, title = $2, sort_order = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [nextLane, title !== undefined ? title.trim() : item.title, nextOrder, req.params.id]
      );
      res.json({ item: result.rows[0] });
    } catch (err) {
      console.error('Career trajectory update error:', err.message);
      res.status(500).json({ error: 'Failed to update career trajectory item' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const result = await db.query('DELETE FROM career_trajectory_items WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Career trajectory delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete career trajectory item' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
