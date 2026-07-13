'use strict';

const express = require('express');
const { parseDemandXml } = require('../lib/parse-demand-xml');

// Intake + Groups MVP — discovery/demand forms grouped under work_groups.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS work_groups (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'In Discovery',
    follow_up_flag  BOOLEAN DEFAULT FALSE,
    follow_up_date  DATE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS discovery_forms (
    id                   SERIAL PRIMARY KEY,
    group_id             INT REFERENCES work_groups(id) ON DELETE CASCADE,
    snwr_number          VARCHAR(50),
    requester_name       VARCHAR(100),
    requester_dept       VARCHAR(100),
    their_process        TEXT,
    expected_outcome     TEXT,
    pain_points          TEXT,
    ideal_method         TEXT,
    your_interpretation  TEXT,
    custom_questions     JSONB DEFAULT '[]'::jsonb,
    status               VARCHAR(50) DEFAULT 'In Progress',
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS demand_forms (
    id                 SERIAL PRIMARY KEY,
    group_id           INT REFERENCES work_groups(id) ON DELETE CASCADE,
    discovery_form_id  INT REFERENCES discovery_forms(id) ON DELETE SET NULL,
    business_case      TEXT,
    assumptions        TEXT,
    enablers           TEXT,
    in_scope           TEXT,
    out_of_scope       TEXT,
    barriers           TEXT,
    fixes              TEXT,
    status             VARCHAR(50) DEFAULT 'Draft',
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS work_group_contents (
    id            SERIAL PRIMARY KEY,
    group_id      INT NOT NULL REFERENCES work_groups(id) ON DELETE CASCADE,
    content_type  VARCHAR(50) NOT NULL,
    content_id    INT,
    added_at      TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS work_item_relationships (
    id                 SERIAL PRIMARY KEY,
    parent_id          INT REFERENCES work_items(id) ON DELETE CASCADE,
    child_id           INT REFERENCES work_items(id) ON DELETE CASCADE,
    relationship_type  VARCHAR(50),
    created_at         TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE work_items ADD COLUMN IF NOT EXISTS group_id INT REFERENCES work_groups(id) ON DELETE SET NULL`,
  `ALTER TABLE discovery_forms ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb`,
  `CREATE INDEX IF NOT EXISTS idx_work_groups_status ON work_groups(status)`,
  `CREATE INDEX IF NOT EXISTS idx_discovery_forms_group ON discovery_forms(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_demand_forms_group ON demand_forms(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_work_group_contents_group ON work_group_contents(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_work_items_group ON work_items(group_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

// ─── Markdown export templates ─────────────────────────────────────────────

function discoveryMarkdown(form) {
  return `# Discovery Form

**SNWR:** ${form.snwr_number || '—'}
**Requester:** ${form.requester_name || '—'}, ${form.requester_dept || '—'}
**Date:** ${new Date().toISOString().split('T')[0]}

## Their Process
${form.their_process || ''}

## Expected Outcome
${form.expected_outcome || ''}

## Pain Points
${form.pain_points || ''}

## Ideal Method
${form.ideal_method || ''}

## Your Interpretation
${form.your_interpretation || ''}
${(form.custom_questions || []).map(q => `
## ${q.question || 'Untitled Question'}
${q.answer || ''}
`).join('')}
---
*Status: ${form.status}*
`;
}

function demandMarkdown(form, discovery) {
  return `# Demand Form

**Status:** ${form.status}
${discovery ? `**From Discovery:** ${discovery.snwr_number || '—'}` : ''}

## Business Case
${form.business_case || ''}

## Assumptions
${form.assumptions || ''}

## Enablers
${form.enablers || ''}

## In Scope
${form.in_scope || ''}

## Out of Scope
${form.out_of_scope || ''}

## Barriers
${form.barriers || ''}

## Fixes
${form.fixes || ''}

---
*Generated: ${new Date().toISOString()}*
`;
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ── Groups ─────────────────────────────────────────────────────────────

  router.post('/groups', auth, async (req, res) => {
    try {
      const { name, description, status, follow_up_flag, follow_up_date } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const result = await db.query(
        `INSERT INTO work_groups (name, description, status, follow_up_flag, follow_up_date)
         VALUES ($1, $2, COALESCE($3, 'In Discovery'), COALESCE($4, FALSE), $5)
         RETURNING *`,
        [name.trim(), description ?? null, status ?? null, follow_up_flag ?? null, follow_up_date ?? null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Group create error:', err.message);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  router.get('/groups', auth, async (req, res) => {
    try {
      const { status } = req.query;
      const conditions = [];
      const values = [];
      if (status) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await db.query(
        `SELECT * FROM work_groups ${where} ORDER BY updated_at DESC`,
        values
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Groups fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  // GET /groups/report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
  // Must be defined before /groups/:id so "report" isn't matched as an id.
  router.get('/groups/report', auth, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' });
      }

      const groups = await db.query('SELECT * FROM work_groups ORDER BY updated_at DESC');

      const report = await Promise.all(
        groups.rows.map(async (group) => {
          const journals = await db.query(
            `SELECT wj.* FROM work_journal wj
             JOIN work_items wi ON wi.id = wj.work_item_id
             WHERE wi.group_id = $1 AND wj.session_date BETWEEN $2 AND $3
             ORDER BY wj.session_date DESC, wj.created_at DESC`,
            [group.id, start_date, end_date]
          );

          const items = await db.query('SELECT * FROM work_items WHERE group_id = $1', [group.id]);

          return {
            group,
            journal_count: journals.rows.length,
            item_count: items.rows.length,
            recent_updates: journals.rows.slice(0, 3),
          };
        })
      );

      const active = report.filter(r => r.journal_count > 0);
      const inactive = report.filter(r => r.journal_count === 0);

      res.json({
        period: { start_date, end_date },
        active,
        inactive,
        summary: { total_groups: report.length, active_count: active.length },
      });
    } catch (err) {
      console.error('Groups report error:', err.message);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  router.get('/groups/:id', auth, async (req, res) => {
    try {
      const groupResult = await db.query('SELECT * FROM work_groups WHERE id = $1', [req.params.id]);
      if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      const [discovery, demand, workItems, journal] = await Promise.all([
        db.query('SELECT * FROM discovery_forms WHERE group_id = $1 ORDER BY created_at ASC', [req.params.id]),
        db.query('SELECT * FROM demand_forms WHERE group_id = $1 ORDER BY created_at ASC', [req.params.id]),
        db.query(
          `SELECT id, type, ticket_number, title, submitter, status, priority
           FROM work_items WHERE group_id = $1 AND deleted_at IS NULL ORDER BY ticket_number ASC`,
          [req.params.id]
        ),
        db.query(
          `SELECT wj.*, wi.ticket_number, wi.title AS item_title
           FROM work_journal wj
           JOIN work_items wi ON wi.id = wj.work_item_id
           WHERE wi.group_id = $1
           ORDER BY wj.session_date DESC, wj.created_at DESC`,
          [req.params.id]
        ),
      ]);
      res.json({
        ...groupResult.rows[0],
        discovery_forms: discovery.rows,
        demand_forms: demand.rows,
        work_items: workItems.rows,
        journal_entries: journal.rows,
      });
    } catch (err) {
      console.error('Group detail fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch group' });
    }
  });

  router.put('/groups/:id', auth, async (req, res) => {
    try {
      const { name, description, status, follow_up_flag, follow_up_date } = req.body || {};
      const cols = [];
      const values = [];
      if (name !== undefined)           { values.push(name.trim());     cols.push(`name = $${values.length}`); }
      if (description !== undefined)    { values.push(description);     cols.push(`description = $${values.length}`); }
      if (status !== undefined)         { values.push(status);          cols.push(`status = $${values.length}`); }
      if (follow_up_flag !== undefined) { values.push(follow_up_flag);  cols.push(`follow_up_flag = $${values.length}`); }
      if (follow_up_date !== undefined) { values.push(follow_up_date);  cols.push(`follow_up_date = $${values.length}`); }

      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await db.query(
        `UPDATE work_groups SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Group update error:', err.message);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  router.delete('/groups/:id', auth, async (req, res) => {
    try {
      const result = await db.query('DELETE FROM work_groups WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Group delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  // ── Discovery forms ────────────────────────────────────────────────────

  router.post('/groups/:id/discovery', auth, async (req, res) => {
    try {
      const group = await db.query('SELECT id FROM work_groups WHERE id = $1', [req.params.id]);
      if (group.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      const {
        snwr_number, requester_name, requester_dept,
        their_process, expected_outcome, pain_points, ideal_method, your_interpretation,
        custom_questions,
      } = req.body || {};
      const result = await db.query(
        `INSERT INTO discovery_forms
           (group_id, snwr_number, requester_name, requester_dept,
            their_process, expected_outcome, pain_points, ideal_method, your_interpretation,
            custom_questions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          req.params.id,
          snwr_number ?? null, requester_name ?? null, requester_dept ?? null,
          their_process ?? null, expected_outcome ?? null, pain_points ?? null,
          ideal_method ?? null, your_interpretation ?? null,
          JSON.stringify(custom_questions ?? []),
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Discovery create error:', err.message);
      res.status(500).json({ error: 'Failed to create discovery form' });
    }
  });

  router.get('/groups/:id/discovery', auth, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM discovery_forms WHERE group_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Discovery fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch discovery forms' });
    }
  });

  router.put('/discovery/:id', auth, async (req, res) => {
    try {
      const fields = [
        'snwr_number', 'requester_name', 'requester_dept', 'their_process',
        'expected_outcome', 'pain_points', 'ideal_method', 'your_interpretation',
        'custom_questions', 'status',
      ];
      const cols = [];
      const values = [];
      for (const f of fields) {
        if (req.body?.[f] !== undefined) {
          values.push(f === 'custom_questions' ? JSON.stringify(req.body[f]) : req.body[f]);
          cols.push(`${f} = $${values.length}`);
        }
      }
      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      values.push(req.params.id);
      const result = await db.query(
        `UPDATE discovery_forms SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Discovery form not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Discovery update error:', err.message);
      res.status(500).json({ error: 'Failed to update discovery form' });
    }
  });

  router.get('/discovery/:id/export', auth, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM discovery_forms WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Discovery form not found' });
      }
      const md = discoveryMarkdown(result.rows[0]);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="discovery-${req.params.id}.md"`);
      res.send(md);
    } catch (err) {
      console.error('Discovery export error:', err.message);
      res.status(500).json({ error: 'Failed to export discovery form' });
    }
  });

  // ── Demand forms ───────────────────────────────────────────────────────

  router.post('/groups/:id/demand', auth, async (req, res) => {
    try {
      const group = await db.query('SELECT id FROM work_groups WHERE id = $1', [req.params.id]);
      if (group.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      const {
        discovery_form_id, business_case, assumptions, enablers,
        in_scope, out_of_scope, barriers, fixes,
      } = req.body || {};
      const result = await db.query(
        `INSERT INTO demand_forms
           (group_id, discovery_form_id, business_case, assumptions, enablers, in_scope, out_of_scope, barriers, fixes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.params.id, discovery_form_id ?? null,
          business_case ?? null, assumptions ?? null, enablers ?? null,
          in_scope ?? null, out_of_scope ?? null, barriers ?? null, fixes ?? null,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Demand create error:', err.message);
      res.status(500).json({ error: 'Failed to create demand form' });
    }
  });

  router.get('/groups/:id/demand', auth, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM demand_forms WHERE group_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Demand fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch demand forms' });
    }
  });

  router.put('/demand/:id', auth, async (req, res) => {
    try {
      const fields = [
        'discovery_form_id', 'business_case', 'assumptions', 'enablers',
        'in_scope', 'out_of_scope', 'barriers', 'fixes', 'status',
      ];
      const cols = [];
      const values = [];
      for (const f of fields) {
        if (req.body?.[f] !== undefined) {
          values.push(req.body[f]);
          cols.push(`${f} = $${values.length}`);
        }
      }
      if (cols.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      values.push(req.params.id);
      const result = await db.query(
        `UPDATE demand_forms SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Demand form not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Demand update error:', err.message);
      res.status(500).json({ error: 'Failed to update demand form' });
    }
  });

  // Parses a ServiceNow dmn_demand XML export into demand_forms fields.
  // Pure extraction — no DB write; the caller PUTs the result to
  // /demand/:id itself so the existing save/patch flow stays the single
  // write path for demand forms.
  router.post('/demand/parse-xml', auth, express.text({ type: () => true, limit: '5mb' }), (req, res) => {
    try {
      const extracted = parseDemandXml(req.body || '');
      res.json(extracted);
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to parse XML' });
    }
  });

  router.get('/demand/:id/export', auth, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM demand_forms WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Demand form not found' });
      }
      const form = result.rows[0];
      let discovery = null;
      if (form.discovery_form_id) {
        const d = await db.query('SELECT * FROM discovery_forms WHERE id = $1', [form.discovery_form_id]);
        discovery = d.rows[0] ?? null;
      }
      const md = demandMarkdown(form, discovery);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="demand-${req.params.id}.md"`);
      res.send(md);
    } catch (err) {
      console.error('Demand export error:', err.message);
      res.status(500).json({ error: 'Failed to export demand form' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
