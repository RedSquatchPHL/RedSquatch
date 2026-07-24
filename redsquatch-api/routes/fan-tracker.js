'use strict';

// Canonical starter data for Pedro Ortiz Preciado's FAN (Friends, Associates &
// Neighbors) research circle. Seeded once per client on first visit — matches
// the citizenship.js seeding pattern (idempotent via ON CONFLICT DO NOTHING) so
// edits/checks made afterward persist independently of this list.
const CANONICAL_PEOPLE = [
  {
    personKey: 'pedro',
    name: 'Pedro Ortiz Preciado',
    type: 'family',
    details: [
      'Born: ~1932, Ahualulco, Jalisco',
      'Status: Main focus | Birth year needs verification (1932 vs 1886 discrepancy noted)',
      'Location: Ahualulco → Riverside County/Northern California',
    ],
    statusLabel: 'PRIORITY',
    statusClass: 'pending',
  },
  {
    personKey: 'arcadio',
    name: 'Arcadio Preciado Santana',
    type: 'family',
    details: [
      'Born: January 12, 1902, Ahualulco de Mercado, Jalisco',
      'Father: Jose (age 40 at Arcadio’s birth)',
      'Mother: Cecilia (age 32 at Arcadio’s birth)',
      'Spouse: María Ortiz Santana (d. 1992, age 85)',
    ],
    statusLabel: 'DOCUMENTED',
    statusClass: 'searched',
  },
  {
    personKey: 'maria',
    name: 'María Salome Ortiz Santana',
    type: 'family',
    details: [
      'Born: October 22, 1906, Ahualulco de Mercado, Jalisco',
      'Parents: Anastacia & Antonio',
      'Spouse: Arcadio Preciado Santana',
      'Died: May 14, 1992, Ahualulco de Mercado, age 85',
    ],
    statusLabel: 'DOCUMENTED',
    statusClass: 'searched',
  },
  {
    personKey: 'irma',
    name: 'Irma Precia / Irma Preciado',
    type: 'associate',
    details: [
      'Pedro’s half-aunt (your contact on Ancestry)',
      'Connected to: Oxnard, CA family network',
      'Status: Can provide oral history & family context',
    ],
    statusLabel: 'TO INTERVIEW',
    statusClass: 'pending',
  },
  {
    personKey: 'network',
    name: 'Riverside County / Northern California Family Network',
    type: 'associate',
    details: [
      'Pedro’s paternal relatives settled in Riverside County & Sacramento area',
      'Status: Likely to appear in 1930s/1940s US Census records & naturalization petitions',
    ],
    statusLabel: 'SEARCH NEEDED',
    statusClass: 'pending',
  },
  {
    personKey: 'ahualulco',
    name: 'Ahualulco de Mercado, Jalisco',
    type: 'neighbor',
    details: [
      'Pedro’s birthplace & family home through 1992',
      'Arcadio & María both born & died here',
      'Next search: Municipal records, parish registers',
    ],
    statusLabel: 'ARCHIVE SEARCH',
    statusClass: 'pending',
  },
  {
    personKey: 'riverside',
    name: 'Riverside County, California',
    type: 'neighbor',
    details: [
      'Settlement location for Pedro’s paternal relatives',
      'Search: 1930, 1940, 1950 US Census; city directories; naturalization records',
    ],
    statusLabel: 'US RECORDS',
    statusClass: 'pending',
  },
];

const CANONICAL_RECORDS = [
  { itemKey: 'mx-1', groupTitle: 'Mexican Records (Jalisco)', label: 'Ahualulco municipal birth register (Pedro, 1930s)' },
  { itemKey: 'mx-2', groupTitle: 'Mexican Records (Jalisco)', label: 'Arcadio Preciado birth certificate (1902)' },
  { itemKey: 'mx-3', groupTitle: 'Mexican Records (Jalisco)', label: 'María Ortiz Santana birth certificate (1906)' },
  { itemKey: 'mx-4', groupTitle: 'Mexican Records (Jalisco)', label: 'Marriage record: Arcadio & María (1924 LA, but may have Jalisco record)' },
  { itemKey: 'mx-5', groupTitle: 'Mexican Records (Jalisco)', label: 'Parish records (Ahualulco Catholic church)' },
  { itemKey: 'mx-6', groupTitle: 'Mexican Records (Jalisco)', label: 'Property/land records (Ahualulco municipal)' },

  { itemKey: 'us-1', groupTitle: 'US Census & Immigration Records', label: '1930 US Census (Riverside County/Sacramento area)' },
  { itemKey: 'us-2', groupTitle: 'US Census & Immigration Records', label: '1940 US Census (Pedro – birth year verification)' },
  { itemKey: 'us-3', groupTitle: 'US Census & Immigration Records', label: '1950 US Census (Pedro & family)' },
  { itemKey: 'us-4', groupTitle: 'US Census & Immigration Records', label: 'Naturalization petition (Pedro)' },
  { itemKey: 'us-5', groupTitle: 'US Census & Immigration Records', label: 'Naturalization petition (Arcadio/María)' },
  { itemKey: 'us-6', groupTitle: 'US Census & Immigration Records', label: 'Ship manifests (Mexican nationals arriving CA)' },

  { itemKey: 'ca-1', groupTitle: 'California County Records', label: 'Los Angeles County marriage cert (Arcadio & María, 1924)' },
  { itemKey: 'ca-2', groupTitle: 'California County Records', label: 'Riverside County marriage records (Pedro)' },
  { itemKey: 'ca-3', groupTitle: 'California County Records', label: 'City directories (Oxnard, Ventura, Riverside, Sacramento)' },
  { itemKey: 'ca-4', groupTitle: 'California County Records', label: 'Death records (Pedro, siblings, parents)' },
];

const VALID_TYPES = ['family', 'associate', 'neighbor', 'other'];
const VALID_STATUS_CLASSES = ['searched', 'pending', 'breakthrough'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS fan_tracker_people (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    person_key    VARCHAR(50),
    name          VARCHAR(255) NOT NULL,
    type          VARCHAR(20) NOT NULL,
    details       JSONB NOT NULL DEFAULT '[]',
    status_label  VARCHAR(50) NOT NULL,
    status_class  VARCHAR(20) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, person_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fan_tracker_people_client_id ON fan_tracker_people(client_id)`,
  `CREATE TABLE IF NOT EXISTS fan_tracker_records (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    item_key     VARCHAR(50) NOT NULL,
    group_title  VARCHAR(255) NOT NULL,
    label        TEXT NOT NULL,
    checked      BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, item_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fan_tracker_records_client_id ON fan_tracker_records(client_id)`,
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

async function seedForClient(db, clientId) {
  for (const p of CANONICAL_PEOPLE) {
    await db.query(
      `INSERT INTO fan_tracker_people (client_id, person_key, name, type, details, status_label, status_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id, person_key) DO NOTHING`,
      [clientId, p.personKey, p.name, p.type, JSON.stringify(p.details), p.statusLabel, p.statusClass]
    );
  }
  for (const r of CANONICAL_RECORDS) {
    await db.query(
      `INSERT INTO fan_tracker_records (client_id, item_key, group_title, label)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id, item_key) DO NOTHING`,
      [clientId, r.itemKey, r.groupTitle, r.label]
    );
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET /people — full FAN circle, seeding canonical rows on first visit
  router.get('/people', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedForClient(db, clientId);
      const result = await db.query(
        `SELECT * FROM fan_tracker_people WHERE client_id = $1 ORDER BY created_at, id`,
        [clientId]
      );
      res.json({ people: result.rows });
    } catch (err) {
      console.error('Fan tracker people fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch FAN circle' });
    }
  });

  // POST /people — body: { name, type, details?, status_label, status_class }
  router.post('/people', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, type, details, status_label, status_class } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(', ')}` });
      if (!VALID_STATUS_CLASSES.includes(status_class)) return res.status(400).json({ error: `status_class must be one of ${VALID_STATUS_CLASSES.join(', ')}` });

      const result = await db.query(
        `INSERT INTO fan_tracker_people (client_id, person_key, name, type, details, status_label, status_class)
         VALUES ($1, NULL, $2, $3, $4, $5, $6)
         RETURNING *`,
        [clientId, String(name).trim(), type, JSON.stringify(Array.isArray(details) ? details : []), status_label || '', status_class]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Fan tracker people create error:', err.message);
      res.status(500).json({ error: 'Failed to add person' });
    }
  });

  // GET /records — full record checklist, seeding canonical rows on first visit
  router.get('/records', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedForClient(db, clientId);
      const result = await db.query(
        `SELECT * FROM fan_tracker_records WHERE client_id = $1 ORDER BY item_key`,
        [clientId]
      );
      res.json({ records: result.rows });
    } catch (err) {
      console.error('Fan tracker records fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch record checklist' });
    }
  });

  // PUT /records/:id — body: { checked }
  router.put('/records/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { checked } = req.body || {};
      if (typeof checked !== 'boolean') return res.status(400).json({ error: 'checked must be a boolean' });

      const result = await db.query(
        `UPDATE fan_tracker_records SET checked = $1, updated_at = NOW()
         WHERE id = $2 AND client_id = $3
         RETURNING *`,
        [checked, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Fan tracker records update error:', err.message);
      res.status(500).json({ error: 'Failed to update record' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
