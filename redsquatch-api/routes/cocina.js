'use strict';

// Cocina de Salsa: pantry tracker + salsa recipe book + shopping list.
// Follows the same { runMigrations(db), makeRouter(db) } shape as the other
// route modules (see fan-tracker.js / citizenship.js) — local `auth`
// middleware and a local `getClientId` helper, no shared cross-file utility.

const VALID_HEAT = ['mild', 'medium', 'hot'];
const VALID_STORAGE = ['fresh', 'dried', 'jarred', 'frozen'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cocina_pantry_items (
    id                SERIAL PRIMARY KEY,
    client_id         INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    category          VARCHAR(100),
    quantity          VARCHAR(50),
    unit              VARCHAR(50),
    storage_condition VARCHAR(20) NOT NULL DEFAULT 'fresh',
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_pantry_items_client_id ON cocina_pantry_items(client_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsas (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    heat_level    VARCHAR(10) NOT NULL DEFAULT 'medium',
    prep_minutes  INTEGER,
    rating        INTEGER,
    tags          JSONB NOT NULL DEFAULT '[]',
    image_url     TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsas_client_id ON cocina_salsas(client_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsa_ingredients (
    id          SERIAL PRIMARY KEY,
    salsa_id    INTEGER NOT NULL REFERENCES cocina_salsas(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    VARCHAR(100),
    sort_order  INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsa_ingredients_salsa_id ON cocina_salsa_ingredients(salsa_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsa_steps (
    id            SERIAL PRIMARY KEY,
    salsa_id      INTEGER NOT NULL REFERENCES cocina_salsas(id) ON DELETE CASCADE,
    step_number   INTEGER NOT NULL,
    instruction   TEXT NOT NULL,
    minutes       INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsa_steps_salsa_id ON cocina_salsa_steps(salsa_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_shopping_items (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    VARCHAR(100),
    checked     BOOLEAN NOT NULL DEFAULT FALSE,
    source      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_shopping_items_client_id ON cocina_shopping_items(client_id)`,
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

// Case-insensitive, trimmed name match — good enough at personal-pantry scale
// (a few dozen rows), so this stays plain JS instead of a fuzzy-match SQL join.
function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

async function attachPantryMatch(db, clientId, salsas) {
  if (salsas.length === 0) return [];

  const salsaIds = salsas.map(s => s.id);
  const [ingredientsResult, pantryResult] = await Promise.all([
    db.query(
      `SELECT id, salsa_id, name, quantity, sort_order FROM cocina_salsa_ingredients
       WHERE salsa_id = ANY($1::int[]) ORDER BY salsa_id, sort_order, id`,
      [salsaIds]
    ),
    db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
  ]);

  const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
  const ingredientsBySalsa = new Map();
  for (const ing of ingredientsResult.rows) {
    if (!ingredientsBySalsa.has(ing.salsa_id)) ingredientsBySalsa.set(ing.salsa_id, []);
    ingredientsBySalsa.get(ing.salsa_id).push(ing);
  }

  return salsas.map(salsa => {
    const ingredients = ingredientsBySalsa.get(salsa.id) || [];
    const total = ingredients.length;
    const inPantry = ingredients.filter(ing => pantryNames.has(normalizeName(ing.name))).length;
    return {
      ...salsa,
      ingredient_count: total,
      pantry_match_pct: total === 0 ? 0 : Math.round((inPantry / total) * 100),
      missing_count: total - inPantry,
    };
  });
}

async function replaceIngredientsAndSteps(client, salsaId, ingredients, steps) {
  await client.query(`DELETE FROM cocina_salsa_ingredients WHERE salsa_id = $1`, [salsaId]);
  await client.query(`DELETE FROM cocina_salsa_steps WHERE salsa_id = $1`, [salsaId]);

  const ingredientRows = Array.isArray(ingredients) ? ingredients : [];
  for (let i = 0; i < ingredientRows.length; i++) {
    const ing = ingredientRows[i];
    if (!ing?.name || !String(ing.name).trim()) continue;
    await client.query(
      `INSERT INTO cocina_salsa_ingredients (salsa_id, name, quantity, sort_order) VALUES ($1, $2, $3, $4)`,
      [salsaId, String(ing.name).trim(), ing.quantity || null, i]
    );
  }

  const stepRows = Array.isArray(steps) ? steps : [];
  for (let i = 0; i < stepRows.length; i++) {
    const step = stepRows[i];
    if (!step?.instruction || !String(step.instruction).trim()) continue;
    await client.query(
      `INSERT INTO cocina_salsa_steps (salsa_id, step_number, instruction, minutes) VALUES ($1, $2, $3, $4)`,
      [salsaId, i + 1, String(step.instruction).trim(), step.minutes ?? null]
    );
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ---- Pantry ----

  router.get('/pantry', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM cocina_pantry_items WHERE client_id = $1 ORDER BY created_at DESC, id DESC`,
        [clientId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Cocina pantry fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch pantry' });
    }
  });

  router.post('/pantry', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, category, quantity, unit, storage_condition } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      const storage = VALID_STORAGE.includes(storage_condition) ? storage_condition : 'fresh';

      const result = await db.query(
        `INSERT INTO cocina_pantry_items (client_id, name, category, quantity, unit, storage_condition)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [clientId, String(name).trim(), category || null, quantity || null, unit || null, storage]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Cocina pantry create error:', err.message);
      res.status(500).json({ error: 'Failed to add pantry item' });
    }
  });

  router.put('/pantry/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, category, quantity, unit, storage_condition } = req.body || {};
      const storage = storage_condition !== undefined
        ? (VALID_STORAGE.includes(storage_condition) ? storage_condition : 'fresh')
        : undefined;

      const result = await db.query(
        `UPDATE cocina_pantry_items SET
           name = COALESCE($1, name),
           category = COALESCE($2, category),
           quantity = COALESCE($3, quantity),
           unit = COALESCE($4, unit),
           storage_condition = COALESCE($5, storage_condition),
           updated_at = NOW()
         WHERE id = $6 AND client_id = $7 RETURNING *`,
        [name ?? null, category ?? null, quantity ?? null, unit ?? null, storage ?? null, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pantry item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina pantry update error:', err.message);
      res.status(500).json({ error: 'Failed to update pantry item' });
    }
  });

  router.delete('/pantry/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_pantry_items WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pantry item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina pantry delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete pantry item' });
    }
  });

  // ---- Salsas ----

  router.get('/salsas', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { heat, maxMinutes } = req.query;

      const conditions = ['client_id = $1'];
      const params = [clientId];
      if (heat && VALID_HEAT.includes(heat)) {
        params.push(heat);
        conditions.push(`heat_level = $${params.length}`);
      }
      if (maxMinutes && !Number.isNaN(Number(maxMinutes))) {
        params.push(Number(maxMinutes));
        conditions.push(`prep_minutes IS NOT NULL AND prep_minutes <= $${params.length}`);
      }

      const result = await db.query(
        `SELECT * FROM cocina_salsas WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC, id DESC`,
        params
      );
      const salsas = await attachPantryMatch(db, clientId, result.rows);
      res.json({ salsas });
    } catch (err) {
      console.error('Cocina salsas fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch salsas' });
    }
  });

  router.get('/salsas/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const salsaResult = await db.query(
        `SELECT * FROM cocina_salsas WHERE id = $1 AND client_id = $2`,
        [req.params.id, clientId]
      );
      if (salsaResult.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });

      const [ingredientsResult, stepsResult, pantryResult] = await Promise.all([
        db.query(
          `SELECT * FROM cocina_salsa_ingredients WHERE salsa_id = $1 ORDER BY sort_order, id`,
          [req.params.id]
        ),
        db.query(
          `SELECT * FROM cocina_salsa_steps WHERE salsa_id = $1 ORDER BY step_number, id`,
          [req.params.id]
        ),
        db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
      ]);

      const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
      const ingredients = ingredientsResult.rows.map(ing => ({
        ...ing,
        in_pantry: pantryNames.has(normalizeName(ing.name)),
      }));

      res.json({ ...salsaResult.rows[0], ingredients, steps: stepsResult.rows });
    } catch (err) {
      console.error('Cocina salsa detail fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch salsa' });
    }
  });

  router.post('/salsas', auth, async (req, res) => {
    const { title, description, heat_level, prep_minutes, tags, ingredients, steps } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    const heat = VALID_HEAT.includes(heat_level) ? heat_level : 'medium';

    const client = await db.connect();
    try {
      const clientId = await getClientId(db, req);
      await client.query('BEGIN');
      const salsaResult = await client.query(
        `INSERT INTO cocina_salsas (client_id, title, description, heat_level, prep_minutes, tags, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          clientId,
          String(title).trim(),
          description || null,
          heat,
          prep_minutes ?? null,
          JSON.stringify(Array.isArray(tags) ? tags : []),
          req.body?.image_url || null,
        ]
      );
      const salsa = salsaResult.rows[0];
      await replaceIngredientsAndSteps(client, salsa.id, ingredients, steps);
      await client.query('COMMIT');
      res.status(201).json(salsa);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Cocina salsa create error:', err.message);
      res.status(500).json({ error: 'Failed to create salsa' });
    } finally {
      client.release();
    }
  });

  router.put('/salsas/:id', auth, async (req, res) => {
    const { title, description, heat_level, prep_minutes, tags, ingredients, steps } = req.body || {};
    const heat = VALID_HEAT.includes(heat_level) ? heat_level : undefined;

    const client = await db.connect();
    try {
      const clientId = await getClientId(db, req);
      await client.query('BEGIN');
      const salsaResult = await client.query(
        `UPDATE cocina_salsas SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           heat_level = COALESCE($3, heat_level),
           prep_minutes = COALESCE($4, prep_minutes),
           tags = COALESCE($5, tags),
           image_url = COALESCE($6, image_url),
           updated_at = NOW()
         WHERE id = $7 AND client_id = $8 RETURNING *`,
        [
          title ? String(title).trim() : null,
          description ?? null,
          heat ?? null,
          prep_minutes ?? null,
          tags ? JSON.stringify(tags) : null,
          req.body?.image_url ?? null,
          req.params.id,
          clientId,
        ]
      );
      if (salsaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Salsa not found' });
      }
      const salsa = salsaResult.rows[0];
      if (ingredients !== undefined || steps !== undefined) {
        await replaceIngredientsAndSteps(client, salsa.id, ingredients, steps);
      }
      await client.query('COMMIT');
      res.json(salsa);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Cocina salsa update error:', err.message);
      res.status(500).json({ error: 'Failed to update salsa' });
    } finally {
      client.release();
    }
  });

  router.delete('/salsas/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_salsas WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina salsa delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete salsa' });
    }
  });

  router.put('/salsas/:id/rating', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'rating must be an integer 1-5' });
      }
      const result = await db.query(
        `UPDATE cocina_salsas SET rating = $1, updated_at = NOW() WHERE id = $2 AND client_id = $3 RETURNING *`,
        [rating, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina salsa rating error:', err.message);
      res.status(500).json({ error: 'Failed to rate salsa' });
    }
  });

  // ---- Shopping list ----

  router.get('/shopping', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM cocina_shopping_items WHERE client_id = $1 ORDER BY checked, created_at, id`,
        [clientId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Cocina shopping fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
  });

  router.post('/shopping', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, quantity, source } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      const result = await db.query(
        `INSERT INTO cocina_shopping_items (client_id, name, quantity, source) VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, String(name).trim(), quantity || null, source || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Cocina shopping create error:', err.message);
      res.status(500).json({ error: 'Failed to add shopping item' });
    }
  });

  // POST /shopping/from-salsa/:salsaId — bulk-adds the salsa's ingredients that
  // aren't currently in the pantry, tagging each with the salsa title as `source`.
  router.post('/shopping/from-salsa/:salsaId', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const salsaResult = await db.query(
        `SELECT title FROM cocina_salsas WHERE id = $1 AND client_id = $2`,
        [req.params.salsaId, clientId]
      );
      if (salsaResult.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      const salsaTitle = salsaResult.rows[0].title;

      const [ingredientsResult, pantryResult] = await Promise.all([
        db.query(
          `SELECT name, quantity FROM cocina_salsa_ingredients WHERE salsa_id = $1 ORDER BY sort_order, id`,
          [req.params.salsaId]
        ),
        db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
      ]);
      const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
      const missing = ingredientsResult.rows.filter(ing => !pantryNames.has(normalizeName(ing.name)));

      const added = [];
      for (const ing of missing) {
        const result = await db.query(
          `INSERT INTO cocina_shopping_items (client_id, name, quantity, source) VALUES ($1, $2, $3, $4) RETURNING *`,
          [clientId, ing.name, ing.quantity || null, salsaTitle]
        );
        added.push(result.rows[0]);
      }
      res.status(201).json({ added });
    } catch (err) {
      console.error('Cocina shopping from-salsa error:', err.message);
      res.status(500).json({ error: 'Failed to add missing ingredients' });
    }
  });

  router.put('/shopping/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, quantity, checked } = req.body || {};
      const result = await db.query(
        `UPDATE cocina_shopping_items SET
           name = COALESCE($1, name),
           quantity = COALESCE($2, quantity),
           checked = COALESCE($3, checked)
         WHERE id = $4 AND client_id = $5 RETURNING *`,
        [name ?? null, quantity ?? null, typeof checked === 'boolean' ? checked : null, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina shopping update error:', err.message);
      res.status(500).json({ error: 'Failed to update shopping item' });
    }
  });

  router.delete('/shopping/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina shopping delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete shopping item' });
    }
  });

  // "Finalize shopping trip" — checked items were bought, so they clear; anything
  // left unchecked stays on the list for next time.
  router.post('/shopping/finalize', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE client_id = $1 AND checked = TRUE RETURNING id`,
        [clientId]
      );
      res.json({ removed: result.rowCount });
    } catch (err) {
      console.error('Cocina shopping finalize error:', err.message);
      res.status(500).json({ error: 'Failed to finalize shopping trip' });
    }
  });

  router.post('/shopping/clear', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE client_id = $1 RETURNING id`,
        [clientId]
      );
      res.json({ removed: result.rowCount });
    } catch (err) {
      console.error('Cocina shopping clear error:', err.message);
      res.status(500).json({ error: 'Failed to clear shopping list' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
