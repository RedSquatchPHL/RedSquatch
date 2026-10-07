'use strict';

// Personal blood pressure log. Each row is one cuff reading — systolic,
// diastolic, heart rate, body position, and which arm/site the cuff was on,
// all of which affect the number and are worth keeping alongside it.

const VALID_POSITIONS = ['sitting', 'lying_down', 'standing'];
const VALID_ARMS = ['upper_left', 'upper_right', 'left_forearm', 'right_forearm'];
const VALID_MEDICATIONS = ['amlodipine_5mg', 'amlodipine_10mg'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS blood_pressure_readings (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    systolic    SMALLINT NOT NULL,
    diastolic   SMALLINT NOT NULL,
    heart_rate  SMALLINT,
    position    VARCHAR(20) NOT NULL,
    arm         VARCHAR(20) NOT NULL,
    reading_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blood_pressure_readings_client_id ON blood_pressure_readings(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blood_pressure_readings_reading_at ON blood_pressure_readings(client_id, reading_at)`,
  // heart_rate started out NOT NULL — backfilled historical readings often predate
  // owning a pulse-reading cuff, so the constraint has to come off for rows already
  // in prod. DROP NOT NULL on an already-nullable column is a harmless no-op.
  `ALTER TABLE blood_pressure_readings ALTER COLUMN heart_rate DROP NOT NULL`,
  // Added after initial ship — not every reading is taken alongside a dose, and
  // backfilled history predates logging medication at all, so this is nullable
  // from the start rather than following the heart_rate NOT NULL->nullable path.
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS medication VARCHAR(30)`,
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

function validateReading(body) {
  const { systolic, diastolic, heart_rate, position, arm, medication, reading_at } = body || {};
  if (!Number.isInteger(systolic) || systolic < 40 || systolic > 300) {
    return 'systolic must be an integer between 40 and 300';
  }
  if (!Number.isInteger(diastolic) || diastolic < 20 || diastolic > 200) {
    return 'diastolic must be an integer between 20 and 200';
  }
  if (heart_rate !== null && heart_rate !== undefined) {
    if (!Number.isInteger(heart_rate) || heart_rate < 20 || heart_rate > 250) {
      return 'heart_rate must be an integer between 20 and 250';
    }
  }
  if (!VALID_POSITIONS.includes(position)) {
    return `position must be one of ${VALID_POSITIONS.join(', ')}`;
  }
  if (!VALID_ARMS.includes(arm)) {
    return `arm must be one of ${VALID_ARMS.join(', ')}`;
  }
  if (medication !== null && medication !== undefined && !VALID_MEDICATIONS.includes(medication)) {
    return `medication must be one of ${VALID_MEDICATIONS.join(', ')}`;
  }
  if (!reading_at || Number.isNaN(Date.parse(reading_at))) {
    return 'reading_at must be a valid date/time';
  }
  return null;
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full reading history for this client, newest first
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM blood_pressure_readings WHERE client_id = $1 ORDER BY reading_at DESC, id DESC`,
        [clientId]
      );
      res.json({ readings: result.rows });
    } catch (err) {
      console.error('Blood pressure fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch readings' });
    }
  });

  // POST / — body: { systolic, diastolic, heart_rate, position, arm, medication, reading_at }
  router.post('/', auth, async (req, res) => {
    const validationError = validateReading(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const clientId = await getClientId(db, req);
      const { systolic, diastolic, heart_rate, position, arm, medication, reading_at } = req.body;
      const result = await db.query(
        `INSERT INTO blood_pressure_readings
           (client_id, systolic, diastolic, heart_rate, position, arm, medication, reading_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [clientId, systolic, diastolic, heart_rate ?? null, position, arm, medication ?? null, reading_at]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Blood pressure create error:', err.message);
      res.status(500).json({ error: 'Failed to add reading' });
    }
  });

  // PUT /:id — same body shape as POST
  router.put('/:id', auth, async (req, res) => {
    const validationError = validateReading(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const clientId = await getClientId(db, req);
      const { systolic, diastolic, heart_rate, position, arm, medication, reading_at } = req.body;
      const result = await db.query(
        `UPDATE blood_pressure_readings
         SET systolic = $1, diastolic = $2, heart_rate = $3, position = $4, arm = $5, medication = $6, reading_at = $7, updated_at = NOW()
         WHERE id = $8 AND client_id = $9
         RETURNING *`,
        [systolic, diastolic, heart_rate ?? null, position, arm, medication ?? null, reading_at, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Reading not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Blood pressure update error:', err.message);
      res.status(500).json({ error: 'Failed to update reading' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM blood_pressure_readings WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Reading not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Blood pressure delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete reading' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
