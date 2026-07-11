'use strict';

const { parseWorkItemsMarkdown } = require('../lib/parse-work-items');

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS work_items (
    id              SERIAL PRIMARY KEY,
    type            VARCHAR(20)  NOT NULL,
    ticket_number   VARCHAR(50)  UNIQUE NOT NULL,
    title           TEXT         NOT NULL,
    submitter       VARCHAR(100),
    status          VARCHAR(50)  NOT NULL,
    priority        VARCHAR(50)  NOT NULL,
    imported_at     TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW(),
    deleted_at      TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items(type)`,
  `CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status)`,
  `CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority)`,
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

  // POST /bulk-import — body: { content: "<markdown table>" }
  router.post('/bulk-import', auth, async (req, res) => {
    try {
      const content = req.body?.content;
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'content is required' });
      }

      const items = parseWorkItemsMarkdown(content);
      let imported = 0;
      let duplicates = 0;

      for (const item of items) {
        const result = await db.query(
          `INSERT INTO work_items (type, ticket_number, title, status, priority)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (ticket_number) DO UPDATE SET
             type = EXCLUDED.type,
             title = EXCLUDED.title,
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             updated_at = NOW(),
             deleted_at = NULL
           RETURNING (xmax = 0) AS inserted`,
          [item.type, item.ticket_number, item.title, item.status, item.priority]
        );
        if (result.rows[0].inserted) imported++;
        else duplicates++;
      }

      res.json({ success: true, imported, duplicates });
    } catch (err) {
      console.error('Work items bulk-import error:', err.message);
      res.status(500).json({ error: 'Failed to import work items' });
    }
  });

  // GET / — filters: ?type=DFCT&status=Ready&priority=3%20-%20Moderate
  router.get('/', auth, async (req, res) => {
    try {
      const { type, status, priority } = req.query;
      const conditions = ['deleted_at IS NULL'];
      const values = [];

      if (type) {
        values.push(type);
        conditions.push(`type = $${values.length}`);
      }
      if (status) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }
      if (priority) {
        values.push(priority);
        conditions.push(`priority = $${values.length}`);
      }

      const result = await db.query(
        `SELECT id, type, ticket_number, title, submitter, status, priority, imported_at, updated_at
         FROM work_items
         WHERE ${conditions.join(' AND ')}
         ORDER BY ticket_number ASC`,
        values
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Work items fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work items' });
    }
  });

  // PUT /:id — body: { submitter?, status?, priority? }
  router.put('/:id', auth, async (req, res) => {
    try {
      const { submitter, status, priority } = req.body || {};
      const cols = [];
      const values = [];

      if (submitter !== undefined) { values.push(submitter); cols.push(`submitter = $${values.length}`); }
      if (status !== undefined)    { values.push(status);    cols.push(`status = $${values.length}`); }
      if (priority !== undefined)  { values.push(priority);  cols.push(`priority = $${values.length}`); }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await db.query(
        `UPDATE work_items SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} AND deleted_at IS NULL
         RETURNING id, type, ticket_number, title, submitter, status, priority, imported_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Work item not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Work items update error:', err.message);
      res.status(500).json({ error: 'Failed to update work item' });
    }
  });

  // DELETE /:id — soft delete
  router.delete('/:id', auth, async (req, res) => {
    try {
      const result = await db.query(
        `UPDATE work_items SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Work item not found' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Work items delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete work item' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
