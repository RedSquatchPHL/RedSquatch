const https = require('https');
const qs    = require('querystring');

// ── Pushover ─────────────────────────────────────────────────────────────────

function sendPushover(title, message) {
  return new Promise((resolve, reject) => {
    const body = qs.stringify({
      token:   process.env.PUSHOVER_APP_TOKEN,
      user:    process.env.PUSHOVER_USER_KEY,
      title,
      message,
    });
    const req = https.request({
      hostname: 'api.pushover.net',
      port:     443,
      path:     '/1/messages.json',
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => (res.statusCode < 300 ? resolve(data) : reject(new Error(`Pushover ${res.statusCode}: ${data}`))));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Fasting timers ────────────────────────────────────────────────────────────

const fastingTimers = new Map();

function scheduleFastingTimer(db, sessionId, clientId, notifyAt, methodId) {
  const key    = `${clientId}-${sessionId}`;
  const existing = fastingTimers.get(key);
  if (existing) clearTimeout(existing);

  const delay = new Date(notifyAt).getTime() - Date.now();
  if (delay <= 0) return;

  const handle = setTimeout(async () => {
    fastingTimers.delete(key);
    try {
      const name = methodId.replace('_', '/');
      await sendPushover('⏰ Fast Complete', `You've completed your ${name} fast!`);
    } catch (err) {
      console.error('[Fasting timer] Pushover error:', err.message);
    }
  }, delay);

  fastingTimers.set(key, handle);
}

async function rehydrateFastingTimers(db) {
  try {
    const r = await db.query(
      `SELECT id, client_id, method_id, notify_at
       FROM glp1_fasting_sessions
       WHERE ended_at IS NULL AND notify_at > NOW()`
    );
    for (const row of r.rows) {
      scheduleFastingTimer(db, row.id, row.client_id, row.notify_at, row.method_id);
    }
    if (r.rows.length > 0) console.log(`[Fasting] rehydrated ${r.rows.length} timer(s)`);
  } catch (err) {
    console.error('[Fasting] rehydrate error:', err.message);
  }
}

// ── Schedule reminders ────────────────────────────────────────────────────────

const scheduleReminders = new Map();

function scheduleNextReminder(clientId, reminderHour, reminderMin, fastDays) {
  const key = `schedule-${clientId}`;
  const existing = scheduleReminders.get(key);
  if (existing) clearTimeout(existing);

  function getNextFireMs() {
    const now  = new Date();
    const next = new Date();
    next.setHours(reminderHour, reminderMin, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    if (!fastDays || fastDays.length === 0) return next.getTime() - now.getTime();

    // Find the next matching day of week
    for (let i = 0; i < 7; i++) {
      if (fastDays.includes(next.getDay())) break;
      next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  const delay = getNextFireMs();

  const handle = setTimeout(async () => {
    scheduleReminders.delete(key);
    try {
      await sendPushover('🕐 Fasting Reminder', 'Time to start your scheduled fast!');
    } catch (err) {
      console.error('[Schedule reminder] Pushover error:', err.message);
    }
    // Reschedule for next occurrence
    scheduleNextReminder(clientId, reminderHour, reminderMin, fastDays);
  }, delay);

  scheduleReminders.set(key, handle);
}

async function rehydrateScheduleReminders(db) {
  try {
    const r = await db.query(
      `SELECT client_id, reminder_hour, reminder_min, fast_days
       FROM glp1_fasting_schedule
       WHERE enabled = true`
    );
    for (const row of r.rows) {
      scheduleNextReminder(row.client_id, row.reminder_hour, row.reminder_min, row.fast_days);
    }
    if (r.rows.length > 0) console.log(`[Fasting] rehydrated ${r.rows.length} schedule reminder(s)`);
  } catch (err) {
    console.error('[Fasting] schedule rehydrate error:', err.message);
  }
}

// ── Plan alerts ───────────────────────────────────────────────────────────────

const planTimers = new Map();

function schedulePlanAlert(clientId, planDate, startTime, methodId) {
  const key = `plan-${clientId}-${planDate}`;
  const existing = planTimers.get(key);
  if (existing) clearTimeout(existing);

  const [year, month, day] = planDate.split('-').map(Number);
  const [hour, min]        = startTime.split(':').map(Number);
  const fireAt  = new Date(year, month - 1, day, hour, min, 0, 0);
  const delay   = fireAt.getTime() - Date.now();
  if (delay <= 0) return;

  const handle = setTimeout(async () => {
    planTimers.delete(key);
    try {
      const name = methodId.replace('_', '/');
      await sendPushover('⏰ Fast Starting', `Time to start your ${name} fast!`);
    } catch (err) {
      console.error('[Plan alert] error:', err.message);
    }
  }, delay);

  planTimers.set(key, handle);
}

async function rehydratePlanAlerts(db) {
  try {
    const r = await db.query(
      `SELECT client_id, plan_date::text, start_time::text, method_id
       FROM glp1_fasting_plan
       WHERE alert_enabled=true AND (plan_date + start_time) > NOW()`
    );
    for (const row of r.rows) {
      schedulePlanAlert(row.client_id, row.plan_date, row.start_time.slice(0, 5), row.method_id);
    }
    if (r.rows.length > 0) console.log(`[Fasting] rehydrated ${r.rows.length} plan alert(s)`);
  } catch (err) {
    console.error('[Fasting] plan alert rehydrate error:', err.message);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_METHOD_IDS = ['16_8', '14_10', '12_12', '18_6', '20_4', '5_2', 'adf', 'ese', 'omad'];
const METHOD_HOURS = { '16_8': 16, '14_10': 14, '12_12': 12, '18_6': 18, '20_4': 20, '5_2': 24, 'adf': 24, 'ese': 24, 'omad': 23 };

const isDate = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const optNum = (v, min, max) => v === null || v === undefined || isNum(v, min, max);

function validateWeight(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (!isDate(b.recorded_at))      return 'recorded_at must be a valid date string';
  if (!isNum(b.weight_lbs, 50, 999)) return 'weight_lbs must be a number between 50 and 999';
  if (!optNum(b.body_fat_pct, 1, 70)) return 'body_fat_pct must be a number between 1 and 70';
  if (!optNum(b.muscle_mass_lbs, 20, 500)) return 'muscle_mass_lbs must be a number between 20 and 500';
  if (!optNum(b.bmi, 10, 60))      return 'bmi must be a number between 10 and 60';
  return null;
}

function validateDose(b) {
  if (!b || typeof b !== 'object') return 'body required';
  const validMeds = ['semaglutide', 'tirzepatide', 'liraglutide', 'dulaglutide', 'exenatide', 'other'];
  if (!validMeds.includes(b.medication)) return `medication must be one of: ${validMeds.join(', ')}`;
  const validSites = ['abdomen', 'thigh', 'upper_arm', 'other'];
  if (!validSites.includes(b.injection_site)) return `injection_site must be one of: ${validSites.join(', ')}`;
  if (!isDate(b.administered_at))  return 'administered_at must be a valid date string';
  if (!isNum(b.dose_mg, 0.1, 100)) return 'dose_mg must be a number between 0.1 and 100';
  if (b.notes !== undefined && b.notes !== null && typeof b.notes !== 'string') return 'notes must be a string';
  return null;
}

function validateMood(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (!isDate(b.recorded_at))      return 'recorded_at must be a valid date string';
  if (!isNum(b.mood_score, 1, 10)) return 'mood_score must be a number between 1 and 10';
  if (!optNum(b.energy_level, 1, 10)) return 'energy_level must be a number between 1 and 10';
  if (!optNum(b.hunger_level, 1, 10)) return 'hunger_level must be a number between 1 and 10';
  if (!optNum(b.nausea_level, 1, 10)) return 'nausea_level must be a number between 1 and 10';
  if (!optNum(b.sleep_hours, 0, 24))  return 'sleep_hours must be a number between 0 and 24';
  if (b.notes !== undefined && b.notes !== null && typeof b.notes !== 'string') return 'notes must be a string';
  return null;
}

function validatePlan(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (!VALID_METHOD_IDS.includes(b.method_id)) return 'invalid method_id';
  if (!b.start_time || !/^\d{1,2}:\d{2}$/.test(b.start_time)) return 'start_time must be HH:MM';
  const [h, m] = b.start_time.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return 'start_time out of range';
  if (typeof b.alert_enabled !== 'boolean') return 'alert_enabled must be a boolean';
  return null;
}

// ── Schema migrations ─────────────────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS glp1_weight_logs (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    recorded_at   TIMESTAMP NOT NULL,
    weight_lbs    NUMERIC(6,2) NOT NULL,
    body_fat_pct  NUMERIC(5,2),
    muscle_mass_lbs NUMERIC(6,2),
    bmi           NUMERIC(5,2),
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_weight_client ON glp1_weight_logs(client_id, recorded_at DESC)`,

  `CREATE TABLE IF NOT EXISTS glp1_dose_logs (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    medication      VARCHAR(50) NOT NULL,
    dose_mg         NUMERIC(6,3) NOT NULL,
    injection_site  VARCHAR(30) NOT NULL,
    administered_at TIMESTAMP NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_dose_client ON glp1_dose_logs(client_id, administered_at DESC)`,

  `CREATE TABLE IF NOT EXISTS glp1_mood_logs (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    recorded_at   TIMESTAMP NOT NULL,
    mood_score    SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
    energy_level  SMALLINT CHECK (energy_level BETWEEN 1 AND 10),
    hunger_level  SMALLINT CHECK (hunger_level BETWEEN 1 AND 10),
    nausea_level  SMALLINT CHECK (nausea_level BETWEEN 1 AND 10),
    sleep_hours   NUMERIC(4,1),
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_mood_client ON glp1_mood_logs(client_id, recorded_at DESC)`,

  `CREATE TABLE IF NOT EXISTS glp1_fasting_sessions (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    method_id   VARCHAR(20) NOT NULL,
    fast_hours  INTEGER NOT NULL,
    started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMP,
    notify_at   TIMESTAMP,
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_fasting_client ON glp1_fasting_sessions(client_id, started_at DESC)`,

  `CREATE TABLE IF NOT EXISTS glp1_fasting_schedule (
    id             SERIAL PRIMARY KEY,
    client_id      INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE UNIQUE,
    enabled        BOOLEAN NOT NULL DEFAULT false,
    reminder_hour  SMALLINT NOT NULL DEFAULT 20 CHECK (reminder_hour BETWEEN 0 AND 23),
    reminder_min   SMALLINT NOT NULL DEFAULT 0  CHECK (reminder_min  BETWEEN 0 AND 59),
    fast_days      INTEGER[],
    updated_at     TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS glp1_fasting_plan (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    plan_date     DATE NOT NULL,
    method_id     VARCHAR(20) NOT NULL,
    start_time    TIME NOT NULL,
    alert_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, plan_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_glp1_fasting_plan_client ON glp1_fasting_plan(client_id, plan_date)`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getClientId(db, req) {
  const username = req.session?.user?.username;
  if (!username) throw new Error('Not authenticated');
  const r = await db.query('SELECT id FROM client_users WHERE username=$1', [username]);
  if (!r.rows.length) throw new Error('User not found');
  return r.rows[0].id;
}

// ── Router factory ────────────────────────────────────────────────────────────

function makeRouter(db) {
  const express = require('express');
  const router  = express.Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ── Weight ────────────────────────────────────────────────────────────────

  router.get('/weight', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rows } = await db.query(
        'SELECT * FROM glp1_weight_logs WHERE client_id=$1 ORDER BY recorded_at DESC LIMIT 90',
        [clientId]
      );
      res.json({ logs: rows });
    } catch (err) {
      console.error('Weight GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch weight logs' });
    }
  });

  router.post('/weight', auth, async (req, res) => {
    const err = validateWeight(req.body);
    if (err) return res.status(400).json({ error: err });
    try {
      const clientId = await getClientId(db, req);
      const { recorded_at, weight_lbs, body_fat_pct, muscle_mass_lbs, bmi, notes } = req.body;
      const { rows } = await db.query(
        `INSERT INTO glp1_weight_logs (client_id, recorded_at, weight_lbs, body_fat_pct, muscle_mass_lbs, bmi, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [clientId, recorded_at, weight_lbs, body_fat_pct ?? null, muscle_mass_lbs ?? null, bmi ?? null, notes ?? null]
      );
      res.status(201).json({ log: rows[0] });
    } catch (err) {
      console.error('Weight POST error:', err.message);
      res.status(500).json({ error: 'Failed to save weight log' });
    }
  });

  router.delete('/weight/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rowCount } = await db.query(
        'DELETE FROM glp1_weight_logs WHERE id=$1 AND client_id=$2',
        [req.params.id, clientId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete weight log' });
    }
  });

  // ── Doses ─────────────────────────────────────────────────────────────────

  router.get('/doses', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rows } = await db.query(
        'SELECT * FROM glp1_dose_logs WHERE client_id=$1 ORDER BY administered_at DESC LIMIT 50',
        [clientId]
      );
      res.json({ logs: rows });
    } catch (err) {
      console.error('Dose GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch dose logs' });
    }
  });

  router.post('/doses', auth, async (req, res) => {
    const err = validateDose(req.body);
    if (err) return res.status(400).json({ error: err });
    try {
      const clientId = await getClientId(db, req);
      const { medication, dose_mg, injection_site, administered_at, notes } = req.body;
      const { rows } = await db.query(
        `INSERT INTO glp1_dose_logs (client_id, medication, dose_mg, injection_site, administered_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [clientId, medication, dose_mg, injection_site, administered_at, notes ?? null]
      );
      res.status(201).json({ log: rows[0] });
    } catch (err) {
      console.error('Dose POST error:', err.message);
      res.status(500).json({ error: 'Failed to save dose log' });
    }
  });

  router.delete('/doses/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rowCount } = await db.query(
        'DELETE FROM glp1_dose_logs WHERE id=$1 AND client_id=$2',
        [req.params.id, clientId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete dose log' });
    }
  });

  // ── Mood ──────────────────────────────────────────────────────────────────

  router.get('/mood', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rows } = await db.query(
        'SELECT * FROM glp1_mood_logs WHERE client_id=$1 ORDER BY recorded_at DESC LIMIT 90',
        [clientId]
      );
      res.json({ logs: rows });
    } catch (err) {
      console.error('Mood GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch mood logs' });
    }
  });

  router.post('/mood', auth, async (req, res) => {
    const err = validateMood(req.body);
    if (err) return res.status(400).json({ error: err });
    try {
      const clientId = await getClientId(db, req);
      const { recorded_at, mood_score, energy_level, hunger_level, nausea_level, sleep_hours, notes } = req.body;
      const { rows } = await db.query(
        `INSERT INTO glp1_mood_logs (client_id, recorded_at, mood_score, energy_level, hunger_level, nausea_level, sleep_hours, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [clientId, recorded_at, mood_score, energy_level ?? null, hunger_level ?? null, nausea_level ?? null, sleep_hours ?? null, notes ?? null]
      );
      res.status(201).json({ log: rows[0] });
    } catch (err) {
      console.error('Mood POST error:', err.message);
      res.status(500).json({ error: 'Failed to save mood log' });
    }
  });

  router.delete('/mood/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { rowCount } = await db.query(
        'DELETE FROM glp1_mood_logs WHERE id=$1 AND client_id=$2',
        [req.params.id, clientId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete mood log' });
    }
  });

  // ── Fasting sessions ──────────────────────────────────────────────────────

  router.post('/fasting/start', auth, async (req, res) => {
    const { method_id, started_at } = req.body ?? {};
    if (!VALID_METHOD_IDS.includes(method_id)) return res.status(400).json({ error: 'Invalid method_id' });
    let startedAt = new Date();
    if (started_at) {
      const parsed = new Date(started_at);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid started_at timestamp' });
      if (parsed > new Date()) return res.status(400).json({ error: 'started_at cannot be in the future' });
      startedAt = parsed;
    }
    try {
      const clientId = await getClientId(db, req);
      // End any active session first
      await db.query(
        'UPDATE glp1_fasting_sessions SET ended_at=NOW() WHERE client_id=$1 AND ended_at IS NULL',
        [clientId]
      );
      const fastHours = METHOD_HOURS[method_id];
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
      res.json({ success: true });
    } catch (err) {
      console.error('Fasting stop error:', err.message);
      res.status(500).json({ error: 'Failed to stop fasting session' });
    }
  });

  router.get('/fasting/current', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `SELECT * FROM glp1_fasting_sessions
         WHERE client_id=$1 AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [clientId]
      );
      res.json({ session: r.rows[0] ?? null });
    } catch (err) {
      console.error('Fasting current error:', err.message);
      res.status(500).json({ error: 'Failed to fetch current session' });
    }
  });

  router.get('/fasting/history', auth, async (req, res) => {
    const { from, to, limit = '30' } = req.query;
    try {
      const clientId = await getClientId(db, req);
      const params = [clientId];
      let where = 'WHERE client_id=$1 AND ended_at IS NOT NULL';
      if (from) { params.push(from); where += ` AND started_at >= $${params.length}::date`; }
      if (to)   { params.push(to);   where += ` AND started_at <  ($${params.length}::date + INTERVAL '1 day')`; }
      params.push(Math.min(Number(limit) || 30, 200));
      const r = await db.query(
        `SELECT * FROM glp1_fasting_sessions
         ${where}
         ORDER BY started_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ sessions: r.rows });
    } catch (err) {
      console.error('Fasting history error:', err.message);
      res.status(500).json({ error: 'Failed to fetch fasting history' });
    }
  });

  // ── Fasting schedule ──────────────────────────────────────────────────────

  router.get('/fasting/schedule', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        'SELECT * FROM glp1_fasting_schedule WHERE client_id=$1',
        [clientId]
      );
      if (!r.rows.length) return res.json({ enabled: false, reminder_hour: 20, reminder_min: 0, fast_days: null });
      res.json(r.rows[0]);
    } catch (err) {
      console.error('Fasting schedule GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch fasting schedule' });
    }
  });

  router.put('/fasting/schedule', auth, async (req, res) => {
    const { enabled, reminder_hour, reminder_min, fast_days } = req.body ?? {};
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
    if (typeof reminder_hour !== 'number' || reminder_hour < 0 || reminder_hour > 23)
      return res.status(400).json({ error: 'reminder_hour must be 0–23' });
    if (typeof reminder_min !== 'number' || reminder_min < 0 || reminder_min > 59)
      return res.status(400).json({ error: 'reminder_min must be 0–59' });
    if (fast_days !== null && fast_days !== undefined) {
      if (!Array.isArray(fast_days) || fast_days.some(d => !Number.isInteger(d) || d < 0 || d > 6))
        return res.status(400).json({ error: 'fast_days must be an array of integers 0–6' });
    }
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `INSERT INTO glp1_fasting_schedule (client_id, enabled, reminder_hour, reminder_min, fast_days, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           enabled=EXCLUDED.enabled, reminder_hour=EXCLUDED.reminder_hour,
           reminder_min=EXCLUDED.reminder_min, fast_days=EXCLUDED.fast_days,
           updated_at=NOW()
         RETURNING *`,
        [clientId, enabled, reminder_hour, reminder_min, fast_days ?? null]
      );
      if (enabled) {
        scheduleNextReminder(clientId, reminder_hour, reminder_min, fast_days);
      } else {
        const key = `schedule-${clientId}`;
        const h   = scheduleReminders.get(key);
        if (h) { clearTimeout(h); scheduleReminders.delete(key); }
      }
      res.json(r.rows[0]);
    } catch (err) {
      console.error('Fasting schedule PUT error:', err.message);
      res.status(500).json({ error: 'Failed to save fasting schedule' });
    }
  });

  // ── Fasting plans ─────────────────────────────────────────────────────────

  router.get('/fasting/plans', auth, async (req, res) => {
    const { from, to } = req.query;
    try {
      const clientId = await getClientId(db, req);
      const params = [clientId];
      let where = 'WHERE client_id=$1';
      if (from) { params.push(from); where += ` AND plan_date >= $${params.length}::date`; }
      if (to)   { params.push(to);   where += ` AND plan_date <= $${params.length}::date`; }
      const r = await db.query(
        `SELECT plan_date::text, method_id, start_time::text, alert_enabled
         FROM glp1_fasting_plan ${where}
         ORDER BY plan_date`,
        params
      );
      res.json({ plans: r.rows });
    } catch (err) {
      console.error('Plans GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  router.put('/fasting/plans/:date', auth, async (req, res) => {
    const planErr = validatePlan(req.body);
    if (planErr) return res.status(400).json({ error: planErr });
    const { plan_date } = req.params;
    const planDate = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    const { method_id, start_time, alert_enabled } = req.body;
    try {
      const clientId = await getClientId(db, req);
      const r = await db.query(
        `INSERT INTO glp1_fasting_plan (client_id, plan_date, method_id, start_time, alert_enabled)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (client_id, plan_date) DO UPDATE SET
           method_id=EXCLUDED.method_id, start_time=EXCLUDED.start_time,
           alert_enabled=EXCLUDED.alert_enabled
         RETURNING plan_date::text, method_id, start_time::text, alert_enabled`,
        [clientId, planDate, method_id, start_time, alert_enabled]
      );
      if (alert_enabled) {
        schedulePlanAlert(clientId, planDate, start_time, method_id);
      } else {
        const key = `plan-${clientId}-${planDate}`;
        const h   = planTimers.get(key);
        if (h) { clearTimeout(h); planTimers.delete(key); }
      }
      res.json({ plan: r.rows[0] });
    } catch (err) {
      console.error('Plan PUT error:', err.message);
      res.status(500).json({ error: 'Failed to save plan' });
    }
  });

  router.delete('/fasting/plans/:date', auth, async (req, res) => {
    const planDate = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    try {
      const clientId = await getClientId(db, req);
      await db.query('DELETE FROM glp1_fasting_plan WHERE client_id=$1 AND plan_date=$2', [clientId, planDate]);
      const key = `plan-${clientId}-${planDate}`;
      const h   = planTimers.get(key);
      if (h) { clearTimeout(h); planTimers.delete(key); }
      res.json({ success: true });
    } catch (err) {
      console.error('Plan DELETE error:', err.message);
      res.status(500).json({ error: 'Failed to delete plan' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter, rehydrateFastingTimers, rehydrateScheduleReminders, rehydratePlanAlerts };
