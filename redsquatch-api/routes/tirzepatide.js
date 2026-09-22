'use strict';

// Personal research tracker for comparing compounded tirzepatide pharmacies.
// Mostly no seed data — user-added rows are the norm — but PROFILE_SEEDS below is
// a small exception: reference entries for named providers worth remembering
// (including a few that AREN'T actual prescription sources), seeded once per
// client via profile_key exactly like citizenship.js/fan-tracker.js do it.

const VALID_STATUSES = ['researching', 'contacted', 'ordered', 'rejected'];
const VALID_SOURCE_TYPES = ['compounded', 'manufacturer_direct'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tirzepatide_compounders (
    id                            SERIAL PRIMARY KEY,
    client_id                     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name                          VARCHAR(255) NOT NULL,
    website_url                   VARCHAR(500),
    vial_size_mg                  NUMERIC(10,2),
    price_usd                     NUMERIC(10,2),
    subscription_price_usd        NUMERIC(10,2),
    subscription_interval         VARCHAR(20),
    shipping_cost_usd             NUMERIC(10,2),
    free_shipping_threshold_usd   NUMERIC(10,2),
    telehealth_required           BOOLEAN NOT NULL DEFAULT FALSE,
    telehealth_cost_usd           NUMERIC(10,2),
    labs_required                 BOOLEAN NOT NULL DEFAULT FALSE,
    status                        VARCHAR(20) NOT NULL DEFAULT 'researching',
    notes                         TEXT,
    last_checked_at               TIMESTAMP,
    created_at                    TIMESTAMP DEFAULT NOW(),
    updated_at                    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tirzepatide_compounders_client_id ON tirzepatide_compounders(client_id)`,
  // source_type/profile_key added after initial ship — ADD COLUMN IF NOT EXISTS
  // keeps this idempotent against the table created by the first migration.
  `ALTER TABLE tirzepatide_compounders ADD COLUMN IF NOT EXISTS source_type VARCHAR(20)`,
  `ALTER TABLE tirzepatide_compounders ADD COLUMN IF NOT EXISTS profile_key VARCHAR(50)`,
  // Partial index: only seeded reference rows carry a profile_key, so only those
  // need a uniqueness guarantee — ad-hoc user rows keep profile_key NULL and never
  // collide with each other (Postgres doesn't compare NULLs as equal anyway, but
  // being explicit here matches the ON CONFLICT target used by seedProfiles).
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tirzepatide_compounders_profile_key
     ON tirzepatide_compounders(client_id, profile_key) WHERE profile_key IS NOT NULL`,
];

async function runMigrations(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.query(sql);
  }
}

// Named providers worth remembering even before there's pricing to compare —
// some are real compounded/manufacturer-direct sources, others are included
// specifically as a caution (not a pharmacy at all, or a name that collides
// with an unrelated entity) so they don't get mistaken for an option later.
// source_type is left null where the user's own description didn't specify
// compounded vs. manufacturer-direct clearly enough to classify it.
const PROFILE_SEEDS = [
  { profileKey: 'midi-health', name: 'Midi Health', websiteUrl: null, sourceType: 'manufacturer_direct',
    status: 'researching',
    notes: 'Focuses on perimenopause/menopause care; prescribes brand-name Zepbound or Mounjaro through traditional commercial insurance or Medicare.' },
  { profileKey: 'ro-insurance', name: 'Ro — Insurance Navigation', websiteUrl: 'https://ro.co', sourceType: 'manufacturer_direct',
    status: 'researching',
    notes: 'Ro (ro.co) offers both brand-name insurance navigation and a direct-to-consumer cash-pay option for GLP-1/GIP treatments — this row is the insurance/brand-navigation side.' },
  { profileKey: 'ro-cash-pay', name: 'Ro — Cash-Pay', websiteUrl: 'https://ro.co', sourceType: null,
    status: 'researching',
    notes: 'Ro (ro.co) also offers a direct-to-consumer cash-pay option for GLP-1/GIP treatments; not specified whether this is compounded or brand-name self-pay — verify before relying on it.' },
  { profileKey: 'careaccess-health', name: 'CareAccessHealth (Care Access)', websiteUrl: null, sourceType: null,
    status: 'rejected',
    notes: 'Not a prescription source — a global clinical trial network running research studies for metabolic therapies. Don’t confuse with a compounder or telehealth prescriber.' },
  { profileKey: 'altrx', name: 'AltRx', websiteUrl: 'https://altrx.com', sourceType: 'compounded',
    status: 'researching',
    notes: 'Direct-to-consumer cash-pay platform selling compounded semaglutide and compounded tirzepatide, shipped from partner 503A pharmacies.' },
  { profileKey: 'berry-street', name: 'Berry Street', websiteUrl: null, sourceType: null,
    status: 'rejected',
    notes: 'Not a pharmacy — a 1:1 dietitian and nutritional coaching network that accepts insurance. Does not ship compounded medication directly.' },
  { profileKey: 'embody', name: 'Embody (joinem.co)', websiteUrl: 'https://joinem.co', sourceType: 'compounded',
    status: 'researching',
    notes: 'Cash-pay telehealth service offering multi-month bundles of compounded tirzepatide.' },
  { profileKey: 'wellmedr', name: 'WellMedR (WellMed Dr)', websiteUrl: null, sourceType: 'compounded',
    status: 'researching',
    notes: 'Cash-pay platform with flat monthly pricing for compounded tirzepatide — no dose-escalation price spikes.' },
  { profileKey: 'yahoo-health', name: '"Yahoo Health"', websiteUrl: null, sourceType: null,
    status: 'rejected',
    notes: 'Not a clinic — a media outlet/content site. Watch for "As seen on Yahoo Health" marketing badges or affiliate links used by DTC sites as a borrowed credibility signal; verify the actual seller independently.' },
  { profileKey: 'trinity-meds', name: 'Trinity Meds', websiteUrl: null, sourceType: 'compounded',
    status: 'researching',
    notes: 'Online subscription platform that uses partner compounding networks to ship weekly tirzepatide doses.' },
  { profileKey: 'carebox-health', name: 'CareBox Health (careboxhealth.com)', websiteUrl: 'https://careboxhealth.com', sourceType: null,
    status: 'rejected',
    notes: 'Not a prescription source — a clinical trial matching platform. Distinct from CareBox (carebox.org) below; don’t confuse the two despite the shared name.' },
  { profileKey: 'carebox-org', name: 'CareBox (carebox.org)', websiteUrl: 'https://carebox.org', sourceType: 'compounded',
    status: 'researching',
    notes: 'Direct-to-consumer cash-pay platform selling compounded semaglutide and tirzepatide. Distinct from CareBox Health (careboxhealth.com) above, which is a clinical trial matcher, not a pharmacy source.' },
  { profileKey: 'eden', name: 'Eden (Try Eden)', websiteUrl: null, sourceType: 'compounded',
    status: 'researching',
    notes: 'Cash-pay platform bundling asynchronous medical consultations, compounded tirzepatide, and home delivery into a flat monthly rate.' },
];

async function seedProfiles(db, clientId) {
  for (const p of PROFILE_SEEDS) {
    await db.query(
      `INSERT INTO tirzepatide_compounders (client_id, profile_key, name, website_url, source_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id, profile_key) WHERE profile_key IS NOT NULL DO NOTHING`,
      [clientId, p.profileKey, p.name, p.websiteUrl, p.sourceType, p.status, p.notes]
    );
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

const NUMERIC_FIELDS = [
  'vial_size_mg', 'price_usd', 'subscription_price_usd', 'shipping_cost_usd',
  'free_shipping_threshold_usd', 'telehealth_cost_usd',
];
const BOOLEAN_FIELDS = ['telehealth_required', 'labs_required'];
const TEXT_FIELDS = ['website_url', 'subscription_interval', 'notes', 'last_checked_at'];
const WRITABLE_FIELDS = [...NUMERIC_FIELDS, ...BOOLEAN_FIELDS, ...TEXT_FIELDS, 'status', 'source_type'];

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — full list for this client, seeding reference profiles on first visit
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      await seedProfiles(db, clientId);
      const result = await db.query(
        `SELECT * FROM tirzepatide_compounders WHERE client_id = $1 ORDER BY created_at, id`,
        [clientId]
      );
      res.json({ compounders: result.rows });
    } catch (err) {
      console.error('Tirzepatide compounders fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch compounders' });
    }
  });

  // POST / — body: { name, ...any of NUMERIC_FIELDS/BOOLEAN_FIELDS/TEXT_FIELDS, status? }
  router.post('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, status, source_type } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      if (source_type !== undefined && source_type !== null && !VALID_SOURCE_TYPES.includes(source_type)) {
        return res.status(400).json({ error: `source_type must be one of ${VALID_SOURCE_TYPES.join(', ')}` });
      }

      const cols = ['client_id', 'name'];
      const placeholders = ['$1', '$2'];
      const values = [clientId, String(name).trim()];

      for (const field of WRITABLE_FIELDS) {
        if (req.body?.[field] === undefined) continue;
        values.push(req.body[field]);
        cols.push(field);
        placeholders.push(`$${values.length}`);
      }

      const result = await db.query(
        `INSERT INTO tirzepatide_compounders (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Tirzepatide compounder create error:', err.message);
      res.status(500).json({ error: 'Failed to add compounder' });
    }
  });

  // PUT /:id — body: any subset of the same fields
  router.put('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { status, source_type } = req.body || {};
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      if (source_type !== undefined && source_type !== null && !VALID_SOURCE_TYPES.includes(source_type)) {
        return res.status(400).json({ error: `source_type must be one of ${VALID_SOURCE_TYPES.join(', ')}` });
      }

      const cols = [];
      const values = [];
      for (const field of ['name', ...WRITABLE_FIELDS]) {
        if (req.body?.[field] === undefined) continue;
        values.push(req.body[field]);
        cols.push(`${field} = $${values.length}`);
      }
      if (cols.length === 0) return res.status(400).json({ error: 'No fields to update' });

      values.push(req.params.id, clientId);
      const result = await db.query(
        `UPDATE tirzepatide_compounders SET ${cols.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND client_id = $${values.length}
         RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Compounder not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Tirzepatide compounder update error:', err.message);
      res.status(500).json({ error: 'Failed to update compounder' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM tirzepatide_compounders WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Compounder not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Tirzepatide compounder delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete compounder' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
