'use strict';

// Personal GLP-1 health log: weight, hydration, protein/food, and injections, plus a
// small profile (height/target/goals). Ported from a self-hosted glp1-tracker
// instance, keeping only the parts in daily use. Drug-level estimates, BMI, and
// site rotation are all derived client-side from these rows (lib/glp1.ts), so the
// API stores facts and does no math.
//
// Units: weight in pounds, hydration in fluid ounces, protein in grams, height in
// inches, dose in mg.

const VALID_SITES = [
  'abdomen_ul', 'abdomen_um', 'abdomen_ur',
  'abdomen_ml', 'abdomen_mr',
  'abdomen_ll', 'abdomen_lm', 'abdomen_lr',
  'flank_l', 'flank_r', 'arm_l', 'arm_r', 'thigh_l', 'thigh_r',
];
const VALID_MEDICATIONS = ['tirzepatide', 'semaglutide', 'liraglutide', 'retatrutide'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS glp1_profile (
    client_id          INTEGER PRIMARY KEY REFERENCES client_users(id) ON DELETE CASCADE,
    height_in          NUMERIC(5,2),
    target_weight_lb   NUMERIC(6,2),
    hydration_goal_oz  NUMERIC(6,1) NOT NULL DEFAULT 64,
    protein_goal_g     NUMERIC(6,1),
    updated_at         TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS glp1_weight_entries (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    measured_at TIMESTAMP NOT NULL,
    weight_lb   NUMERIC(6,2) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_weight_client_at ON glp1_weight_entries(client_id, measured_at)`,
  `CREATE TABLE IF NOT EXISTS glp1_hydration_entries (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    logged_at  TIMESTAMP NOT NULL,
    ounces     NUMERIC(6,1) NOT NULL,
    notes      TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_hydration_client_at ON glp1_hydration_entries(client_id, logged_at)`,
  `CREATE TABLE IF NOT EXISTS glp1_protein_entries (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    logged_at  TIMESTAMP NOT NULL,
    grams      NUMERIC(6,1) NOT NULL,
    notes      TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_protein_client_at ON glp1_protein_entries(client_id, logged_at)`,
  `CREATE TABLE IF NOT EXISTS glp1_injections (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    injected_at TIMESTAMP NOT NULL,
    medication  VARCHAR(20) NOT NULL,
    dose_mg     NUMERIC(6,2) NOT NULL,
    site        VARCHAR(20) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_injections_client_at ON glp1_injections(client_id, injected_at)`,
  // Nutrition intake: a protein row is now a full food entry (macros per logged
  // amount, already scaled by servings), and a hydration row can name the drink.
  // Quick-add rows leave the new columns NULL.
  `ALTER TABLE glp1_protein_entries ADD COLUMN IF NOT EXISTS food_name VARCHAR(120)`,
  `ALTER TABLE glp1_protein_entries ADD COLUMN IF NOT EXISTS fat_g NUMERIC(6,1)`,
  `ALTER TABLE glp1_protein_entries ADD COLUMN IF NOT EXISTS carbs_g NUMERIC(6,1)`,
  `ALTER TABLE glp1_protein_entries ADD COLUMN IF NOT EXISTS calories NUMERIC(7,1)`,
  `ALTER TABLE glp1_hydration_entries ADD COLUMN IF NOT EXISTS drink_name VARCHAR(120)`,
  // Saved foods for the intake form's pick-from-list path. Macros are per serving.
  `CREATE TABLE IF NOT EXISTS glp1_foods (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name       VARCHAR(120) NOT NULL,
    serving    VARCHAR(60),
    protein_g  NUMERIC(6,1) NOT NULL DEFAULT 0,
    fat_g      NUMERIC(6,1) NOT NULL DEFAULT 0,
    carbs_g    NUMERIC(6,1) NOT NULL DEFAULT 0,
    calories   NUMERIC(7,1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_foods_client_name ON glp1_foods(client_id, name)`,
  // A saved item with a volume is a drink (protein shake): it shows in the hydration
  // picker, not the food list. Its macros are per serving of that volume.
  `ALTER TABLE glp1_foods ADD COLUMN IF NOT EXISTS volume_oz NUMERIC(6,1)`,
  `ALTER TABLE glp1_profile ADD COLUMN IF NOT EXISTS countdown_target TIMESTAMP`,
  `ALTER TABLE glp1_profile ADD COLUMN IF NOT EXISTS countdown_label VARCHAR(120)`,
  `CREATE TABLE IF NOT EXISTS glp1_fasting_sessions (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    method_id    VARCHAR(20) NOT NULL,
    fast_hours   NUMERIC(4,1) NOT NULL,
    started_at   TIMESTAMP NOT NULL,
    notify_at    TIMESTAMP NOT NULL,
    notified_at  TIMESTAMP,
    ended_at     TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_fasting_client ON glp1_fasting_sessions(client_id, started_at)`,
  `CREATE TABLE IF NOT EXISTS glp1_fasting_schedule (
    client_id      INTEGER PRIMARY KEY REFERENCES client_users(id) ON DELETE CASCADE,
    enabled        BOOLEAN NOT NULL DEFAULT false,
    reminder_hour  SMALLINT NOT NULL DEFAULT 20,
    reminder_min   SMALLINT NOT NULL DEFAULT 0,
    fast_days      TEXT,
    updated_at     TIMESTAMP DEFAULT NOW()
  )`,
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

// ── Pushover notifications ────────────────────────────────────────────────────

const https = require('https');
const querystring = require('querystring');

async function sendPushover(title, message) {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const apiToken = process.env.PUSHOVER_API_TOKEN;
  if (!userKey || !apiToken) {
    console.log('[Pushover] skipped — PUSHOVER_USER_KEY or PUSHOVER_API_TOKEN not set');
    return;
  }
  const body = querystring.stringify({ token: apiToken, user: userKey, title, message });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.pushover.net',
      path: '/1/messages.json',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Fasting timer scheduler ───────────────────────────────────────────────────

const fastingTimers = new Map(); // key: `${clientId}-${sessionId}`

async function fireFastingNotification(db, sessionId, clientId, methodName) {
  const key = `${clientId}-${sessionId}`;
  fastingTimers.delete(key);
  try {
    const r = await db.query(
      'SELECT id FROM glp1_fasting_sessions WHERE id=$1 AND client_id=$2 AND ended_at IS NULL AND notified_at IS NULL',
      [sessionId, clientId]
    );
    if (!r.rows.length) return;
    await sendPushover('Fasting Complete 🎉', `Your ${methodName} fast is done! Time to break your fast.`);
    await db.query('UPDATE glp1_fasting_sessions SET notified_at=NOW() WHERE id=$1', [sessionId]);
  } catch (err) {
    console.error('[Fasting] notification error:', err.message);
  }
}

function scheduleFastingTimer(db, sessionId, clientId, notifyAt, methodName) {
  const key = `${clientId}-${sessionId}`;
  const existing = fastingTimers.get(key);
  if (existing) clearTimeout(existing);
  const delay = new Date(notifyAt).getTime() - Date.now();
  if (delay <= 0) {
    fireFastingNotification(db, sessionId, clientId, methodName);
    return;
  }
  const handle = setTimeout(() => fireFastingNotification(db, sessionId, clientId, methodName), delay);
  fastingTimers.set(key, handle);
}

async function rehydrateFastingTimers(db) {
  try {
    const r = await db.query(
      `SELECT fs.id, fs.client_id, fs.method_id, fs.notify_at
       FROM glp1_fasting_sessions fs
       WHERE fs.ended_at IS NULL AND fs.notified_at IS NULL`
    );
    for (const row of r.rows) {
      scheduleFastingTimer(db, row.id, row.client_id, row.notify_at, row.method_id);
    }
    if (r.rows.length > 0) console.log(`[Fasting] rehydrated ${r.rows.length} pending timer(s)`);
  } catch (err) {
    console.error('[Fasting] rehydrate error:', err.message);
  }
}

// ── Schedule / reminder timers ────────────────────────────────────────────────

const scheduleTimers = new Map(); // key: clientId

function getNextReminderDelay(hour, min, fastDaysJson) {
  const now = new Date();
  const days = fastDaysJson ? JSON.parse(fastDaysJson) : null; // null = every day
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hour, min, 0, 0);
    if (candidate.getTime() <= now.getTime()) continue;
    if (days && days.length > 0 && !days.includes(candidate.getDay())) continue;
    return candidate.getTime() - now.getTime();
  }
  return null;
}

function scheduleReminder(db, clientId, row) {
  const existing = scheduleTimers.get(clientId);
  if (existing) clearTimeout(existing);
  if (!row.enabled) return;
  const delay = getNextReminderDelay(row.reminder_hour, row.reminder_min, row.fast_days);
  if (!delay) return;
  const handle = setTimeout(async () => {
    scheduleTimers.delete(clientId);
    try {
      await sendPushover('⏰ Time to Fast', "Your fasting window is starting — start your fast when you're ready!");
      const r = await db.query('SELECT * FROM glp1_fasting_schedule WHERE client_id=$1', [clientId]);
      if (r.rows.length && r.rows[0].enabled) scheduleReminder(db, clientId, r.rows[0]);
    } catch (err) {
      console.error('[Schedule] reminder error:', err.message);
    }
  }, delay);
  scheduleTimers.set(clientId, handle);
}

async function rehydrateScheduleReminders(db) {
  try {
    const r = await db.query('SELECT * FROM glp1_fasting_schedule WHERE enabled=true');
    for (const row of r.rows) scheduleReminder(db, row.client_id, row);
    if (r.rows.length > 0) console.log(`[Fasting] rehydrated ${r.rows.length} schedule reminder(s)`);
  } catch (err) {
    console.error('[Fasting] schedule rehydrate error:', err.message);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const isDate = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const optNum = (v, min, max) => v === null || v === undefined || isNum(v, min, max);

function validateProfile(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (!optNum(b.height_in, 24, 108)) return 'height_in must be between 24 and 108';
  if (!optNum(b.target_weight_lb, 50, 800)) return 'target_weight_lb must be between 50 and 800';
  if (!isNum(b.hydration_goal_oz, 1, 500)) return 'hydration_goal_oz must be between 1 and 500';
  if (!optNum(b.protein_goal_g, 1, 1000)) return 'protein_goal_g must be between 1 and 1000';
  if (b.countdown_target !== null && b.countdown_target !== undefined && !isDate(b.countdown_target)) return 'countdown_target must be a valid date/time or null';
  if (!optText(b.countdown_label, 120)) return 'countdown_label must be 120 characters or fewer';
  return null;
}

function validateWeight(b) {
  if (!isNum(b?.weight_lb, 50, 800)) return 'weight_lb must be between 50 and 800';
  if (!isDate(b.measured_at)) return 'measured_at must be a valid date/time';
  return null;
}

const optText = (v, max) => v === null || v === undefined || (typeof v === 'string' && v.length <= max);

function validateHydration(b) {
  if (!isNum(b?.ounces, 0.1, 500)) return 'ounces must be between 0.1 and 500';
  if (!isDate(b.logged_at)) return 'logged_at must be a valid date/time';
  if (!optText(b.drink_name, 120)) return 'drink_name must be 120 characters or fewer';
  return null;
}

// grams may be 0 now: a food with no protein (an apple) is still a food entry.
function validateProtein(b) {
  if (!isNum(b?.grams, 0, 1000)) return 'grams must be between 0 and 1000';
  if (!isDate(b.logged_at)) return 'logged_at must be a valid date/time';
  if (!optNum(b.fat_g, 0, 1000)) return 'fat_g must be between 0 and 1000';
  if (!optNum(b.carbs_g, 0, 1000)) return 'carbs_g must be between 0 and 1000';
  if (!optNum(b.calories, 0, 10000)) return 'calories must be between 0 and 10000';
  if (!optText(b.food_name, 120)) return 'food_name must be 120 characters or fewer';
  return null;
}

function validateFood(b) {
  if (typeof b?.name !== 'string' || !b.name.trim() || b.name.length > 120) return 'name is required (120 characters or fewer)';
  if (!optText(b.serving, 60)) return 'serving must be 60 characters or fewer';
  if (!isNum(b.protein_g, 0, 1000)) return 'protein_g must be between 0 and 1000';
  if (!isNum(b.fat_g, 0, 1000)) return 'fat_g must be between 0 and 1000';
  if (!isNum(b.carbs_g, 0, 1000)) return 'carbs_g must be between 0 and 1000';
  if (!isNum(b.calories, 0, 10000)) return 'calories must be between 0 and 10000';
  if (!optNum(b.volume_oz, 0.1, 500)) return 'volume_oz must be between 0.1 and 500';
  return null;
}

function validateInjection(b) {
  if (!VALID_MEDICATIONS.includes(b?.medication)) return `medication must be one of ${VALID_MEDICATIONS.join(', ')}`;
  if (!isNum(b.dose_mg, 0.01, 100)) return 'dose_mg must be between 0.01 and 100';
  if (!VALID_SITES.includes(b.site)) return `site must be one of ${VALID_SITES.join(', ')}`;
  if (!isDate(b.injected_at)) return 'injected_at must be a valid date/time';
  return null;
}

function validateSchedule(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (typeof b.enabled !== 'boolean') return 'enabled must be a boolean';
  if (!isNum(b.reminder_hour, 0, 23)) return 'reminder_hour must be 0–23';
  if (!isNum(b.reminder_min, 0, 59)) return 'reminder_min must be 0–59';
  if (b.fast_days !== null && b.fast_days !== undefined) {
    if (!Array.isArray(b.fast_days) || !b.fast_days.every(d => isNum(d, 0, 6))) return 'fast_days must be an array of 0–6';
  }
  return null;
}

// ── Router ───────────────────────────────────────────────────────────────────

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // Generic list/create/update/delete for the four itemised logs. `cols` maps the
  // body field names to columns; `at` is the timestamp column, which also sorts.
  function crud(path, table, at, cols, validate) {
    const colNames = [at, ...cols];

    router.get(path, auth, async (req, res) => {
      try {
        const clientId = await getClientId(db, req);
        const result = await db.query(
          `SELECT * FROM ${table} WHERE client_id = $1 ORDER BY ${at} DESC, id DESC`,
          [clientId]
        );
        res.json({ entries: result.rows });
      } catch (err) {
        console.error(`GLP-1 ${path} fetch error:`, err.message);
        res.status(500).json({ error: 'Failed to fetch entries' });
      }
    });

    router.post(path, auth, async (req, res) => {
      const bad = validate(req.body);
      if (bad) return res.status(400).json({ error: bad });
      try {
        const clientId = await getClientId(db, req);
        const values = colNames.map(c => req.body[c] ?? null);
        const placeholders = colNames.map((_, i) => `$${i + 2}`).join(', ');
        const result = await db.query(
          `INSERT INTO ${table} (client_id, ${colNames.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`,
          [clientId, ...values]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(`GLP-1 ${path} create error:`, err.message);
        res.status(500).json({ error: 'Failed to add entry' });
      }
    });

    router.put(`${path}/:id`, auth, async (req, res) => {
      const bad = validate(req.body);
      if (bad) return res.status(400).json({ error: bad });
      try {
        const clientId = await getClientId(db, req);
        const sets = colNames.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const values = colNames.map(c => req.body[c] ?? null);
        const result = await db.query(
          `UPDATE ${table} SET ${sets}
           WHERE id = $${colNames.length + 1} AND client_id = $${colNames.length + 2} RETURNING *`,
          [...values, req.params.id, clientId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
        res.json(result.rows[0]);
      } catch (err) {
        console.error(`GLP-1 ${path} update error:`, err.message);
        res.status(500).json({ error: 'Failed to update entry' });
      }
    });

    router.delete(`${path}/:id`, auth, async (req, res) => {
      try {
        const clientId = await getClientId(db, req);
        const result = await db.query(
          `DELETE FROM ${table} WHERE id = $1 AND client_id = $2 RETURNING id`,
          [req.params.id, clientId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
        res.json({ success: true });
      } catch (err) {
        console.error(`GLP-1 ${path} delete error:`, err.message);
        res.status(500).json({ error: 'Failed to delete entry' });
      }
    });
  }

  crud('/weight', 'glp1_weight_entries', 'measured_at', ['weight_lb', 'notes'], validateWeight);
  crud('/hydration', 'glp1_hydration_entries', 'logged_at', ['ounces', 'drink_name', 'notes'], validateHydration);
  crud('/protein', 'glp1_protein_entries', 'logged_at', ['grams', 'fat_g', 'carbs_g', 'calories', 'food_name', 'notes'], validateProtein);
  // The foods list sorts client-side (alphabetical, case-insensitive); `name` here is
  // only the crud helper's sort column.
  crud('/foods', 'glp1_foods', 'name', ['serving', 'volume_oz', 'protein_g', 'fat_g', 'carbs_g', 'calories'], validateFood);
  crud('/injections', 'glp1_injections', 'injected_at', ['medication', 'dose_mg', 'site', 'notes'], validateInjection);

  // POST /intake — the nutrition form's single Submit. Body: { logged_at, items: [...] }
  // where an item is { kind: 'hydration', ounces, drink_name } or
  // { kind: 'food', name, grams, fat_g, carbs_g, calories, food_name, save_food?: {serving, protein_g, fat_g, carbs_g, calories} }.
  // A hydration item may also carry macros (a protein shake): { ..., macros: {grams, fat_g, carbs_g, calories},
  // save_drink?: {name, volume_oz, protein_g, fat_g, carbs_g, calories} }. Its ounces go to hydration and its macros
  // to the protein/food log as a second row, so both goals count it.
  // Everything is validated first and written in one transaction, so a submit either
  // lands in full or not at all.
  router.post('/intake', auth, async (req, res) => {
    const { logged_at, items } = req.body ?? {};
    if (!isDate(logged_at)) return res.status(400).json({ error: 'logged_at must be a valid date/time' });
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return res.status(400).json({ error: 'items must be a list of 1-50 entries' });
    for (const [i, it] of items.entries()) {
      let bad;
      if (it?.kind === 'hydration') {
        bad = validateHydration({ ...it, logged_at });
        if (!bad && it.macros) bad = validateProtein({ ...it.macros, food_name: it.drink_name, logged_at });
        if (!bad && it.save_drink) {
          if (!it.macros) bad = 'save_drink needs macros';
          else bad = validateFood({ ...it.save_drink, name: it.save_drink.name ?? it.drink_name });
        }
      }
      else if (it?.kind === 'food') {
        bad = validateProtein({ ...it, logged_at });
        if (!bad && it.save_food) bad = validateFood({ ...it.save_food, name: it.name });
      } else bad = 'kind must be hydration or food';
      if (bad) return res.status(400).json({ error: `Item ${i + 1}: ${bad}` });
    }
    const client = await db.connect();
    try {
      const clientId = await getClientId(client, req);
      await client.query('BEGIN');
      for (const it of items) {
        if (it.kind === 'hydration') {
          await client.query(
            `INSERT INTO glp1_hydration_entries (client_id, logged_at, ounces, drink_name) VALUES ($1, $2, $3, $4)`,
            [clientId, logged_at, it.ounces, it.drink_name ?? null]
          );
          if (it.save_drink) {
            const f = it.save_drink;
            await client.query(
              `INSERT INTO glp1_foods (client_id, name, volume_oz, protein_g, fat_g, carbs_g, calories)
               SELECT $1, $2, $3, $4, $5, $6, $7
               WHERE NOT EXISTS (SELECT 1 FROM glp1_foods WHERE client_id = $1 AND lower(name) = lower($2::varchar))`,
              [clientId, f.name ?? it.drink_name, f.volume_oz, f.protein_g, f.fat_g, f.carbs_g, f.calories]
            );
          }
          if (it.macros) {
            const m = it.macros;
            await client.query(
              `INSERT INTO glp1_protein_entries (client_id, logged_at, grams, fat_g, carbs_g, calories, food_name) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [clientId, logged_at, m.grams, m.fat_g ?? null, m.carbs_g ?? null, m.calories ?? null, it.drink_name ?? null]
            );
          }
          continue;
        }
        if (it.save_food) {
          const f = it.save_food;
          await client.query(
            `INSERT INTO glp1_foods (client_id, name, serving, protein_g, fat_g, carbs_g, calories)
             SELECT $1, $2, $3, $4, $5, $6, $7
             WHERE NOT EXISTS (SELECT 1 FROM glp1_foods WHERE client_id = $1 AND lower(name) = lower($2::varchar))`,
            [clientId, it.name, f.serving ?? null, f.protein_g, f.fat_g, f.carbs_g, f.calories]
          );
        }
        await client.query(
          `INSERT INTO glp1_protein_entries (client_id, logged_at, grams, fat_g, carbs_g, calories, food_name) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [clientId, logged_at, it.grams, it.fat_g ?? null, it.carbs_g ?? null, it.calories ?? null, it.food_name ?? null]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ saved: items.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('GLP-1 intake error:', err.message);
      res.status(500).json({ error: 'Failed to save intake' });
    } finally {
      client.release();
    }
  });

  // GET /profile — always returns a row shape, even before anything is saved
  router.get('/profile', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(`SELECT * FROM glp1_profile WHERE client_id = $1`, [clientId]);
      res.json(result.rows[0] ?? {
        client_id: clientId, height_in: null, target_weight_lb: null, hydration_goal_oz: 64, protein_goal_g: null, countdown_target: null, countdown_label: null,
      });
    } catch (err) {
      console.error('GLP-1 profile fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // PUT /profile — body: { height_in, target_weight_lb, hydration_goal_oz, protein_goal_g }
  router.put('/profile', auth, async (req, res) => {
    const bad = validateProfile(req.body);
    if (bad) return res.status(400).json({ error: bad });
    try {
      const clientId = await getClientId(db, req);
      const { height_in, target_weight_lb, hydration_goal_oz, protein_goal_g, countdown_target, countdown_label } = req.body;
      const result = await db.query(
        `INSERT INTO glp1_profile (client_id, height_in, target_weight_lb, hydration_goal_oz, protein_goal_g, countdown_target, countdown_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (client_id) DO UPDATE SET
           height_in = EXCLUDED.height_in,
           target_weight_lb = EXCLUDED.target_weight_lb,
           hydration_goal_oz = EXCLUDED.hydration_goal_oz,
           protein_goal_g = EXCLUDED.protein_goal_g,
           countdown_target = EXCLUDED.countdown_target,
           countdown_label = EXCLUDED.countdown_label,
           updated_at = NOW()
         RETURNING *`,
        [clientId, height_in ?? null, target_weight_lb ?? null, hydration_goal_oz, protein_goal_g ?? null, countdown_target ?? null, countdown_label ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('GLP-1 profile save error:', err.message);
      res.status(500).json({ error: 'Failed to save profile' });
    }
  });

  // GET /usda-search?q=<term> — proxy to USDA FoodData Central; keeps the API key server-side.
  // Returns { results: [{ fdcId, description, serving, protein, fat, carbs, calories }] }
  router.get('/usda-search', auth, async (req, res) => {
    const q = (req.query.q ?? '').trim();
    if (!q || q.length > 200) return res.status(400).json({ error: 'q is required (200 chars max)' });
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'USDA lookup is not configured on this server.' });
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=10&dataType=SR%20Legacy,Survey%20(FNDDS),Foundation&api_key=${apiKey}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) return res.status(502).json({ error: 'USDA API returned an error.' });
      const data = await upstream.json();
      const PROTEIN = 1003, FAT = 1004, CARBS = 1005, ENERGY = 1008;
      const getNutrient = (nutrients, id) => {
        const n = nutrients?.find(n => n.nutrientId === id);
        return n ? Math.round(n.value * 10) / 10 : 0;
      };
      const results = (data.foods ?? []).map(f => ({
        fdcId: f.fdcId,
        description: f.description,
        serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit ?? 'g'}` : null,
        protein: getNutrient(f.foodNutrients, PROTEIN),
        fat: getNutrient(f.foodNutrients, FAT),
        carbs: getNutrient(f.foodNutrients, CARBS),
        calories: getNutrient(f.foodNutrients, ENERGY),
      }));
      res.json({ results });
    } catch (err) {
      console.error('USDA search error:', err.message);
      res.status(502).json({ error: 'Could not reach USDA. Try again.' });
    }
  });

  // ── Fasting sessions ──────────────────────────────────────────────────────

  const VALID_METHOD_IDS = ['16_8', '14_10', '12_12', '18_6', '20_4', '5_2', 'adf', 'ese', 'omad'];
  const METHOD_HOURS = { '16_8': 16, '14_10': 14, '12_12': 12, '18_6': 18, '20_4': 20, '5_2': 24, 'adf': 24, 'ese': 24, 'omad': 23 };

  router.get('/fasting/current', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `SELECT id, method_id, fast_hours, started_at, notify_at, notified_at
         FROM glp1_fasting_sessions
         WHERE client_id=$1 AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [clientId]
      );
      res.json({ session: r.rows[0] ?? null });
    } catch (err) {
      console.error('Fasting current error:', err.message);
      res.status(500).json({ error: 'Failed to fetch fasting session' });
    }
  });

  router.post('/fasting/start', auth, async (req, res) => {
    const { method_id } = req.body ?? {};
    if (!VALID_METHOD_IDS.includes(method_id)) return res.status(400).json({ error: 'Invalid method_id' });
    try {
      const clientId = await getClientId(db, req);
      // End any active session first
      await db.query(
        'UPDATE glp1_fasting_sessions SET ended_at=NOW() WHERE client_id=$1 AND ended_at IS NULL',
        [clientId]
      );
      const fastHours = METHOD_HOURS[method_id];
      const startedAt = new Date();
      const notifyAt = new Date(startedAt.getTime() + fastHours * 3_600_000);
      const r = await db.query(
        `INSERT INTO glp1_fasting_sessions (client_id, method_id, fast_hours, started_at, notify_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [clientId, method_id, fastHours, startedAt.toISOString(), notifyAt.toISOString()]
      );
      const session = r.rows[0];
      scheduleFastingTimer(db, session.id, clientId, session.notify_at, method_id);
      res.status(201).json({ session });
    } catch (err) {
      console.error('Fasting start error:', err.message);
      res.status(500).json({ error: 'Failed to start fasting session' });
    }
  });

  router.post('/fasting/stop', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `UPDATE glp1_fasting_sessions SET ended_at=NOW()
         WHERE client_id=$1 AND ended_at IS NULL
         RETURNING id`,
        [clientId]
      );
      if (r.rows.length) {
        const sessionId = r.rows[0].id;
        const key = `${clientId}-${sessionId}`;
        const handle = fastingTimers.get(key);
        if (handle) { clearTimeout(handle); fastingTimers.delete(key); }
      }
      res.json({ stopped: r.rows.length > 0 });
    } catch (err) {
      console.error('Fasting stop error:', err.message);
      res.status(500).json({ error: 'Failed to stop fasting session' });
    }
  });

  router.get('/fasting/history', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `SELECT id, method_id, fast_hours, started_at, ended_at, notified_at
         FROM glp1_fasting_sessions
         WHERE client_id=$1 AND started_at >= NOW() - INTERVAL '14 days'
         ORDER BY started_at DESC`,
        [clientId]
      );
      res.json({ sessions: r.rows });
    } catch (err) {
      console.error('Fasting history error:', err.message);
      res.status(500).json({ error: 'Failed to fetch fasting history' });
    }
  });

  router.get('/fasting/schedule', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query('SELECT * FROM glp1_fasting_schedule WHERE client_id=$1', [clientId]);
      const row = r.rows[0] ?? { enabled: false, reminder_hour: 20, reminder_min: 0, fast_days: null };
      res.json({
        enabled: row.enabled,
        reminder_hour: row.reminder_hour,
        reminder_min: row.reminder_min,
        fast_days: row.fast_days ? JSON.parse(row.fast_days) : null,
      });
    } catch (err) {
      console.error('Fasting schedule get error:', err.message);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });

  router.put('/fasting/schedule', auth, async (req, res) => {
    const bad = validateSchedule(req.body);
    if (bad) return res.status(400).json({ error: bad });
    try {
      const clientId = await getClientId(db, req);
      const { enabled, reminder_hour, reminder_min, fast_days } = req.body;
      const fastDaysJson = fast_days && fast_days.length > 0 ? JSON.stringify(fast_days) : null;
      await db.query(
        `INSERT INTO glp1_fasting_schedule (client_id, enabled, reminder_hour, reminder_min, fast_days, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           enabled=EXCLUDED.enabled, reminder_hour=EXCLUDED.reminder_hour,
           reminder_min=EXCLUDED.reminder_min, fast_days=EXCLUDED.fast_days,
           updated_at=NOW()`,
        [clientId, enabled, reminder_hour, reminder_min, fastDaysJson]
      );
      const row = { enabled, reminder_hour, reminder_min, fast_days: fastDaysJson };
      scheduleReminder(db, clientId, row);
      res.json({ ok: true });
    } catch (err) {
      console.error('Fasting schedule put error:', err.message);
      res.status(500).json({ error: 'Failed to save schedule' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter, rehydrateFastingTimers, rehydrateScheduleReminders };
