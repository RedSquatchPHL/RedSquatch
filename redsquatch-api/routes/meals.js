'use strict';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL DEFAULT 'dinner',
    meal_name VARCHAR(200) NOT NULL,
    recipe_url VARCHAR(500),
    ingredients TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_meal_plans_client_date ON meal_plans(client_id, date)`,
  `CREATE TABLE IF NOT EXISTS grocery_lists (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Grocery List',
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_grocery_lists_client_id ON grocery_lists(client_id)`,
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

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// Monday-anchored week window for a given anchor date string (YYYY-MM-DD)
function weekRange(anchor) {
  const d = new Date(`${anchor}T00:00:00`);
  const dow = d.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x) => x.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

function aggregateIngredients(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!row.ingredients) continue;
    const parts = row.ingredients.split(',').map((s) => s.trim()).filter(Boolean);
    for (const item of parts) {
      const key = item.toLowerCase();
      if (!seen.has(key)) seen.set(key, { item, qty: '', checked: false });
    }
  }
  return Array.from(seen.values());
}

function toCsv(items) {
  const header = 'item,quantity,unit,checked';
  const lines = items.map((i) => {
    const item = (i.item || '').replace(/"/g, '""');
    const qty = (i.qty ?? '').toString().replace(/"/g, '""');
    const unit = (i.unit ?? '').toString().replace(/"/g, '""');
    return `"${item}","${qty}","${unit}",${i.checked ? 'true' : 'false'}`;
  });
  return [header, ...lines].join('\n');
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET /meals?date=YYYY-MM-DD  -> Mon-Sun week containing date
  // GET /meals?start=YYYY-MM-DD&end=YYYY-MM-DD -> explicit range
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      let { start, end, date } = req.query;
      if (!start || !end) {
        const anchor = date || new Date().toISOString().split('T')[0];
        ({ start, end } = weekRange(anchor));
      }
      const result = await db.query(
        `SELECT * FROM meal_plans WHERE client_id = $1 AND date BETWEEN $2 AND $3
         ORDER BY date ASC, meal_type ASC`,
        [clientId, start, end]
      );
      res.json({ meals: result.rows, range: { start, end } });
    } catch (err) {
      console.error('Meals fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch meals' });
    }
  });

  router.post('/', auth, async (req, res) => {
    const { date, meal_type, meal_name, recipe_url, ingredients, notes } = req.body;
    if (!date || !meal_name) return res.status(400).json({ error: 'date and meal_name are required' });
    const type = MEAL_TYPES.includes(meal_type) ? meal_type : 'dinner';
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO meal_plans (client_id, date, meal_type, meal_name, recipe_url, ingredients, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [clientId, date, type, meal_name.trim(), recipe_url || null, ingredients || null, notes || null]
      );
      res.status(201).json({ meal: result.rows[0] });
    } catch (err) {
      console.error('Meal create error:', err.message);
      res.status(500).json({ error: 'Failed to create meal' });
    }
  });

  router.put('/:id', auth, async (req, res) => {
    const { date, meal_type, meal_name, recipe_url, ingredients, notes } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query(
        'SELECT * FROM meal_plans WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Meal not found' });
      const m = existing.rows[0];
      const type = meal_type && MEAL_TYPES.includes(meal_type) ? meal_type : m.meal_type;
      const result = await db.query(
        `UPDATE meal_plans SET
          date        = $1,
          meal_type   = $2,
          meal_name   = $3,
          recipe_url  = $4,
          ingredients = $5,
          notes       = $6,
          updated_at  = NOW()
         WHERE id = $7 AND client_id = $8 RETURNING *`,
        [
          date || m.date,
          type,
          meal_name !== undefined ? meal_name.trim() : m.meal_name,
          recipe_url !== undefined ? recipe_url : m.recipe_url,
          ingredients !== undefined ? ingredients : m.ingredients,
          notes !== undefined ? notes : m.notes,
          req.params.id,
          clientId,
        ]
      );
      res.json({ meal: result.rows[0] });
    } catch (err) {
      console.error('Meal update error:', err.message);
      res.status(500).json({ error: 'Failed to update meal' });
    }
  });

  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'DELETE FROM meal_plans WHERE id = $1 AND client_id = $2 RETURNING id',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Meal not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Meal delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete meal' });
    }
  });

  // GET /grocery-list?start=&end= -> aggregated (not saved) ingredient list for a range
  router.get('/grocery-list', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      let { start, end, date } = req.query;
      if (!start || !end) {
        const anchor = date || new Date().toISOString().split('T')[0];
        ({ start, end } = weekRange(anchor));
      }
      const result = await db.query(
        `SELECT ingredients FROM meal_plans WHERE client_id = $1 AND date BETWEEN $2 AND $3`,
        [clientId, start, end]
      );
      res.json({ items: aggregateIngredients(result.rows), range: { start, end } });
    } catch (err) {
      console.error('Grocery list build error:', err.message);
      res.status(500).json({ error: 'Failed to build grocery list' });
    }
  });

  // POST /grocery-list -> save/update a named grocery list
  router.post('/grocery-list', auth, async (req, res) => {
    const { name, items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array is required' });
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `INSERT INTO grocery_lists (client_id, name, items) VALUES ($1, $2, $3) RETURNING *`,
        [clientId, name?.trim() || `Week of ${new Date().toISOString().split('T')[0]}`, JSON.stringify(items)]
      );
      res.status(201).json({ list: result.rows[0] });
    } catch (err) {
      console.error('Grocery list save error:', err.message);
      res.status(500).json({ error: 'Failed to save grocery list' });
    }
  });

  // GET /grocery-list/export?start=&end= -> CSV text generated from current range
  router.get('/grocery-list/export', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      let { start, end, date } = req.query;
      if (!start || !end) {
        const anchor = date || new Date().toISOString().split('T')[0];
        ({ start, end } = weekRange(anchor));
      }
      const result = await db.query(
        `SELECT ingredients FROM meal_plans WHERE client_id = $1 AND date BETWEEN $2 AND $3`,
        [clientId, start, end]
      );
      const items = aggregateIngredients(result.rows);
      res.json({ csv: toCsv(items), items });
    } catch (err) {
      console.error('Grocery list export error:', err.message);
      res.status(500).json({ error: 'Failed to export grocery list' });
    }
  });

  // GET /grocery-lists -> all saved lists
  router.get('/grocery-lists', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM grocery_lists WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );
      res.json({ lists: result.rows });
    } catch (err) {
      console.error('Grocery lists fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch grocery lists' });
    }
  });

  // PUT /grocery-lists/:id -> update items (e.g. toggle checked) or name
  router.put('/grocery-lists/:id', auth, async (req, res) => {
    const { name, items } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const existing = await db.query(
        'SELECT * FROM grocery_lists WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'List not found' });
      const l = existing.rows[0];
      const result = await db.query(
        `UPDATE grocery_lists SET name = $1, items = $2, updated_at = NOW()
         WHERE id = $3 AND client_id = $4 RETURNING *`,
        [name?.trim() || l.name, items !== undefined ? JSON.stringify(items) : l.items, req.params.id, clientId]
      );
      res.json({ list: result.rows[0] });
    } catch (err) {
      console.error('Grocery list update error:', err.message);
      res.status(500).json({ error: 'Failed to update grocery list' });
    }
  });

  router.delete('/grocery-lists/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'DELETE FROM grocery_lists WHERE id = $1 AND client_id = $2 RETURNING id',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'List not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Grocery list delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete grocery list' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations };
