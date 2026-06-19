'use strict';

// ── Type metadata ──────────────────────────────────────────────────────────────

const TYPE_TABLE = {
  demand:      'work_item_demands',
  enhancement: 'work_item_enhancements',
  story:       'work_item_stories',
  scrum_task:  'work_item_scrum_tasks',
  defect:      'work_item_defects',
};

const TYPE_COLUMNS = {
  demand: [
    'description', 'business_value', 'requested_by', 'due_date', 'estimated_effort',
    'number', 'demand_state', 'collaborators',
    // v3 demand fields
    'name', 'category', 'demand_type', 'enhancement_number',
    'business_case', 'risk_of_performing', 'risk_of_not_performing',
    'enablers', 'barriers', 'in_scope', 'out_of_scope', 'assumptions', 'notes',
  ],
  enhancement: [
    'description', 'current_state', 'desired_state', 'impact', 'affected_systems', 'business_justification',
    'number', 'enhancement_state', 'demand_id',
  ],
  story: [
    'as_a', 'i_want', 'so_that', 'acceptance_criteria', 'story_points', 'sprint',
    'number', 'story_state', 'story_type', 'enhancement_id',
  ],
  scrum_task: [
    'description', 'assigned_to', 'hours_worked', 'planned_hours', 'percent_complete', 'start_date', 'end_date', 'story_id',
    'number', 'task_state', 'task_type',
  ],
  defect: [
    'description', 'reproduction_steps', 'severity', 'environment', 'assigned_to', 'root_cause', 'resolution', 'version_found',
    'number', 'defect_state', 'reported_against',
  ],
};

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES   = ['active', 'archived', 'deleted'];
const VALID_SORTS      = ['recent', 'created', 'priority', 'type'];

function filterFields(data, allowedCols) {
  const cols = [], vals = [];
  for (const col of allowedCols) {
    if (data[col] !== undefined) {
      cols.push(col);
      vals.push(data[col] === '' ? null : data[col]);
    }
  }
  return { cols, vals };
}

// ── Schema SQL ─────────────────────────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  // Hub table
  `CREATE TABLE IF NOT EXISTS work_items (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INTEGER      NOT NULL DEFAULT 1,
    title           TEXT         NOT NULL,
    item_type       VARCHAR(20)  NOT NULL CHECK (item_type IN ('demand','enhancement','story','scrum_task','defect')),
    related_to      UUID         REFERENCES work_items(id) ON DELETE SET NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
    priority        VARCHAR(20)  NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    owner           TEXT,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  // Type-specific tables
  `CREATE TABLE IF NOT EXISTS work_item_demands (
    id                UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    description       TEXT,
    business_value    TEXT,
    requested_by      TEXT,
    due_date          DATE,
    estimated_effort  TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_enhancements (
    id                     UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    description            TEXT,
    current_state          TEXT,
    desired_state          TEXT,
    impact                 TEXT,
    affected_systems       TEXT,
    business_justification TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_stories (
    id                  UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    as_a                TEXT,
    i_want              TEXT,
    so_that             TEXT,
    acceptance_criteria TEXT,
    story_points        INTEGER,
    sprint              TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_scrum_tasks (
    id               UUID    PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    description      TEXT,
    assigned_to      TEXT,
    hours_worked     NUMERIC(6,2) DEFAULT 0,
    planned_hours    NUMERIC(6,2),
    percent_complete INTEGER      DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
    start_date       DATE,
    end_date         DATE,
    closed_at        TIMESTAMPTZ,
    story_id         UUID    REFERENCES work_items(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_defects (
    id                 UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    description        TEXT,
    reproduction_steps TEXT,
    severity           VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    environment        TEXT,
    assigned_to        TEXT,
    root_cause         TEXT,
    resolution         TEXT,
    version_found      TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_notifications (
    id                SERIAL       PRIMARY KEY,
    user_id           INTEGER      NOT NULL DEFAULT 1,
    work_item_id      UUID         REFERENCES work_items(id) ON DELETE CASCADE,
    message           TEXT         NOT NULL,
    notification_type VARCHAR(50)  NOT NULL DEFAULT 'inactivity_warning',
    read_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_wi_user_status   ON work_items(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_wi_type          ON work_items(item_type)`,
  `CREATE INDEX IF NOT EXISTS idx_wi_last_activity ON work_items(last_activity_at)`,
  `CREATE INDEX IF NOT EXISTS idx_win_user         ON work_item_notifications(user_id, read_at)`,
  // Trigger: auto-update hub timestamps on hub row change
  `CREATE OR REPLACE FUNCTION work_items_touch()
   RETURNS TRIGGER LANGUAGE plpgsql AS $$
   BEGIN
     NEW.updated_at      = NOW();
     NEW.last_activity_at = NOW();
     RETURN NEW;
   END;
   $$`,
  `DROP TRIGGER IF EXISTS trg_wi_touch ON work_items`,
  `CREATE TRIGGER trg_wi_touch
   BEFORE UPDATE ON work_items
   FOR EACH ROW EXECUTE FUNCTION work_items_touch()`,
  // Trigger: propagate last_activity_at from type tables → hub
  `CREATE OR REPLACE FUNCTION propagate_wi_activity()
   RETURNS TRIGGER LANGUAGE plpgsql AS $$
   BEGIN
     UPDATE work_items SET last_activity_at = NOW(), updated_at = NOW() WHERE id = NEW.id;
     RETURN NEW;
   END;
   $$`,
  `DROP TRIGGER IF EXISTS trg_demands_activity      ON work_item_demands`,
  `CREATE TRIGGER trg_demands_activity      AFTER INSERT OR UPDATE ON work_item_demands      FOR EACH ROW EXECUTE FUNCTION propagate_wi_activity()`,
  `DROP TRIGGER IF EXISTS trg_enhancements_activity ON work_item_enhancements`,
  `CREATE TRIGGER trg_enhancements_activity AFTER INSERT OR UPDATE ON work_item_enhancements FOR EACH ROW EXECUTE FUNCTION propagate_wi_activity()`,
  `DROP TRIGGER IF EXISTS trg_stories_activity      ON work_item_stories`,
  `CREATE TRIGGER trg_stories_activity      AFTER INSERT OR UPDATE ON work_item_stories      FOR EACH ROW EXECUTE FUNCTION propagate_wi_activity()`,
  `DROP TRIGGER IF EXISTS trg_scrum_tasks_activity  ON work_item_scrum_tasks`,
  `CREATE TRIGGER trg_scrum_tasks_activity  AFTER INSERT OR UPDATE ON work_item_scrum_tasks  FOR EACH ROW EXECUTE FUNCTION propagate_wi_activity()`,
  `DROP TRIGGER IF EXISTS trg_defects_activity      ON work_item_defects`,
  `CREATE TRIGGER trg_defects_activity      AFTER INSERT OR UPDATE ON work_item_defects      FOR EACH ROW EXECUTE FUNCTION propagate_wi_activity()`,

  // ── v2 column additions (idempotent) ────────────────────────────────────────
  `ALTER TABLE work_item_demands      ADD COLUMN IF NOT EXISTS number        TEXT`,
  `ALTER TABLE work_item_demands      ADD COLUMN IF NOT EXISTS demand_state  TEXT NOT NULL DEFAULT 'Draft'`,
  `ALTER TABLE work_item_demands      ADD COLUMN IF NOT EXISTS collaborators  TEXT`,

  `ALTER TABLE work_item_enhancements ADD COLUMN IF NOT EXISTS number              TEXT`,
  `ALTER TABLE work_item_enhancements ADD COLUMN IF NOT EXISTS enhancement_state   TEXT NOT NULL DEFAULT 'Draft'`,
  `ALTER TABLE work_item_enhancements ADD COLUMN IF NOT EXISTS demand_id           UUID REFERENCES work_items(id) ON DELETE SET NULL`,

  `ALTER TABLE work_item_stories      ADD COLUMN IF NOT EXISTS number              TEXT`,
  `ALTER TABLE work_item_stories      ADD COLUMN IF NOT EXISTS story_state         TEXT NOT NULL DEFAULT 'Draft'`,
  `ALTER TABLE work_item_stories      ADD COLUMN IF NOT EXISTS story_type          TEXT NOT NULL DEFAULT 'Development'`,
  `ALTER TABLE work_item_stories      ADD COLUMN IF NOT EXISTS enhancement_id      UUID REFERENCES work_items(id) ON DELETE SET NULL`,

  `ALTER TABLE work_item_scrum_tasks  ADD COLUMN IF NOT EXISTS number              TEXT`,
  `ALTER TABLE work_item_scrum_tasks  ADD COLUMN IF NOT EXISTS task_state          TEXT NOT NULL DEFAULT 'Draft'`,
  `ALTER TABLE work_item_scrum_tasks  ADD COLUMN IF NOT EXISTS task_type           TEXT NOT NULL DEFAULT 'Coding'`,

  `ALTER TABLE work_item_defects      ADD COLUMN IF NOT EXISTS number              TEXT`,
  `ALTER TABLE work_item_defects      ADD COLUMN IF NOT EXISTS defect_state        TEXT NOT NULL DEFAULT 'Draft'`,
  `ALTER TABLE work_item_defects      ADD COLUMN IF NOT EXISTS reported_against    TEXT`,

  `CREATE INDEX IF NOT EXISTS idx_wi_enh_demand_id ON work_item_enhancements(demand_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wi_story_enh_id  ON work_item_stories(enhancement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wi_task_story_id ON work_item_scrum_tasks(story_id)`,

  // ── v3 demand business-analysis fields (idempotent) ─────────────────────────
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS name                    TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS category                TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS demand_type             TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS enhancement_number      TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS business_case           TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS risk_of_performing      TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS risk_of_not_performing  TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS enablers                TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS barriers                TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS in_scope               TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS out_of_scope           TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS assumptions             TEXT`,
  `ALTER TABLE work_item_demands ADD COLUMN IF NOT EXISTS notes                  TEXT`,

  // ── lincoln_work_logs v2 — intake_type, date, hours, project rename (idempotent) ─
  `CREATE TABLE IF NOT EXISTS lincoln_work_logs (
    id          SERIAL       PRIMARY KEY,
    project     TEXT,
    intake_type VARCHAR(20)  NOT NULL DEFAULT 'work',
    date        DATE         NOT NULL DEFAULT CURRENT_DATE,
    hours       NUMERIC(5,2),
    status      VARCHAR(30)  NOT NULL DEFAULT 'pending',
    notes       TEXT,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lincoln_work_logs' AND column_name='project_name') THEN
      ALTER TABLE lincoln_work_logs RENAME COLUMN project_name TO project;
    END IF;
  END $$`,
  `ALTER TABLE lincoln_work_logs ADD COLUMN IF NOT EXISTS intake_type VARCHAR(20) NOT NULL DEFAULT 'work'`,
  `ALTER TABLE lincoln_work_logs ADD COLUMN IF NOT EXISTS date        DATE        NOT NULL DEFAULT CURRENT_DATE`,
  `ALTER TABLE lincoln_work_logs ADD COLUMN IF NOT EXISTS hours       NUMERIC(5,2)`,
  `ALTER TABLE lincoln_work_logs ADD COLUMN IF NOT EXISTS findings TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_lwl_intake_type ON lincoln_work_logs(intake_type)`,
  `CREATE INDEX IF NOT EXISTS idx_lwl_date        ON lincoln_work_logs(date DESC)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
  console.log('✓ Work items schema ready (v3)');
}

// ── Inactivity cron ────────────────────────────────────────────────────────────

async function runInactivityCron(db) {
  try {
    const warn = await db.query(`
      SELECT wi.id, wi.title,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - wi.last_activity_at)) / 86400)::INT AS days_inactive
      FROM work_items wi
      WHERE wi.status = 'active'
        AND wi.last_activity_at < NOW() - INTERVAL '60 days'
        AND NOT EXISTS (
          SELECT 1 FROM work_item_notifications wn
          WHERE wn.work_item_id = wi.id
            AND wn.notification_type = 'inactivity_warning'
            AND wn.created_at > NOW() - INTERVAL '7 days'
        )
    `);
    for (const r of warn.rows) {
      const daysUntil = Math.max(0, 90 - r.days_inactive);
      await db.query(
        `INSERT INTO work_item_notifications (user_id, work_item_id, message, notification_type)
         VALUES (1, $1, $2, 'inactivity_warning')`,
        [r.id, `"${r.title}" has been inactive for ${r.days_inactive} days (auto-archives in ${daysUntil} days)`]
      );
    }
    const archived = await db.query(`
      UPDATE work_items
      SET status = 'archived', updated_at = NOW()
      WHERE status = 'active' AND last_activity_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);
    if (warn.rows.length || archived.rows.length) {
      console.log(`[Cron/WorkItems] ${warn.rows.length} warnings sent, ${archived.rows.length} auto-archived`);
    }
  } catch (err) {
    console.error('[Cron/WorkItems] Error:', err.message);
  }
}

// ── List SELECT with number + item_state via LEFT JOINs ───────────────────────

const LIST_SELECT = `
  SELECT wi.*,
    COALESCE(wd.number,  we.number,  ws.number,  wst.number,  wdef.number)  AS number,
    COALESCE(wd.demand_state, we.enhancement_state, ws.story_state, wst.task_state, wdef.defect_state) AS item_state,
    FLOOR(EXTRACT(EPOCH FROM (NOW() - wi.last_activity_at)) / 86400)::INT AS days_inactive
  FROM work_items wi
  LEFT JOIN work_item_demands      wd   ON wi.id = wd.id   AND wi.item_type = 'demand'
  LEFT JOIN work_item_enhancements we   ON wi.id = we.id   AND wi.item_type = 'enhancement'
  LEFT JOIN work_item_stories      ws   ON wi.id = ws.id   AND wi.item_type = 'story'
  LEFT JOIN work_item_scrum_tasks  wst  ON wi.id = wst.id  AND wi.item_type = 'scrum_task'
  LEFT JOIN work_item_defects      wdef ON wi.id = wdef.id AND wi.item_type = 'defect'
`;

function sortClause(sort) {
  if (sort === 'created')  return 'wi.created_at DESC';
  if (sort === 'priority') return `CASE wi.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, wi.last_activity_at DESC`;
  if (sort === 'type')     return 'wi.item_type ASC, wi.last_activity_at DESC';
  return 'wi.last_activity_at DESC';
}

// ── Router factory ─────────────────────────────────────────────────────────────

module.exports = { runMigrations, runInactivityCron, makeRouter };

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ── GET / — list with pagination ──────────────────────────────────────────
  router.get('/', auth, async (req, res) => {
    const { type, status = 'active', q, sort = 'recent' } = req.query;
    const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10) || 1);
    const limit  = Math.max(1, Math.min(100, parseInt(req.query.limit ?? '25', 10) || 25));
    const offset = (page - 1) * limit;
    const order  = sortClause(VALID_SORTS.includes(sort) ? sort : 'recent');

    try {
      const params = [];
      let where = 'WHERE wi.user_id = 1';

      if (VALID_STATUSES.includes(status)) {
        params.push(status);
        where += ` AND wi.status = $${params.length}`;
      }
      if (type && TYPE_TABLE[type]) {
        params.push(type);
        where += ` AND wi.item_type = $${params.length}`;
      }
      if (q?.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        where += ` AND LOWER(wi.title) LIKE $${params.length}`;
      }

      const [countR, itemsR] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM work_items wi ${where}`, [...params]),
        db.query(
          `${LIST_SELECT} ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      res.json({
        items:  itemsR.rows,
        total:  parseInt(countR.rows[0].count, 10),
        page,
        limit,
        pages:  Math.ceil(parseInt(countR.rows[0].count, 10) / limit),
      });
    } catch (err) {
      console.error('Work items list error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work items' });
    }
  });

  // ── GET /summary ──────────────────────────────────────────────────────────
  router.get('/summary', auth, async (req, res) => {
    try {
      const [counts, byType] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'active')                                                   AS active_count,
            COUNT(*) FILTER (WHERE status = 'archived')                                                  AS archived_count,
            COUNT(*) FILTER (WHERE status = 'active' AND last_activity_at < NOW() - INTERVAL '60 days') AS inactive_count
          FROM work_items WHERE user_id = 1
        `),
        db.query(`
          SELECT item_type, COUNT(*)::INT AS cnt
          FROM work_items WHERE user_id = 1 AND status = 'active'
          GROUP BY item_type
        `),
      ]);
      const by_type = {};
      for (const r of byType.rows) by_type[r.item_type] = r.cnt;
      res.json({ ...counts.rows[0], by_type });
    } catch (err) {
      console.error('Summary error:', err.message);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // ── GET /notifications ────────────────────────────────────────────────────
  router.get('/notifications', auth, async (req, res) => {
    try {
      const result = await db.query(`
        SELECT wn.*, wi.title AS item_title, wi.item_type
        FROM work_item_notifications wn
        LEFT JOIN work_items wi ON wn.work_item_id = wi.id
        WHERE wn.user_id = 1
        ORDER BY wn.created_at DESC LIMIT 50
      `);
      res.json({ notifications: result.rows });
    } catch (err) {
      console.error('Notifications error:', err.message);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // ── PUT /notifications/:notifId/read ──────────────────────────────────────
  router.put('/notifications/:notifId/read', auth, async (req, res) => {
    try {
      await db.query(
        'UPDATE work_item_notifications SET read_at = NOW() WHERE id = $1 AND user_id = 1',
        [req.params.notifId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark read' });
    }
  });

  // ── GET /:id — full item + related items ──────────────────────────────────
  router.get('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
      const hubR = await db.query(
        `SELECT wi.*, FLOOR(EXTRACT(EPOCH FROM (NOW() - wi.last_activity_at)) / 86400)::INT AS days_inactive
         FROM work_items wi WHERE wi.id = $1 AND wi.user_id = 1`,
        [id]
      );
      if (!hubR.rows.length) return res.status(404).json({ error: 'Work item not found' });
      const hub = hubR.rows[0];

      const typeR = await db.query(`SELECT * FROM ${TYPE_TABLE[hub.item_type]} WHERE id = $1`, [id]);
      const typeData = { ...(typeR.rows[0] || {}) };
      delete typeData.id;

      const related = { parent: null, children: [] };

      if (hub.item_type === 'demand') {
        const r = await db.query(`
          SELECT wi.id, wi.title, wi.item_type, we.number, we.enhancement_state AS item_state
          FROM work_items wi JOIN work_item_enhancements we ON wi.id = we.id
          WHERE we.demand_id = $1 AND wi.status != 'deleted'
          ORDER BY wi.created_at DESC LIMIT 50
        `, [id]);
        related.children = r.rows;
      }

      if (hub.item_type === 'enhancement') {
        if (typeData.demand_id) {
          const r = await db.query(`
            SELECT wi.id, wi.title, wi.item_type, wd.number
            FROM work_items wi JOIN work_item_demands wd ON wi.id = wd.id
            WHERE wi.id = $1 AND wi.status != 'deleted'
          `, [typeData.demand_id]);
          related.parent = r.rows[0] ?? null;
        }
        const r = await db.query(`
          SELECT wi.id, wi.title, wi.item_type, ws.number, ws.story_state AS item_state
          FROM work_items wi JOIN work_item_stories ws ON wi.id = ws.id
          WHERE ws.enhancement_id = $1 AND wi.status != 'deleted'
          ORDER BY wi.created_at DESC LIMIT 50
        `, [id]);
        related.children = r.rows;
      }

      if (hub.item_type === 'story') {
        if (typeData.enhancement_id) {
          const r = await db.query(`
            SELECT wi.id, wi.title, wi.item_type, we.number
            FROM work_items wi JOIN work_item_enhancements we ON wi.id = we.id
            WHERE wi.id = $1 AND wi.status != 'deleted'
          `, [typeData.enhancement_id]);
          related.parent = r.rows[0] ?? null;
        }
        const r = await db.query(`
          SELECT wi.id, wi.title, wi.item_type, wst.number, wst.task_state AS item_state
          FROM work_items wi JOIN work_item_scrum_tasks wst ON wi.id = wst.id
          WHERE wst.story_id = $1 AND wi.status != 'deleted'
          ORDER BY wi.created_at DESC LIMIT 50
        `, [id]);
        related.children = r.rows;
      }

      if (hub.item_type === 'scrum_task' && typeData.story_id) {
        const r = await db.query(`
          SELECT wi.id, wi.title, wi.item_type, ws.number
          FROM work_items wi JOIN work_item_stories ws ON wi.id = ws.id
          WHERE wi.id = $1 AND wi.status != 'deleted'
        `, [typeData.story_id]);
        related.parent = r.rows[0] ?? null;
      }

      res.json({ item: { ...hub, ...typeData }, related });
    } catch (err) {
      console.error('Work item fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work item' });
    }
  });

  // ── POST / — create ───────────────────────────────────────────────────────
  router.post('/', auth, async (req, res) => {
    const { item_type, title, priority = 'medium', owner, related_to, ...typeData } = req.body;
    if (!item_type || !title?.trim()) return res.status(400).json({ error: 'item_type and title required' });
    if (!TYPE_TABLE[item_type])        return res.status(400).json({ error: 'Invalid item_type' });
    const validP = VALID_PRIORITIES.includes(priority) ? priority : 'medium';

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const hubR = await client.query(
        `INSERT INTO work_items (user_id, title, item_type, related_to, priority, owner)
         VALUES (1, $1, $2, $3, $4, $5) RETURNING id`,
        [title.trim(), item_type, related_to || null, validP, owner?.trim() || null]
      );
      const id = hubR.rows[0].id;

      const { cols, vals } = filterFields(typeData, TYPE_COLUMNS[item_type]);
      const allCols = ['id', ...cols];
      const allVals = [id, ...vals];
      const ph      = allVals.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO ${TYPE_TABLE[item_type]} (${allCols.join(', ')}) VALUES (${ph})`,
        allVals
      );
      await client.query('COMMIT');
      res.status(201).json({ id });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Work item create error:', err.message);
      res.status(500).json({ error: 'Failed to create work item' });
    } finally {
      client.release();
    }
  });

  // ── POST /import — bulk JSON import ───────────────────────────────────────
  router.post('/import', auth, async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Provide a non-empty "items" array' });
    }
    const out = { created: 0, failed: 0, errors: [] };
    for (const item of items.slice(0, 200)) {
      if (!item.item_type || !item.title || !TYPE_TABLE[item.item_type]) { out.failed++; continue; }
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { item_type, title, priority = 'medium', owner, related_to, ...td } = item;
        const validP = VALID_PRIORITIES.includes(priority) ? priority : 'medium';
        const hubR = await client.query(
          `INSERT INTO work_items (user_id, title, item_type, related_to, priority, owner)
           VALUES (1, $1, $2, $3, $4, $5) RETURNING id`,
          [title.trim(), item_type, related_to || null, validP, owner?.trim() || null]
        );
        const id = hubR.rows[0].id;
        const { cols, vals } = filterFields(td, TYPE_COLUMNS[item_type]);
        const allCols = ['id', ...cols];
        const allVals = [id, ...vals];
        await client.query(
          `INSERT INTO ${TYPE_TABLE[item_type]} (${allCols.join(', ')}) VALUES (${allVals.map((_, i) => `$${i + 1}`).join(', ')})`,
          allVals
        );
        await client.query('COMMIT');
        out.created++;
      } catch (err) {
        await client.query('ROLLBACK');
        out.failed++;
        out.errors.push(err.message);
      } finally {
        client.release();
      }
    }
    res.json(out);
  });

  // ── PUT /:id — update ─────────────────────────────────────────────────────
  router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { title, priority, owner, related_to, ...typeData } = req.body;
    try {
      const existing = await db.query(
        `SELECT * FROM work_items WHERE id = $1 AND user_id = 1 AND status != 'deleted'`,
        [id]
      );
      if (!existing.rows.length) return res.status(404).json({ error: 'Work item not found' });
      const hub = existing.rows[0];

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const hubSets = [], hubVals = [];
        if (title !== undefined)                               { hubVals.push(title.trim()); hubSets.push(`title = $${hubVals.length}`); }
        if (priority && VALID_PRIORITIES.includes(priority))   { hubVals.push(priority);     hubSets.push(`priority = $${hubVals.length}`); }
        if (owner !== undefined)                               { hubVals.push(owner?.trim() || null); hubSets.push(`owner = $${hubVals.length}`); }
        if (related_to !== undefined)                          { hubVals.push(related_to || null);    hubSets.push(`related_to = $${hubVals.length}`); }
        if (hubSets.length) {
          hubVals.push(id);
          await client.query(
            `UPDATE work_items SET ${hubSets.join(', ')}, updated_at = NOW(), last_activity_at = NOW() WHERE id = $${hubVals.length}`,
            hubVals
          );
        }

        const { cols: tCols, vals: tVals } = filterFields(typeData, TYPE_COLUMNS[hub.item_type]);
        if (tCols.length) {
          const tSets = tCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
          tVals.push(id);
          await client.query(
            `UPDATE ${TYPE_TABLE[hub.item_type]} SET ${tSets} WHERE id = $${tVals.length}`,
            tVals
          );
        }

        await client.query('COMMIT');
        res.json({ success: true });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Work item update error:', err.message);
      res.status(500).json({ error: 'Failed to update work item' });
    }
  });

  // ── PUT /:id/archive ───────────────────────────────────────────────────────
  router.put('/:id/archive', auth, async (req, res) => {
    try {
      const r = await db.query(
        `UPDATE work_items SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND user_id = 1 AND status = 'active' RETURNING id`,
        [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Active work item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Archive error:', err.message);
      res.status(500).json({ error: 'Failed to archive' });
    }
  });

  // ── PUT /:id/unarchive ─────────────────────────────────────────────────────
  router.put('/:id/unarchive', auth, async (req, res) => {
    try {
      const r = await db.query(
        `UPDATE work_items SET status = 'active', last_activity_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = 1 AND status = 'archived' RETURNING id`,
        [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Archived work item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Unarchive error:', err.message);
      res.status(500).json({ error: 'Failed to unarchive' });
    }
  });

  // ── DELETE /:id — soft delete ──────────────────────────────────────────────
  router.delete('/:id', auth, async (req, res) => {
    try {
      const r = await db.query(
        `UPDATE work_items SET status = 'deleted', updated_at = NOW()
         WHERE id = $1 AND user_id = 1 AND status != 'deleted' RETURNING id`,
        [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Work item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  return router;
}
