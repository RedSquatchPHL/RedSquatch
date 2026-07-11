const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { scrapeAll } = require('./sports-scraper');
const { runMigrations, makeRouter: makeWorkItemsRouter } = require('./routes/work-items');
const { runMigrations: runResearchMigrations, makeRouter: makeResearchRouter } = require('./routes/research');
const { makeRouter: makeRconRouter } = require('./routes/rcon');
const { runMigrations: runNotesMigrations, makeRouter: makeNotesRouter } = require('./routes/notes');
const { runMigrations: runMealsMigrations, makeRouter: makeMealsRouter } = require('./routes/meals');
const { runMigrations: runSpanishMigrations, makeRouter: makeSpanishRouter } = require('./routes/spanish');
const { runMigrations: runBillsMigrations, makeRouter: makeBillsRouter } = require('./routes/bills');

const SPORTS_FILE = path.join(__dirname, 'public', 'sports.json');

const app = express();
const PORT = 3001;

app.set('trust proxy', 1); // trust Traefik's X-Forwarded-Proto so secure cookies work

app.use(cors({
  origin: [
    'https://redsquatch.com',
    'https://www.redsquatch.com',
    'https://app.redsquatch.com',
    'http://localhost:3002',
    'http://localhost:3000'
  ],
  credentials: true
}));

const db = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Register basic middleware (no DB dependency)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware — Pool connects lazily, safe to register before routes
// Cookie config with dynamic secure flag based on protocol
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'redsquatch-secret-key',
  resave: false,
  saveUninitialized: true, // Always create session, even if empty (needed for login to work)
  proxy: true, // trust X-Forwarded-Proto from Traefik proxy
  cookie: (req) => {
    // Production: always use HTTPS settings (Traefik handles HTTPS termination)
    // Development: check for X-Forwarded-Proto or fall back to secure: false
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = isProduction || req.secure || req.get('x-forwarded-proto') === 'https';

    return {
      httpOnly: true,
      // HTTPS only for production; development can use HTTP
      secure: isHttps,
      // SameSite=none required for HTTPS cross-origin requests; lax for HTTP same-origin
      sameSite: isHttps ? 'none' : 'lax',
      // In production, allow all redsquatch.com domains (bare + subdomains)
      domain: isHttps ? 'redsquatch.com' : undefined,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: '/'
    };
  }
}));

// Periodic cleanup of stale sessions (sessions without user data)
async function cleanupStaleSessions() {
  try {
    const result = await db.query(
      `DELETE FROM session WHERE data NOT LIKE '%"user"%' AND expire < NOW() + INTERVAL '1 hour'`
    );
    if (result.rowCount > 0) {
      console.log(`[SESSION-CLEANUP] Removed ${result.rowCount} stale sessions`);
    }
  } catch (err) {
    console.error('[SESSION-CLEANUP-ERROR]', err.message);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupStaleSessions, 30 * 60 * 1000);

const DISPLAY_NAMES = {
  acme_client: 'Darryl'
};

function requireAuth(req, res, next) {
  if (!req.session.user) {
    const hasCookie = !!req.headers.cookie?.includes('connect.sid');
    const sid = req.sessionID;
    const verb = hasCookie ? 'stale' : 'missing';
    console.log(`[AUTH-FAIL] ${verb} session (SID: ${sid})`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============ AUTH ============

app.post('/api/client/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await db.query(
      'SELECT id, username, password_hash, totp_enabled FROM client_users WHERE username = $1',
      [username]
    );
    const dbUser = result.rows[0];
    if (!dbUser) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (dbUser.totp_enabled) {
      req.session.pendingUser = { id: dbUser.id, username: dbUser.username };
      return req.session.save(err => {
        if (err) {
          console.error(`[LOGIN-FAIL] Session save error: ${err.message}`);
          return res.status(500).json({ error: 'Session save failed' });
        }
        console.log(`[LOGIN-OTP-PENDING] User ${username} awaiting TOTP (SID: ${req.sessionID})`);
        res.json({ success: true, awaiting_otp: true });
      });
    }

    req.session.user = { username: dbUser.username, displayName: DISPLAY_NAMES[dbUser.username] };
    req.session.save(err => {
      if (err) {
        console.error(`[LOGIN-FAIL] Session save error: ${err.message}`);
        return res.status(500).json({ error: 'Session save failed' });
      }
      console.log(`[LOGIN-SUCCESS] User ${username} session saved (SID: ${req.sessionID})`);
      res.json({ success: true, message: 'Login successful' });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/client/verify-otp', async (req, res) => {
  const { token } = req.body;
  if (!req.session.pendingUser) return res.status(401).json({ error: 'No pending login' });
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const result = await db.query(
      'SELECT username, totp_secret FROM client_users WHERE id = $1',
      [req.session.pendingUser.id]
    );
    const dbUser = result.rows[0];
    if (!dbUser || !dbUser.totp_secret) return res.status(401).json({ error: 'Invalid session' });

    const verified = speakeasy.totp.verify({
      secret: dbUser.totp_secret,
      encoding: 'base32',
      token,
      window: 1
    });
    if (!verified) return res.status(401).json({ error: 'Invalid code' });

    req.session.user = { username: dbUser.username, displayName: DISPLAY_NAMES[dbUser.username] };
    delete req.session.pendingUser;
    req.session.save(err => {
      if (err) {
        console.error(`[OTP-FAIL] Session save error: ${err.message}`);
        return res.status(500).json({ error: 'Session save failed' });
      }
      console.log(`[OTP-SUCCESS] User ${dbUser.username} completed 2FA (SID: ${req.sessionID})`);
      res.json({ success: true, message: 'Login successful' });
    });
  } catch (err) {
    console.error('OTP verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/client/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/client/session', (req, res) => {
  if (req.session.user) res.json({ authenticated: true, user: req.session.user });
  else res.json({ authenticated: false });
});

// ============ TOTP (2FA) ============

app.get('/api/client/totp/status', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT totp_enabled FROM client_users WHERE username = $1',
      [req.session.user.username]
    );
    res.json({ enabled: !!result.rows[0]?.totp_enabled });
  } catch (err) {
    console.error('TOTP status error:', err.message);
    res.status(500).json({ error: 'Failed to fetch TOTP status' });
  }
});

app.post('/api/client/totp/setup', requireAuth, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `RedSquatch (${req.session.user.username})` });
    await db.query(
      'UPDATE client_users SET totp_secret = $1, totp_enabled = false WHERE username = $2',
      [secret.base32, req.session.user.username]
    );
    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qr, secret: secret.base32 });
  } catch (err) {
    console.error('TOTP setup error:', err.message);
    res.status(500).json({ error: 'Failed to start TOTP setup' });
  }
});

app.post('/api/client/totp/verify', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const result = await db.query(
      'SELECT totp_secret FROM client_users WHERE username = $1',
      [req.session.user.username]
    );
    const dbUser = result.rows[0];
    if (!dbUser?.totp_secret) return res.status(400).json({ error: 'No pending TOTP setup' });

    const verified = speakeasy.totp.verify({
      secret: dbUser.totp_secret,
      encoding: 'base32',
      token,
      window: 1
    });
    if (!verified) return res.status(401).json({ error: 'Invalid code' });

    await db.query('UPDATE client_users SET totp_enabled = true WHERE username = $1', [req.session.user.username]);
    res.json({ success: true });
  } catch (err) {
    console.error('TOTP verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/client/totp/disable', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE client_users SET totp_enabled = false, totp_secret = NULL WHERE username = $1',
      [req.session.user.username]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('TOTP disable error:', err.message);
    res.status(500).json({ error: 'Failed to disable TOTP' });
  }
});

// ============ GOALS ============

app.get('/api/client/goals', requireAuth, async (req, res) => {
  const { context } = req.query;
  try {
    let query = `
      SELECT g.*, gc.sub_type AS category_name
      FROM goals g
      LEFT JOIN goal_categories gc ON g.category_id = gc.id
      WHERE g.archived_at IS NULL
    `;
    const params = [];
    if (context && ['work', 'home', 'personal'].includes(context)) {
      params.push(context);
      query += ` AND g.context = $${params.length}`;
    }
    query += ' ORDER BY g.created_at DESC';

    const goalsResult = await db.query(query, params);
    const goals = goalsResult.rows;

    if (goals.length === 0) return res.json({ goals: [] });

    const goalIds = goals.map(g => g.id);
    const msResult = await db.query(
      'SELECT * FROM milestones WHERE goal_id = ANY($1) ORDER BY goal_id, sequence_order, id',
      [goalIds]
    );

    const milestonesByGoal = {};
    for (const ms of msResult.rows) {
      if (!milestonesByGoal[ms.goal_id]) milestonesByGoal[ms.goal_id] = [];
      milestonesByGoal[ms.goal_id].push(ms);
    }

    const enriched = goals.map(g => {
      const ms = milestonesByGoal[g.id] || [];
      const completed = ms.filter(m => m.is_completed).length;
      const statusProgress = ['achieved', 'on-hold'].includes(g.status) ? 100 : 0;
      const progress = ms.length > 0 ? Math.round((completed / ms.length) * 100) : statusProgress;
      return { ...g, milestones: ms, progress };
    });

    res.json({ goals: enriched });
  } catch (err) {
    console.error('Goals fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

app.post('/api/client/goals', requireAuth, async (req, res) => {
  const { title, description, context, category_id, target_date, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const ctx = ['work', 'home', 'personal'].includes(context) ? context : 'personal';
  const st = ['draft','active','paused','blocked','on-hold','achieved','archived'].includes(status) ? status : 'draft';
  try {
    const result = await db.query(
      `INSERT INTO goals (title, description, context, category_id, target_date, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
      [title, description || null, ctx, category_id || null, target_date || null, st]
    );
    res.status(201).json({ goal: result.rows[0] });
  } catch (err) {
    console.error('Goal create error:', err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.put('/api/client/goals/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description, context, category_id, target_date, status, progress } = req.body;
  try {
    const existing = await db.query('SELECT * FROM goals WHERE id = $1 AND archived_at IS NULL', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    const g = existing.rows[0];
    const newCtx = context && ['work','home','personal'].includes(context) ? context : g.context;
    const newSt  = status && ['draft','active','paused','blocked','on-hold','achieved','archived'].includes(status) ? status : g.status;
    const newProg = progress !== undefined ? parseInt(progress, 10) : g.progress;
    const result = await db.query(
      `UPDATE goals SET
        title       = $1,
        description = $2,
        context     = $3,
        category_id = $4,
        target_date = $5,
        status      = $6,
        progress    = $7,
        updated_at  = NOW()
       WHERE id = $8 RETURNING *`,
      [
        title ?? g.title,
        description !== undefined ? description : g.description,
        newCtx,
        category_id !== undefined ? category_id : g.category_id,
        target_date !== undefined ? target_date : g.target_date,
        newSt,
        isNaN(newProg) ? g.progress : newProg,
        id
      ]
    );
    res.json({ goal: result.rows[0] });
  } catch (err) {
    console.error('Goal update error:', err.message);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

app.delete('/api/client/goals/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE goals SET archived_at = NOW(), updated_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Goal delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

app.post('/api/client/goals/:id/archive', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE goals SET status = 'archived', archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Goal archive error:', err.message);
    res.status(500).json({ error: 'Failed to archive goal' });
  }
});

// Fetch archived goals (archived_at IS NOT NULL)
app.get('/api/client/goals/archived', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.*, gc.sub_type AS category_name
      FROM goals g
      LEFT JOIN goal_categories gc ON g.category_id = gc.id
      WHERE g.archived_at IS NOT NULL
      ORDER BY g.archived_at DESC
    `);
    const goals = result.rows.map(g => ({ ...g, progress: 100 }));
    res.json({ goals });
  } catch (err) {
    console.error('Archived goals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch archived goals' });
  }
});

// Restore an archived goal
app.put('/api/client/goals/:id/restore', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE goals SET archived_at = NULL, status = 'achieved', updated_at = NOW()
       WHERE id = $1 AND archived_at IS NOT NULL RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Archived goal not found' });
    res.json({ goal: result.rows[0] });
  } catch (err) {
    console.error('Goal restore error:', err.message);
    res.status(500).json({ error: 'Failed to restore goal' });
  }
});

// Permanently hard-delete a goal (archived only)
app.delete('/api/client/goals/:id/permanent', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM goals WHERE id = $1 AND archived_at IS NOT NULL RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Archived goal not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Goal permanent delete error:', err.message);
    res.status(500).json({ error: 'Failed to permanently delete goal' });
  }
});

// ============ MILESTONES ============

app.post('/api/client/milestones', requireAuth, async (req, res) => {
  const { goal_id, title, sequence_order } = req.body;
  if (!goal_id || !title) return res.status(400).json({ error: 'goal_id and title are required' });
  try {
    const result = await db.query(
      'INSERT INTO milestones (goal_id, title, sequence_order) VALUES ($1, $2, $3) RETURNING *',
      [goal_id, title, sequence_order || 0]
    );
    res.status(201).json({ milestone: result.rows[0] });
  } catch (err) {
    console.error('Milestone create error:', err.message);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

app.put('/api/client/milestones/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, is_completed, sequence_order } = req.body;
  try {
    const existing = await db.query('SELECT * FROM milestones WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const m = existing.rows[0];
    const nowCompleted = is_completed !== undefined ? Boolean(is_completed) : m.is_completed;
    const completedAt  = nowCompleted && !m.is_completed ? 'NOW()' : (nowCompleted ? m.completed_at : null);
    const result = await db.query(
      `UPDATE milestones SET
        title          = $1,
        sequence_order = $2,
        is_completed   = $3,
        completed_at   = $4,
        updated_at     = NOW()
       WHERE id = $5 RETURNING *`,
      [
        title ?? m.title,
        sequence_order !== undefined ? sequence_order : m.sequence_order,
        nowCompleted,
        nowCompleted && !m.is_completed ? new Date() : (nowCompleted ? m.completed_at : null),
        id
      ]
    );
    res.json({ milestone: result.rows[0] });
  } catch (err) {
    console.error('Milestone update error:', err.message);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

app.delete('/api/client/milestones/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM milestones WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Milestone delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// ============ TASKS ============

app.get('/api/client/tasks', requireAuth, async (req, res) => {
  const { filter } = req.query;
  try {
    let query = `
      SELECT t.*, g.title AS goal_title, g.context AS goal_context
      FROM tasks t
      LEFT JOIN goals g ON t.goal_id = g.id
      WHERE t.archived_at IS NULL
    `;
    const params = [];
    if (filter === 'maintenance') {
      query += ' AND t.is_maintenance = true';
    } else if (filter === 'goals') {
      query += ' AND t.is_maintenance = false';
    }
    query += ' ORDER BY t.updated_at DESC';
    const result = await db.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Tasks fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/client/tasks', requireAuth, async (req, res) => {
  const { title, is_maintenance, goal_id, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const st = ['todo','in_progress','done'].includes(status) ? status : 'todo';
  try {
    const result = await db.query(
      'INSERT INTO tasks (title, is_maintenance, goal_id, status, user_id) VALUES ($1, $2, $3, $4, 1) RETURNING *',
      [title, Boolean(is_maintenance), goal_id || null, st]
    );
    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error('Task create error:', err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/client/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, status, goal_id, is_maintenance } = req.body;
  try {
    const existing = await db.query('SELECT * FROM tasks WHERE id = $1 AND archived_at IS NULL', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const t = existing.rows[0];
    const newSt = status && ['todo','in_progress','done'].includes(status) ? status : t.status;
    const result = await db.query(
      `UPDATE tasks SET
        title        = $1,
        status       = $2,
        goal_id      = $3,
        is_maintenance = $4,
        updated_at   = NOW()
       WHERE id = $5 RETURNING *`,
      [
        title ?? t.title,
        newSt,
        goal_id !== undefined ? goal_id : t.goal_id,
        is_maintenance !== undefined ? Boolean(is_maintenance) : t.is_maintenance,
        id
      ]
    );

    // Auto-log completion for maintenance tasks
    if (t.is_maintenance && newSt === 'done' && t.status !== 'done') {
      await db.query('INSERT INTO maintenance_logs (task_id) VALUES ($1)', [id]);
      // Reset maintenance task back to todo after logging
      await db.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['todo', id]);
      const refreshed = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      return res.json({ task: refreshed.rows[0], logged: true });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Task update error:', err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/client/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE tasks SET archived_at = NOW(), updated_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Task delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ============ MAINTENANCE LOGS ============

app.get('/api/client/maintenance-logs', requireAuth, async (req, res) => {
  const { task_id } = req.query;
  try {
    let query = 'SELECT ml.*, t.title AS task_title FROM maintenance_logs ml JOIN tasks t ON ml.task_id = t.id';
    const params = [];
    if (task_id) {
      params.push(task_id);
      query += ` WHERE ml.task_id = $${params.length}`;
    }
    query += ' ORDER BY ml.completed_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ logs: result.rows });
  } catch (err) {
    console.error('Maintenance logs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

app.post('/api/client/maintenance-logs', requireAuth, async (req, res) => {
  const { task_id, notes } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id is required' });
  try {
    const result = await db.query(
      'INSERT INTO maintenance_logs (task_id, notes) VALUES ($1, $2) RETURNING *',
      [task_id, notes || null]
    );
    res.status(201).json({ log: result.rows[0] });
  } catch (err) {
    console.error('Maintenance log create error:', err.message);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
});

// ============ GOAL CATEGORIES ============

app.get('/api/client/goal-categories', requireAuth, async (req, res) => {
  const { context } = req.query;
  try {
    let query = 'SELECT * FROM goal_categories';
    const params = [];
    if (context) {
      params.push(context);
      query += ' WHERE parent_context = $1';
    }
    query += ' ORDER BY parent_context, sub_type';
    const result = await db.query(query, params);
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Categories error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============ QUICK INFO ============

// In-memory cache
const qiCache = {
  quote:   { data: null, dateKey: null },   // keyed by 'YYYY-MM-DD'
  history: { data: null, dateKey: null },   // keyed by 'MM-DD'
  weather: { data: null, expiresAt: 0 },    // keyed by timestamp
};

function todayKey()  { return new Date().toISOString().slice(0, 10); }         // YYYY-MM-DD
function todayMMDD() { const d = new Date(); return `${d.getUTCMonth()+1}-${d.getUTCDate()}`; }

// ── Quote ─────────────────────────────────────────────────────────────────────

const FALLBACK_QUOTES = [
  { text: 'What we do now echoes in eternity.',            author: 'Marcus Aurelius' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'He who fears death will never do anything worthy of a man who is alive.', author: 'Seneca' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.',    author: 'Marcus Aurelius' },
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'Luck is what happens when preparation meets opportunity.',             author: 'Seneca' },
  { text: 'It is not that I am so smart; it is just that I stay with problems longer.', author: 'Albert Einstein' },
  { text: 'The unexamined life is not worth living.',                             author: 'Socrates' },
];

async function fetchQuote() {
  try {
    const res = await fetch('https://stoic.tekloon.net/stoic-quote', {
      headers: { 'User-Agent': 'RedSquatch/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const d = await res.json();
    if (d?.data?.quote) return { text: d.data.quote, author: d.data.author || 'Unknown' };
  } catch { /* fall through */ }
  // Deterministic daily fallback keyed by day-of-year
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return FALLBACK_QUOTES[doy % FALLBACK_QUOTES.length];
}

app.get('/api/client/quick-info/quote', async (req, res) => {
  const force = req.query.force === 'true';
  const key   = todayKey();
  if (!force && qiCache.quote.dateKey === key && qiCache.quote.data) {
    return res.json(qiCache.quote.data);
  }
  try {
    const quote = await fetchQuote();
    const payload = { ...quote, updated: new Date().toISOString() };
    qiCache.quote = { data: payload, dateKey: key };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// ── History ───────────────────────────────────────────────────────────────────

async function fetchHistory() {
  const d   = new Date();
  const mon = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mon}/${day}`,
    { headers: { 'User-Agent': 'RedSquatch/1.0' }, signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();
  const events = (data.events || []).filter(e => e.text && e.text.length > 40);

  // Pick one "recent" (post-1950) and one "historic" (pre-1950) for variety
  const recent   = [...events].filter(e => e.year >= 1950).sort((a, b) => b.year - a.year);
  const historic = [...events].filter(e => e.year <  1950).sort((a, b) => b.year - a.year);

  const picks = [
    recent[0]   || events[0],
    historic[0] || events[1] || events[0],
  ].filter(Boolean).slice(0, 2);

  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return {
    dateLabel: `${months[mon - 1]} ${day}`,
    events: picks.map(e => ({ year: e.year, text: e.text })),
  };
}

app.get('/api/client/quick-info/history', requireAuth, async (req, res) => {
  const force = req.query.force === 'true';
  const key   = todayMMDD();
  if (!force && qiCache.history.dateKey === key && qiCache.history.data) {
    return res.json(qiCache.history.data);
  }
  try {
    const hist    = await fetchHistory();
    const payload = { ...hist, updated: new Date().toISOString() };
    qiCache.history = { data: payload, dateKey: key };
    res.json(payload);
  } catch (err) {
    console.error('History fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── Weather ───────────────────────────────────────────────────────────────────

const WEATHER_TTL = 2 * 60 * 60 * 1000; // 2 hours

function weatherEmoji(code) {
  const c = parseInt(code, 10);
  if (c === 113) return '☀️';
  if (c === 116) return '⛅';
  if ([119, 122].includes(c)) return '☁️';
  if ([143, 248, 260].includes(c)) return '🌫️';
  if ([200, 386, 389, 392, 395].includes(c)) return '⛈️';
  if (c >= 329 && c <= 395) return '❄️';
  if (c >= 317 && c <= 326) return '🌨️';
  if (c >= 263 && c <= 314) return '🌧️';
  if ([176, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(c)) return '🌧️';
  return '🌤️';
}

async function fetchWeather() {
  const res  = await fetch('https://wttr.in/Jenkintown,PA?format=j1', {
    headers: { 'User-Agent': 'RedSquatch/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();

  const cur  = data.current_condition[0];
  const days = data.weather; // [today, tomorrow, day+2]

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function fmtDay(dateStr, index) {
    const d = new Date(dateStr + 'T12:00:00');
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return dayNames[d.getDay()];
  }

  const forecast = days.map((day, i) => {
    const midHour = day.hourly[4] || day.hourly[0];
    const code    = midHour?.weatherCode ?? day.hourly[0]?.weatherCode ?? '116';
    const desc    = midHour?.weatherDesc?.[0]?.value ?? 'Unknown';
    return {
      label:    fmtDay(day.date, i),
      date:     day.date,
      highF:    parseInt(day.maxtempF, 10),
      lowF:     parseInt(day.mintempF, 10),
      condition: desc,
      emoji:    weatherEmoji(code),
    };
  });

  return {
    location: 'Jenkintown, PA',
    current: {
      tempF:      parseInt(cur.temp_F, 10),
      feelsLikeF: parseInt(cur.FeelsLikeF, 10),
      condition:  cur.weatherDesc[0].value,
      emoji:      weatherEmoji(cur.weatherCode),
      humidity:   parseInt(cur.humidity, 10),
      windMph:    parseInt(cur.windspeedMiles, 10),
      highF:      forecast[0]?.highF ?? null,
      lowF:       forecast[0]?.lowF  ?? null,
    },
    forecast: forecast.slice(1), // tomorrow + day after
  };
}

app.get('/api/client/quick-info/weather', async (req, res) => {
  const force = req.query.force === 'true';
  if (!force && qiCache.weather.expiresAt > Date.now() && qiCache.weather.data) {
    return res.json(qiCache.weather.data);
  }
  try {
    const weather = await fetchWeather();
    const payload = { ...weather, updated: new Date().toISOString() };
    qiCache.weather = { data: payload, expiresAt: Date.now() + WEATHER_TTL };
    res.json(payload);
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather: ' + err.message });
  }
});

// ============ LEGACY / OTHER ============

// ============ LINCOLN WORK TRACKER ============

const LINCOLN_STATUSES     = ['pending', 'in_progress', 'complete', 'billed', 'pending_review'];
const LINCOLN_INTAKE_TYPES = ['demand', 'project', 'defect', 'story', 'enhancement', 'research'];

app.get('/api/client/lincoln/logs', requireAuth, async (req, res) => {
  const { intake_type } = req.query;
  try {
    const params = [];
    let where = 'WHERE archived_at IS NULL';
    if (intake_type && LINCOLN_INTAKE_TYPES.includes(intake_type)) {
      params.push(intake_type);
      where += ` AND intake_type = $${params.length}`;
    }
    const result = await db.query(
      `SELECT * FROM lincoln_work_logs ${where} ORDER BY date DESC, created_at DESC`,
      params
    );
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/client/lincoln/logs', requireAuth, async (req, res) => {
  const { intake_type = 'demand', date, project, hours, status = 'pending', notes, findings, next_steps } = req.body;
  if (!LINCOLN_INTAKE_TYPES.includes(intake_type)) return res.status(400).json({ error: `Invalid intake_type. Must be one of: ${LINCOLN_INTAKE_TYPES.join(', ')}` });
  if (status && !LINCOLN_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query(
      `INSERT INTO lincoln_work_logs (intake_type, date, project, hours, status, notes, findings, next_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [intake_type, date || new Date().toISOString().slice(0, 10), project?.trim() || null, hours || null, status, notes?.trim() || null, intake_type === 'research' ? (findings?.trim() || null) : null, next_steps || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/client/lincoln/logs/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { intake_type, date, project, hours, status, notes, findings, next_steps } = req.body;
  if (intake_type && !LINCOLN_INTAKE_TYPES.includes(intake_type)) return res.status(400).json({ error: `Invalid intake_type. Must be one of: ${LINCOLN_INTAKE_TYPES.join(', ')}` });
  if (status && !LINCOLN_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query(
      `UPDATE lincoln_work_logs
       SET intake_type = COALESCE($1, intake_type),
           date        = COALESCE($2, date),
           project     = COALESCE($3, project),
           hours       = COALESCE($4, hours),
           status      = COALESCE($5, status),
           notes       = COALESCE($6, notes),
           findings    = COALESCE($7, findings),
           next_steps  = COALESCE($8, next_steps),
           updated_at  = NOW()
       WHERE id = $9 AND archived_at IS NULL
       RETURNING *`,
      [intake_type || null, date || null, project !== undefined ? (project?.trim() || null) : null, hours ?? null, status || null, notes !== undefined ? (notes?.trim() || null) : null, findings !== undefined ? (findings?.trim() || null) : null, next_steps || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/client/lincoln/logs/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE lincoln_work_logs SET archived_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Log not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/client/dashboard', requireAuth, async (req, res) => {
  res.json({ user: req.session.user.username, dashboard: { status: 'operational' } });
});

app.get('/api/client/quick-info', requireAuth, (req, res) => {
  res.json({ quick_stats: { active_projects: 8, pending_milestones: 3, sports_teams: 4 } });
});

app.get('/api/client/sports', requireAuth, (req, res) => {
  try {
    const raw = fs.readFileSync(SPORTS_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(503).json({ error: 'Sports data not yet available. Try refreshing.' });
  }
});

let refreshInProgress = false;

app.post('/api/client/sports/refresh', requireAuth, async (req, res) => {
  if (refreshInProgress) {
    return res.status(429).json({ error: 'Refresh already in progress' });
  }
  refreshInProgress = true;
  const deadline = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Refresh timed out after 30s')), 30000)
  );
  try {
    const data = await Promise.race([scrapeAll(), deadline]);
    res.json({ success: true, updated: data.updated });
  } catch (err) {
    console.error('Sports refresh error:', err.message);
    res.status(500).json({ error: 'Refresh failed: ' + err.message });
  } finally {
    refreshInProgress = false;
  }
});

// ============ WORK ITEMS ============

app.use('/api/client/work-items', makeWorkItemsRouter(db));
app.use('/api/client/research', makeResearchRouter(db));
app.use('/api/client/rcon', makeRconRouter(db));
app.use('/api/client/notes', makeNotesRouter(db));
app.use('/api/client/meals', makeMealsRouter(db));
app.use('/api/client/spanish', makeSpanishRouter(db));
app.use('/api/client/bills', makeBillsRouter(db));

// ============ TOOLS ============

app.get('/api/client/tools', requireAuth, (req, res) => {
  res.json({
    tools: [
      {
        id: 'joplin',
        name: 'Joplin',
        description: 'Notes & journaling',
        url: 'https://joplin.redsquatch.com',
        icon: 'notebook',
        color: '#2196F3'
      },
      {
        id: 'nextcloud',
        name: 'Nextcloud',
        description: 'Cloud storage & files',
        url: 'https://cloud.redsquatch.com',
        icon: 'cloud',
        color: '#0082C9'
      },
      {
        id: 'stirling-pdf',
        name: 'Stirling-PDF',
        description: 'PDF tools & utilities',
        url: 'https://pdf.redsquatch.com',
        icon: 'file-pdf',
        color: '#d4a373'
      },
      {
        id: 'bookmarks',
        name: 'Linkding',
        description: 'Bookmark management',
        url: 'https://bookmarks.redsquatch.com',
        icon: 'bookmark',
        color: '#FF9800'
      }
    ]
  });
});

// ============ INITIALIZATION ============

async function initializeApp() {
  try {
    await db.query('SELECT 1');
    console.log('✓ PostgreSQL connected');

    // Run idempotent schema migrations
    await runMigrations(db);
    await runResearchMigrations(db);
    await runNotesMigrations(db);
    await runMealsMigrations(db);
    await runSpanishMigrations(db);
    await runBillsMigrations(db);

    app.listen(PORT, () => {
      console.log(`✓ RedSquatch API running on port ${PORT}`);

      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      const ONE_DAY     = 24 * 60 * 60 * 1000;

      function maybeRefresh() {
        try {
          const stat = fs.statSync(SPORTS_FILE);
          if (Date.now() - stat.mtimeMs < EIGHT_HOURS) return;
        } catch { /* file doesn't exist — run scraper */ }
        scrapeAll().catch(err => console.error('Auto-refresh failed:', err.message));
      }
      maybeRefresh();
      setInterval(() => scrapeAll().catch(err => console.error('Scheduled refresh failed:', err.message)), EIGHT_HOURS);

    });

  } catch (err) {
    console.error('✗ Initialization failed:', err.message);
    process.exit(1);
  }
}

initializeApp();
