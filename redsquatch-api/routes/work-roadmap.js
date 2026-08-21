'use strict';

// Personal performance roadmap — a living reference of manager feedback, grouped into
// three categories: what's going well, what "good" looks like every time, and what to
// keep improving. Single-tenant like work_cards/work_journal (no client_id scoping).
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS work_roadmap_items (
    id          SERIAL PRIMARY KEY,
    category    VARCHAR(20) NOT NULL CHECK (category IN ('did_well', 'demonstrate', 'improve')),
    text        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_roadmap_category ON work_roadmap_items(category, sort_order)`,
];

// Seeded once from the 2026-08-21 1:1 so the page isn't empty on first load —
// freely editable/deletable afterward, this is just a starting point.
const SEED_ITEMS = [
  { category: 'did_well', text: "PCC AI Build refinement — thorough, concise back-and-forth with the stakeholder, used the agile playbook to shape it into proper user stories. Manager called it one of the best examples he's seen from me." },
  { category: 'did_well', text: "Sustainability metrics form — came in proactively with two worked-out options instead of just flagging the question and waiting to be told what to do." },

  { category: 'demonstrate', text: "Write user stories around business outcomes, not technical how-to. Leave implementation detail to the team unless it's a genuine tech-debt item." },
  { category: 'demonstrate', text: "Resolve stakeholder questions and missing info independently within the same business days as assignment. Escalate through the documented process if truly stuck — don't let it sit." },
  { category: 'demonstrate', text: "Match communication detail to the actual audience. The project team already knows their own rollout plan — don't write to them like they're IT." },
  { category: 'demonstrate', text: "Come to refinement and stakeholder meetings prepared enough to state the business purpose and value without going in circles." },
  { category: 'demonstrate', text: "If something looks like a real production issue, get it logged as an incident immediately — documented, not worked quietly over email." },
  { category: 'demonstrate', text: "Know and follow the team's established ways of working / playbook before assuming a process doesn't exist." },

  { category: 'improve', text: "Consistency — one strong week isn't enough. The standard has to hold on every ticket, every week, not just the highlight example." },
  { category: 'improve', text: "Currently on a documented verbal warning with a 60-day active review (weekly/biweekly 1:1s). Treat every ticket as evidence toward that review." },
  { category: 'improve', text: 'Anticipate the obvious next question before raising an issue (e.g. "how long will this take") instead of surfacing it half-formed.' },
  { category: 'improve', text: "Reflect on role fit — reporting/analytics was called out as a real strength. Worth an open conversation about how much of that vs. core BA work makes sense going forward." },
];

// Content corrections (2026-08-22) — the original seed above was drafted from the
// verbal 1:1 alone; the actual written warning (surfaced afterward) has more precise
// language for a few of these and one standard (staying focused during work hours)
// that never came up on the call at all. Matched by exact old text, so each update is
// a no-op after it's applied once — safe to run on every boot like SCHEMA_STATEMENTS.
const CONTENT_UPDATES = [
  {
    match: "Resolve stakeholder questions and missing info independently within the same business days as assignment. Escalate through the documented process if truly stuck — don't let it sit.",
    replace: "Resolve stakeholder questions, missing information, and requirement clarifications within 5 business days of assignment, unless a documented blocker requires escalation. (Literal standard from the written warning.)",
  },
  {
    match: "Know and follow the team's established ways of working / playbook before assuming a process doesn't exist.",
    replace: "Follow the Team Playbook and established sprint/refinement process — bring ready items to refinement and sprint planning at the appropriate stage, rather than reaching out directly for a developer assignment.",
  },
  {
    match: "Come to refinement and stakeholder meetings prepared enough to state the business purpose and value without going in circles.",
    replace: "Come to meetings prepared — questions, business needs, decisions required, and next steps thought through in advance, so purpose and value never get worked out live in the room.",
  },
];

const EXTRA_SEED_ITEMS = [
  { category: 'demonstrate', text: "Stay focused on work during working hours — no non-work distractions (personal email, browsing, phone, other conversation). This is a written standard, not just a norm." },
  { category: 'improve', text: "Two concrete data points are already in the written record, not just tone: KeyFactor's missed access requirements (surfaced 6/2/2026, after the requirements phase closed 2/25) and the Problem Mgmt enhancement still circling months after its 3/19 assignment (review meetings 5/21 and 7/27)." },
  { category: 'improve', text: "SNWR0028146 sat untouched for a month (6/18 → 7/20) with no escalation and no comment on the ticket. The fix isn't \"work faster\" — it's leaving a trail: comment the moment something is unclear, even before it's a formal blocker." },
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM work_roadmap_items');
  if (rows[0].n === 0) {
    for (let i = 0; i < SEED_ITEMS.length; i++) {
      const item = SEED_ITEMS[i];
      await db.query(
        'INSERT INTO work_roadmap_items (category, text, sort_order) VALUES ($1, $2, $3)',
        [item.category, item.text, i]
      );
    }
  }

  for (const { match, replace } of CONTENT_UPDATES) {
    await db.query(
      'UPDATE work_roadmap_items SET text = $1, updated_at = NOW() WHERE text = $2',
      [replace, match]
    );
  }

  for (const item of EXTRA_SEED_ITEMS) {
    const { rows: existing } = await db.query('SELECT id FROM work_roadmap_items WHERE text = $1', [item.text]);
    if (existing.length === 0) {
      const { rows: orderRows } = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM work_roadmap_items WHERE category = $1',
        [item.category]
      );
      await db.query(
        'INSERT INTO work_roadmap_items (category, text, sort_order) VALUES ($1, $2, $3)',
        [item.category, item.text, orderRows[0].next_order]
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

  // GET / — all items, grouped by category, sorted within each
  router.get('/', auth, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM work_roadmap_items ORDER BY category, sort_order ASC, created_at ASC`
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Roadmap fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch roadmap items' });
    }
  });

  // POST / — create a new item { category, text }
  router.post('/', auth, async (req, res) => {
    const { category, text } = req.body || {};
    if (!['did_well', 'demonstrate', 'improve'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!text?.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    try {
      const { rows } = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM work_roadmap_items WHERE category = $1`,
        [category]
      );
      const result = await db.query(
        `INSERT INTO work_roadmap_items (category, text, sort_order) VALUES ($1, $2, $3) RETURNING *`,
        [category, text.trim(), rows[0].next_order]
      );
      res.status(201).json({ item: result.rows[0] });
    } catch (err) {
      console.error('Roadmap create error:', err.message);
      res.status(500).json({ error: 'Failed to create roadmap item' });
    }
  });

  // PUT /:id — update text and/or category
  router.put('/:id', auth, async (req, res) => {
    const { text, category } = req.body || {};
    try {
      const existing = await db.query('SELECT * FROM work_roadmap_items WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const item = existing.rows[0];
      const result = await db.query(
        `UPDATE work_roadmap_items SET text = $1, category = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [text !== undefined ? text.trim() : item.text, category || item.category, req.params.id]
      );
      res.json({ item: result.rows[0] });
    } catch (err) {
      console.error('Roadmap update error:', err.message);
      res.status(500).json({ error: 'Failed to update roadmap item' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const result = await db.query('DELETE FROM work_roadmap_items WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Roadmap delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete roadmap item' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
