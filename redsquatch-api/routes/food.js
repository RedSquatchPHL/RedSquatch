'use strict';

// Food page backend: a personal food rating log (what / where / how good) and a
// two-week meal planner with a "have it in Paprika" flag. Paprika has no public
// API, so in_paprika is a manual checkbox, not a sync.
// Same { runMigrations(db), makeRouter(db) } shape as the other route modules.

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS food_ratings (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    item        VARCHAR(120) NOT NULL,
    place       VARCHAR(120) NOT NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
    notes       TEXT,
    eaten_on    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_food_ratings_client ON food_ratings(client_id, item)`,
  `CREATE TABLE IF NOT EXISTS meal_plan (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    plan_date   DATE NOT NULL,
    meal_type   VARCHAR(12) NOT NULL DEFAULT 'dinner',
    title       VARCHAR(160) NOT NULL,
    in_paprika  BOOLEAN NOT NULL DEFAULT FALSE,
    recipe_url  TEXT,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_meal_plan_client_date ON meal_plan(client_id, plan_date)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) await db.query(sql);
}

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (username) {
    const result = await db.query('SELECT id FROM client_users WHERE username = $1 LIMIT 1', [username]);
    if (result.rows.length > 0) return result.rows[0].id;
  }
  return 1;
}

const clean = v => (typeof v === 'string' && v.trim() ? v.trim() : null);

function validateRating(b) {
  if (!clean(b?.item)) return 'item is required';
  if (!clean(b?.place)) return 'place is required';
  if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 10) return 'rating must be an integer 1-10';
  if (b.eaten_on && !DATE_RE.test(b.eaten_on)) return 'eaten_on must be YYYY-MM-DD';
  return null;
}

function validateMeal(b) {
  if (!clean(b?.title)) return 'title is required';
  if (!DATE_RE.test(b?.plan_date || '')) return 'plan_date must be YYYY-MM-DD';
  if (b.meal_type && !VALID_MEAL_TYPES.includes(b.meal_type)) return `meal_type must be one of ${VALID_MEAL_TYPES.join(', ')}`;
  if (b.recipe_url && !/^https?:\/\//i.test(b.recipe_url)) return 'recipe_url must start with http(s)://';
  return null;
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  const fail = (res, label, err, msg) => {
    console.error(`Food ${label} error:`, err.message);
    res.status(500).json({ error: msg });
  };

  // ---- Ratings ----

  router.get('/ratings', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `SELECT id, item, place, rating, notes, to_char(eaten_on, 'YYYY-MM-DD') AS eaten_on
           FROM food_ratings WHERE client_id = $1 ORDER BY eaten_on DESC, id DESC`,
        [clientId]
      );
      res.json({ ratings: r.rows });
    } catch (err) { fail(res, 'ratings fetch', err, 'Failed to fetch ratings'); }
  });

  router.post('/ratings', auth, async (req, res) => {
    const v = validateRating(req.body);
    if (v) return res.status(400).json({ error: v });
    try {
      const clientId = await getClientId(db, req);
      const { item, place, rating, notes, eaten_on } = req.body;
      const r = await db.query(
        `INSERT INTO food_ratings (client_id, item, place, rating, notes, eaten_on)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE))
         RETURNING id, item, place, rating, notes, to_char(eaten_on,'YYYY-MM-DD') AS eaten_on`,
        [clientId, clean(item), clean(place), rating, clean(notes), eaten_on || null]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) { fail(res, 'rating create', err, 'Failed to add rating'); }
  });

  router.put('/ratings/:id', auth, async (req, res) => {
    const v = validateRating(req.body);
    if (v) return res.status(400).json({ error: v });
    try {
      const clientId = await getClientId(db, req);
      const { item, place, rating, notes, eaten_on } = req.body;
      const r = await db.query(
        `UPDATE food_ratings
            SET item=$1, place=$2, rating=$3, notes=$4, eaten_on=COALESCE($5::date, eaten_on), updated_at=NOW()
          WHERE id=$6 AND client_id=$7
          RETURNING id, item, place, rating, notes, to_char(eaten_on,'YYYY-MM-DD') AS eaten_on`,
        [clean(item), clean(place), rating, clean(notes), eaten_on || null, req.params.id, clientId]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Rating not found' });
      res.json(r.rows[0]);
    } catch (err) { fail(res, 'rating update', err, 'Failed to update rating'); }
  });

  router.delete('/ratings/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query('DELETE FROM food_ratings WHERE id=$1 AND client_id=$2 RETURNING id', [req.params.id, clientId]);
      if (!r.rows.length) return res.status(404).json({ error: 'Rating not found' });
      res.json({ success: true });
    } catch (err) { fail(res, 'rating delete', err, 'Failed to delete rating'); }
  });

  // ---- Meal plan ----

  // GET /meals?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Defaults to a 14-day window from today.
  router.get('/meals', auth, async (req, res) => {
    const { from, to } = req.query;
    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
      return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
    }
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `SELECT id, to_char(plan_date,'YYYY-MM-DD') AS plan_date, meal_type, title, in_paprika, recipe_url, notes
           FROM meal_plan
          WHERE client_id = $1
            AND plan_date BETWEEN COALESCE($2::date, CURRENT_DATE) AND COALESCE($3::date, COALESCE($2::date, CURRENT_DATE) + 13)
          ORDER BY plan_date, CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 ELSE 4 END, id`,
        [clientId, from || null, to || null]
      );
      res.json({ meals: r.rows });
    } catch (err) { fail(res, 'meals fetch', err, 'Failed to fetch meals'); }
  });

  router.post('/meals', auth, async (req, res) => {
    const v = validateMeal(req.body);
    if (v) return res.status(400).json({ error: v });
    try {
      const clientId = await getClientId(db, req);
      const { plan_date, meal_type, title, in_paprika, recipe_url, notes } = req.body;
      const r = await db.query(
        `INSERT INTO meal_plan (client_id, plan_date, meal_type, title, in_paprika, recipe_url, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, to_char(plan_date,'YYYY-MM-DD') AS plan_date, meal_type, title, in_paprika, recipe_url, notes`,
        [clientId, plan_date, meal_type || 'dinner', clean(title), !!in_paprika, clean(recipe_url), clean(notes)]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) { fail(res, 'meal create', err, 'Failed to add meal'); }
  });

  router.put('/meals/:id', auth, async (req, res) => {
    const v = validateMeal(req.body);
    if (v) return res.status(400).json({ error: v });
    try {
      const clientId = await getClientId(db, req);
      const { plan_date, meal_type, title, in_paprika, recipe_url, notes } = req.body;
      const r = await db.query(
        `UPDATE meal_plan
            SET plan_date=$1, meal_type=$2, title=$3, in_paprika=$4, recipe_url=$5, notes=$6, updated_at=NOW()
          WHERE id=$7 AND client_id=$8
          RETURNING id, to_char(plan_date,'YYYY-MM-DD') AS plan_date, meal_type, title, in_paprika, recipe_url, notes`,
        [plan_date, meal_type || 'dinner', clean(title), !!in_paprika, clean(recipe_url), clean(notes), req.params.id, clientId]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Meal not found' });
      res.json(r.rows[0]);
    } catch (err) { fail(res, 'meal update', err, 'Failed to update meal'); }
  });

  router.delete('/meals/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query('DELETE FROM meal_plan WHERE id=$1 AND client_id=$2 RETURNING id', [req.params.id, clientId]);
      if (!r.rows.length) return res.status(404).json({ error: 'Meal not found' });
      res.json({ success: true });
    } catch (err) { fail(res, 'meal delete', err, 'Failed to delete meal'); }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
