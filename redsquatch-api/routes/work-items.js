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
      const conditions = ['wi.deleted_at IS NULL'];
      const values = [];

      if (type) {
        values.push(type);
        conditions.push(`wi.type = $${values.length}`);
      }
      if (status) {
        values.push(status);
        conditions.push(`wi.status = $${values.length}`);
      }
      if (priority) {
        values.push(priority);
        conditions.push(`wi.priority = $${values.length}`);
      }

      const result = await db.query(
        `SELECT wi.id, wi.type, wi.ticket_number, wi.title, wi.submitter, wi.status, wi.priority,
                wi.imported_at, wi.updated_at, wi.group_id, wg.name AS group_name
         FROM work_items wi
         LEFT JOIN work_groups wg ON wg.id = wi.group_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY wi.ticket_number ASC`,
        values
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Work items fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work items' });
    }
  });

  // PUT /:id — body: { submitter?, status?, priority?, group_id? }
  router.put('/:id', auth, async (req, res) => {
    try {
      const { submitter, status, priority, group_id } = req.body || {};
      const cols = [];
      const values = [];

      if (submitter !== undefined) { values.push(submitter); cols.push(`submitter = $${values.length}`); }
      if (status !== undefined)    { values.push(status);    cols.push(`status = $${values.length}`); }
      if (priority !== undefined)  { values.push(priority);  cols.push(`priority = $${values.length}`); }
      if (group_id !== undefined)  { values.push(group_id);  cols.push(`group_id = $${values.length}`); }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await db.query(
        `UPDATE work_items SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} AND deleted_at IS NULL
         RETURNING id, type, ticket_number, title, submitter, status, priority, imported_at, updated_at, group_id`,
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

  // GET /relationships — all parent/child links, with ticket labels joined in
  router.get('/relationships', auth, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT r.id, r.parent_id, r.child_id, r.relationship_type, r.created_at,
                p.ticket_number AS parent_ticket, p.title AS parent_title,
                c.ticket_number AS child_ticket, c.title AS child_title
         FROM work_item_relationships r
         JOIN work_items p ON p.id = r.parent_id
         JOIN work_items c ON c.id = r.child_id
         ORDER BY r.created_at ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Relationships fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch relationships' });
    }
  });

  // POST /relationships — body: { parent_id, child_id, relationship_type? }
  router.post('/relationships', auth, async (req, res) => {
    try {
      const { parent_id, child_id, relationship_type } = req.body || {};
      if (!parent_id || !child_id) {
        return res.status(400).json({ error: 'parent_id and child_id are required' });
      }
      if (Number(parent_id) === Number(child_id)) {
        return res.status(400).json({ error: 'An item cannot be its own parent' });
      }
      const result = await db.query(
        `INSERT INTO work_item_relationships (parent_id, child_id, relationship_type)
         VALUES ($1, $2, $3) RETURNING *`,
        [parent_id, child_id, relationship_type || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Relationship create error:', err.message);
      res.status(500).json({ error: 'Failed to create relationship' });
    }
  });

  // DELETE /relationships/:id
  router.delete('/relationships/:id', auth, async (req, res) => {
    try {
      const result = await db.query(
        `DELETE FROM work_item_relationships WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Relationship not found' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Relationship delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete relationship' });
    }
  });

  // POST /link-group — body: { ids: number[], group_id: number|null }
  router.post('/link-group', auth, async (req, res) => {
    try {
      const { ids, group_id } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array' });
      }
      const result = await db.query(
        `UPDATE work_items SET group_id = $1, updated_at = NOW()
         WHERE id = ANY($2::int[]) AND deleted_at IS NULL
         RETURNING id`,
        [group_id ?? null, ids]
      );
      res.json({ success: true, linked: result.rows.length });
    } catch (err) {
      console.error('Work items link-group error:', err.message);
      res.status(500).json({ error: 'Failed to link work items to group' });
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
