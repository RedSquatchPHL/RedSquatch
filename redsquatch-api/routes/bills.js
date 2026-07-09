'use strict';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS bill_balances (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_reconciled_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bill_balances_client_id ON bill_balances(client_id)`,
  `CREATE TABLE IF NOT EXISTS recurring_bills (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    vendor VARCHAR(100),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_day INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(30) NOT NULL DEFAULT 'other',
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_credit_card BOOLEAN NOT NULL DEFAULT false,
    statement_close_day INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_bills_client_id ON recurring_bills(client_id)`,
  `CREATE TABLE IF NOT EXISTS bill_payments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    recurring_bill_id INTEGER REFERENCES recurring_bills(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bill_payments_client_id ON bill_payments(client_id)`,
  `CREATE TABLE IF NOT EXISTS bnpl_plans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    vendor VARCHAR(100) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    next_payment_amount NUMERIC(12,2),
    next_payment_date DATE,
    installments_total INTEGER,
    installments_remaining INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bnpl_plans_client_id ON bnpl_plans(client_id)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (username) {
    const result = await db.query(
      'SELECT id FROM client_users WHERE username = $1 LIMIT 1',
      [username]
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }
  return 1;
}

const CATEGORIES = ['utilities', 'subscriptions', 'insurance', 'other'];
const FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ─── Balances ───────────────────────────────────────────────────────────

  router.get('/balances', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM bill_balances WHERE client_id = $1 ORDER BY name ASC',
        [clientId]
      );
      res.json({ balances: result.rows });
    } catch (err) {
      console.error('Balances fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch balances' });
    }
  });

  router.post('/balances', auth, async (req, res) => {
    const { name, balance, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO bill_balances (client_id, name, balance, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, name.trim(), balance || 0, notes || null]
      );
      res.status(201).json({ balance: result.rows[0] });
    } catch (err) {
      console.error('Balance create error:', err.message);
      res.status(500).json({ error: 'Failed to create balance' });
    }
  });

  router.put('/balances/:id', auth, async (req, res) => {
    const { name, balance, notes } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query('SELECT * FROM bill_balances WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Balance not found' });
      const b = existing.rows[0];
      const result = await db.query(
        `UPDATE bill_balances SET name = $1, balance = $2, notes = $3, updated_at = NOW()
         WHERE id = $4 AND client_id = $5 RETURNING *`,
        [name !== undefined ? name.trim() : b.name, balance !== undefined ? balance : b.balance, notes !== undefined ? notes : b.notes, req.params.id, clientId]
      );
      res.json({ balance: result.rows[0] });
    } catch (err) {
      console.error('Balance update error:', err.message);
      res.status(500).json({ error: 'Failed to update balance' });
    }
  });

  // reconcile: confirms the balance is accurate as of now (optionally updates the figure)
  router.post('/balances/:id/reconcile', auth, async (req, res) => {
    const { balance } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query('SELECT * FROM bill_balances WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Balance not found' });
      const b = existing.rows[0];
      const result = await db.query(
        `UPDATE bill_balances SET balance = $1, last_reconciled_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND client_id = $3 RETURNING *`,
        [balance !== undefined ? balance : b.balance, req.params.id, clientId]
      );
      res.json({ balance: result.rows[0] });
    } catch (err) {
      console.error('Balance reconcile error:', err.message);
      res.status(500).json({ error: 'Failed to reconcile balance' });
    }
  });

  router.delete('/balances/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query('DELETE FROM bill_balances WHERE id = $1 AND client_id = $2 RETURNING id', [req.params.id, clientId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Balance not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Balance delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete balance' });
    }
  });

  // ─── Recurring bills ────────────────────────────────────────────────────

  router.get('/recurring', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM recurring_bills WHERE client_id = $1 ORDER BY due_day ASC, name ASC',
        [clientId]
      );
      res.json({ bills: result.rows });
    } catch (err) {
      console.error('Recurring bills fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  router.post('/recurring', auth, async (req, res) => {
    const { name, vendor, amount, due_day, category, frequency, is_credit_card, statement_close_day, notes } = req.body;
    if (!name || !due_day) return res.status(400).json({ error: 'name and due_day are required' });
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO recurring_bills (client_id, name, vendor, amount, due_day, category, frequency, is_credit_card, statement_close_day, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          clientId,
          name.trim(),
          vendor || null,
          amount || 0,
          due_day,
          CATEGORIES.includes(category) ? category : 'other',
          FREQUENCIES.includes(frequency) ? frequency : 'monthly',
          Boolean(is_credit_card),
          statement_close_day || null,
          notes || null,
        ]
      );
      res.status(201).json({ bill: result.rows[0] });
    } catch (err) {
      console.error('Recurring bill create error:', err.message);
      res.status(500).json({ error: 'Failed to create bill' });
    }
  });

  router.put('/recurring/:id', auth, async (req, res) => {
    const { name, vendor, amount, due_day, category, frequency, is_active, is_credit_card, statement_close_day, notes } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query('SELECT * FROM recurring_bills WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
      const b = existing.rows[0];
      const result = await db.query(
        `UPDATE recurring_bills SET
          name = $1, vendor = $2, amount = $3, due_day = $4, category = $5, frequency = $6,
          is_active = $7, is_credit_card = $8, statement_close_day = $9, notes = $10, updated_at = NOW()
         WHERE id = $11 AND client_id = $12 RETURNING *`,
        [
          name !== undefined ? name.trim() : b.name,
          vendor !== undefined ? vendor : b.vendor,
          amount !== undefined ? amount : b.amount,
          due_day !== undefined ? due_day : b.due_day,
          category && CATEGORIES.includes(category) ? category : b.category,
          frequency && FREQUENCIES.includes(frequency) ? frequency : b.frequency,
          is_active !== undefined ? Boolean(is_active) : b.is_active,
          is_credit_card !== undefined ? Boolean(is_credit_card) : b.is_credit_card,
          statement_close_day !== undefined ? statement_close_day : b.statement_close_day,
          notes !== undefined ? notes : b.notes,
          req.params.id,
          clientId,
        ]
      );
      res.json({ bill: result.rows[0] });
    } catch (err) {
      console.error('Recurring bill update error:', err.message);
      res.status(500).json({ error: 'Failed to update bill' });
    }
  });

  router.delete('/recurring/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query('DELETE FROM recurring_bills WHERE id = $1 AND client_id = $2 RETURNING id', [req.params.id, clientId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Recurring bill delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete bill' });
    }
  });

  router.post('/recurring/:id/pay', auth, async (req, res) => {
    const { amount } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query('SELECT * FROM recurring_bills WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
      const b = existing.rows[0];
      const result = await db.query(
        `INSERT INTO bill_payments (client_id, recurring_bill_id, amount, status)
         VALUES ($1, $2, $3, 'paid') RETURNING *`,
        [clientId, req.params.id, amount !== undefined ? amount : b.amount]
      );
      res.status(201).json({ payment: result.rows[0] });
    } catch (err) {
      console.error('Bill payment error:', err.message);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });

  router.get('/payments', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { recurring_bill_id } = req.query;
      const params = [clientId];
      let query = 'SELECT * FROM bill_payments WHERE client_id = $1';
      if (recurring_bill_id) {
        params.push(recurring_bill_id);
        query += ` AND recurring_bill_id = $${params.length}`;
      }
      query += ' ORDER BY paid_date DESC LIMIT 100';
      const result = await db.query(query, params);
      res.json({ payments: result.rows });
    } catch (err) {
      console.error('Payments fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // ─── BNPL plans ─────────────────────────────────────────────────────────

  router.get('/bnpl', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM bnpl_plans WHERE client_id = $1 ORDER BY next_payment_date ASC NULLS LAST',
        [clientId]
      );
      res.json({ plans: result.rows });
    } catch (err) {
      console.error('BNPL fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch BNPL plans' });
    }
  });

  router.post('/bnpl', auth, async (req, res) => {
    const { vendor, total_amount, remaining_amount, next_payment_amount, next_payment_date, installments_total, installments_remaining, notes } = req.body;
    if (!vendor) return res.status(400).json({ error: 'vendor is required' });
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO bnpl_plans (client_id, vendor, total_amount, remaining_amount, next_payment_amount, next_payment_date, installments_total, installments_remaining, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          clientId,
          vendor.trim(),
          total_amount || 0,
          remaining_amount !== undefined ? remaining_amount : total_amount || 0,
          next_payment_amount || null,
          next_payment_date || null,
          installments_total || null,
          installments_remaining || null,
          notes || null,
        ]
      );
      res.status(201).json({ plan: result.rows[0] });
    } catch (err) {
      console.error('BNPL create error:', err.message);
      res.status(500).json({ error: 'Failed to create BNPL plan' });
    }
  });

  router.put('/bnpl/:id', auth, async (req, res) => {
    const { vendor, total_amount, remaining_amount, next_payment_amount, next_payment_date, installments_total, installments_remaining, notes } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query('SELECT * FROM bnpl_plans WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
      const p = existing.rows[0];
      const result = await db.query(
        `UPDATE bnpl_plans SET
          vendor = $1, total_amount = $2, remaining_amount = $3, next_payment_amount = $4,
          next_payment_date = $5, installments_total = $6, installments_remaining = $7, notes = $8, updated_at = NOW()
         WHERE id = $9 AND client_id = $10 RETURNING *`,
        [
          vendor !== undefined ? vendor.trim() : p.vendor,
          total_amount !== undefined ? total_amount : p.total_amount,
          remaining_amount !== undefined ? remaining_amount : p.remaining_amount,
          next_payment_amount !== undefined ? next_payment_amount : p.next_payment_amount,
          next_payment_date !== undefined ? next_payment_date : p.next_payment_date,
          installments_total !== undefined ? installments_total : p.installments_total,
          installments_remaining !== undefined ? installments_remaining : p.installments_remaining,
          notes !== undefined ? notes : p.notes,
          req.params.id,
          clientId,
        ]
      );
      res.json({ plan: result.rows[0] });
    } catch (err) {
      console.error('BNPL update error:', err.message);
      res.status(500).json({ error: 'Failed to update BNPL plan' });
    }
  });

  router.delete('/bnpl/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query('DELETE FROM bnpl_plans WHERE id = $1 AND client_id = $2 RETURNING id', [req.params.id, clientId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('BNPL delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete BNPL plan' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations };
