'use strict';

// Personal file transfer/storage — upload up to 1GB, list, download, delete.
// Files live on disk (never under public/, never express.static'd); DB only
// tracks metadata + the random on-disk filename, keyed to the owning client.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1GB

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS client_files (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_client_files_client_id ON client_files(client_id)`,
  // Attachments (e.g. call transcripts) scoped to a specific Demand Form.
  // NULL means it's a general personal file, not tied to any record.
  `ALTER TABLE client_files ADD COLUMN IF NOT EXISTS demand_form_id INT REFERENCES demand_forms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_client_files_demand_form_id ON client_files(demand_form_id)`,
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // random name only — never derive the on-disk path from user input
  filename: (req, file, cb) => cb(null, crypto.randomBytes(24).toString('hex')),
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // GET / — list this client's general (non-attachment) files
  router.get('/', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT id, original_name, mime_type, size_bytes, created_at
         FROM client_files WHERE client_id = $1 AND demand_form_id IS NULL ORDER BY created_at DESC`,
        [clientId]
      );
      res.json({ files: result.rows });
    } catch (err) {
      console.error('Files list error:', err.message);
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // GET /demand/:demandFormId — list attachments (e.g. transcripts) for a Demand Form
  router.get('/demand/:demandFormId', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT id, original_name, mime_type, size_bytes, created_at
         FROM client_files WHERE client_id = $1 AND demand_form_id = $2 ORDER BY created_at DESC`,
        [clientId, req.params.demandFormId]
      );
      res.json({ files: result.rows });
    } catch (err) {
      console.error('Attachments list error:', err.message);
      res.status(500).json({ error: 'Failed to list attachments' });
    }
  });

  // POST /demand/:demandFormId — upload an attachment scoped to a Demand Form (field name: "file")
  router.post('/demand/:demandFormId', auth, (req, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File exceeds the 1GB limit' });
        }
        console.error('Upload error:', err.message);
        return res.status(400).json({ error: 'Upload failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      try {
        const clientId = await getClientId(db, req);
        const result = await db.query(
          `INSERT INTO client_files (client_id, original_name, stored_name, mime_type, size_bytes, demand_form_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, original_name, mime_type, size_bytes, created_at`,
          [clientId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.params.demandFormId]
        );
        res.status(201).json({ file: result.rows[0] });
      } catch (dbErr) {
        fs.unlink(req.file.path, () => {}); // don't leave an orphaned file if the DB write failed
        console.error('Attachment record error:', dbErr.message);
        res.status(500).json({ error: 'Failed to save attachment record' });
      }
    });
  });

  // POST / — upload a file (field name: "file")
  router.post('/', auth, (req, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File exceeds the 1GB limit' });
        }
        console.error('Upload error:', err.message);
        return res.status(400).json({ error: 'Upload failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      try {
        const clientId = await getClientId(db, req);
        const result = await db.query(
          `INSERT INTO client_files (client_id, original_name, stored_name, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, original_name, mime_type, size_bytes, created_at`,
          [clientId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
        );
        res.status(201).json({ file: result.rows[0] });
      } catch (dbErr) {
        fs.unlink(req.file.path, () => {}); // don't leave an orphaned file if the DB write failed
        console.error('File record error:', dbErr.message);
        res.status(500).json({ error: 'Failed to save file record' });
      }
    });
  });

  // GET /:id/download
  router.get('/:id/download', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'SELECT * FROM client_files WHERE id = $1 AND client_id = $2',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
      const row = result.rows[0];
      res.download(path.join(UPLOAD_DIR, row.stored_name), row.original_name, (err) => {
        if (err && !res.headersSent) res.status(404).json({ error: 'File missing on disk' });
      });
    } catch (err) {
      console.error('File download error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // DELETE /:id
  router.delete('/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        'DELETE FROM client_files WHERE id = $1 AND client_id = $2 RETURNING stored_name',
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
      fs.unlink(path.join(UPLOAD_DIR, result.rows[0].stored_name), () => {});
      res.json({ success: true });
    } catch (err) {
      console.error('File delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  return router;
}

module.exports = { makeRouter, runMigrations, getClientId };
