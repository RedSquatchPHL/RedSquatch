'use strict';

const CONTEXTS = ['Lincoln', 'RedSquatch', 'Personal'];
const PRIORITIES = ['low', 'medium', 'high'];

const DEFAULT_COLUMNS = [
  { key: 'todo', title: 'Todo' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'done', title: 'Done' },
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS task_columns (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    title      VARCHAR(100) NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    width_px   INTEGER NOT NULL DEFAULT 280,
    is_done    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_task_columns_client ON task_columns(client_id)`,
  `CREATE TABLE IF NOT EXISTS task_swimlanes (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    title      VARCHAR(100) NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_task_swimlanes_client ON task_swimlanes(client_id)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    column_id    INTEGER NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
    swimlane_id  INTEGER REFERENCES task_swimlanes(id) ON DELETE SET NULL,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    priority     VARCHAR(20) NOT NULL DEFAULT 'medium',
    context      VARCHAR(50),
    due_date     TIMESTAMP,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id)`,
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

// First-visit seed: three default columns (Todo/In Progress/Done, the last
// flagged is_done so completed_at gets stamped on drop) and no swimlanes —
// swimlanes are opt-in, an empty board reads better as a plain 3-column
// kanban than as one lonely "General" row.
async function seedForClient(db, clientId) {
  const existing = await db.query('SELECT id FROM task_columns WHERE client_id = $1 LIMIT 1', [clientId]);
  if (existing.rows.length > 0) return;
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    const col = DEFAULT_COLUMNS[i];
    await db.query(
      `INSERT INTO task_columns (client_id, title, position, is_done) VALUES ($1, $2, $3, $4)`,
      [clientId, col.title, i, col.key === 'done']
    );
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full board: columns, swimlanes, tasks, seeding defaults on first visit
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedForClient(db, clientId);
      const [columns, swimlanes, tasks] = await Promise.all([
        db.query('SELECT * FROM task_columns WHERE client_id = $1 ORDER BY position, id', [clientId]),
        db.query('SELECT * FROM task_swimlanes WHERE client_id = $1 ORDER BY position, id', [clientId]),
        db.query('SELECT * FROM tasks WHERE client_id = $1 ORDER BY position, id', [clientId]),
      ]);
      res.json({ columns: columns.rows, swimlanes: swimlanes.rows, tasks: tasks.rows, contexts: CONTEXTS, priorities: PRIORITIES });
    } catch (err) {
      console.error('GET /tasks error:', err.message);
      res.status(500).json({ error: 'Failed to fetch board' });
    }
  });

  // ── Columns ──────────────────────────────────────────────────────
  router.post('/columns', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const title = (req.body.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Title required' });
      const { rows } = await db.query('SELECT COALESCE(MAX(position), -1) AS max FROM task_columns WHERE client_id = $1', [clientId]);
      const result = await db.query(
        `INSERT INTO task_columns (client_id, title, position) VALUES ($1, $2, $3) RETURNING *`,
        [clientId, title, rows[0].max + 1]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /tasks/columns error:', err.message);
      res.status(500).json({ error: 'Failed to create column' });
    }
  });

  router.put('/columns/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { title, position, width_px, is_done } = req.body;
      const result = await db.query(
        `UPDATE task_columns SET
           title = COALESCE($1, title),
           position = COALESCE($2, position),
           width_px = COALESCE($3, width_px),
           is_done = COALESCE($4, is_done)
         WHERE id = $5 AND client_id = $6
         RETURNING *`,
        [title ?? null, position ?? null, width_px ?? null, is_done ?? null, req.params.id, clientId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Column not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /tasks/columns/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update column' });
    }
  });

  // Deleting a column reassigns its tasks to whichever remaining column has
  // the lowest position, rather than cascading the delete onto them — losing
  // the column shape shouldn't lose the work itself.
  router.delete('/columns/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const fallback = await db.query(
        `SELECT id FROM task_columns WHERE client_id = $1 AND id != $2 ORDER BY position, id LIMIT 1`,
        [clientId, req.params.id]
      );
      if (!fallback.rows.length) {
        return res.status(400).json({ error: 'Cannot delete the last remaining column' });
      }
      await db.query('UPDATE tasks SET column_id = $1 WHERE column_id = $2 AND client_id = $3', [fallback.rows[0].id, req.params.id, clientId]);
      await db.query('DELETE FROM task_columns WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /tasks/columns/:id error:', err.message);
      res.status(500).json({ error: 'Failed to delete column' });
    }
  });

  // ── Swimlanes ────────────────────────────────────────────────────
  router.post('/swimlanes', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const title = (req.body.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Title required' });
      const { rows } = await db.query('SELECT COALESCE(MAX(position), -1) AS max FROM task_swimlanes WHERE client_id = $1', [clientId]);
      const result = await db.query(
        `INSERT INTO task_swimlanes (client_id, title, position) VALUES ($1, $2, $3) RETURNING *`,
        [clientId, title, rows[0].max + 1]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /tasks/swimlanes error:', err.message);
      res.status(500).json({ error: 'Failed to create swimlane' });
    }
  });

  router.put('/swimlanes/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { title, position } = req.body;
      const result = await db.query(
        `UPDATE task_swimlanes SET title = COALESCE($1, title), position = COALESCE($2, position)
         WHERE id = $3 AND client_id = $4 RETURNING *`,
        [title ?? null, position ?? null, req.params.id, clientId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Swimlane not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /tasks/swimlanes/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update swimlane' });
    }
  });

  // Deleting a swimlane un-assigns its tasks (swimlane_id -> NULL) rather than
  // deleting them — they fall back into the unlaned row.
  router.delete('/swimlanes/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await db.query('DELETE FROM task_swimlanes WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /tasks/swimlanes/:id error:', err.message);
      res.status(500).json({ error: 'Failed to delete swimlane' });
    }
  });

  // ── Tasks ────────────────────────────────────────────────────────
  router.post('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { title, description, priority, context, due_date, column_id, swimlane_id } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
      if (!column_id) return res.status(400).json({ error: 'column_id required' });

      const { rows } = await db.query('SELECT COALESCE(MAX(position), -1) AS max FROM tasks WHERE column_id = $1', [column_id]);
      const result = await db.query(
        `INSERT INTO tasks (client_id, column_id, swimlane_id, title, description, priority, context, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [clientId, column_id, swimlane_id || null, title.trim(), description || null, priority || 'medium', context || null, due_date || null, rows[0].max + 1]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /tasks error:', err.message);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Also handles drag-and-drop moves: column_id/swimlane_id/position are just
  // fields on the same PATCH-style update. Moving into a column flagged
  // is_done stamps completed_at; moving back out clears it.
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { title, description, priority, context, due_date, column_id, swimlane_id, position, clear_due_date } = req.body;

      let completedAtClause = 'completed_at';
      const values = [];
      if (column_id !== undefined) {
        const colCheck = await db.query('SELECT is_done FROM task_columns WHERE id = $1 AND client_id = $2', [column_id, clientId]);
        if (!colCheck.rows.length) return res.status(400).json({ error: 'Invalid column' });
        completedAtClause = colCheck.rows[0].is_done ? 'NOW()' : 'NULL';
      }

      const result = await db.query(
        `UPDATE tasks SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           context = COALESCE($4, context),
           due_date = CASE WHEN $5 THEN NULL ELSE COALESCE($6, due_date) END,
           column_id = COALESCE($7, column_id),
           swimlane_id = CASE WHEN $8 THEN NULL ELSE COALESCE($9, swimlane_id) END,
           position = COALESCE($10, position),
           completed_at = CASE WHEN $7::int IS NOT NULL THEN ${completedAtClause} ELSE completed_at END,
           updated_at = NOW()
         WHERE id = $11 AND client_id = $12
         RETURNING *`,
        [
          title ?? null, description ?? null, priority ?? null, context ?? null,
          !!clear_due_date, due_date ?? null,
          column_id ?? null,
          swimlane_id === null, swimlane_id ?? null,
          position ?? null,
          req.params.id, clientId,
        ]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /tasks/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await db.query('DELETE FROM tasks WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /tasks/:id error:', err.message);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
