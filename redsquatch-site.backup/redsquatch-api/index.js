const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const knex = require('knex');

const app = express();
const PORT = 3001;

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
  },
  pool: { min: 0, max: 5 }
});

const KnexSessionStore = require('connect-session-knex')(session);
const store = new KnexSessionStore({ knex: db, tablename: 'sessions' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://redsquatch.com',
    'http://localhost:5173',
    'http://67.217.62.213:5173',
    'http://127.0.0.1:5173'
  ];
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

const ADMIN_PASSWORD_HASH = '$2a$10$cK4zoukkuXT8XsNvZO8Z/OU6JJbiV6/blf6LD1sZMIJjJsF56hLwm';

// ─── Auth Routes ───────────────────────────────────────────────────
app.post('/api/client/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (match) {
      req.session.authenticated = true;
      req.session.user = { id: '1', username: username || 'admin' };
      res.json({
        success: true,
        message: 'Login successful',
        user: req.session.user
      });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.post('/api/client/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/client/session', (req, res) => {
  if (req.session && req.session.authenticated && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.status(401).json({ authenticated: false, error: 'Not authenticated' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Standard Goals & Milestones Routes ────────────────────────────
app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    const goals = await db('goals').orderBy('id');
    const milestones = await db('milestones').orderBy('goal_id');
    const result = goals.map(g => ({
      ...g,
      milestones: milestones.filter(m => m.goal_id === g.id)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/goals/:id', requireAuth, async (req, res) => {
  try {
    const { status, progress } = req.body;
    await db('goals').where('id', req.params.id).update({ status, progress, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/milestones/:id', requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db('milestones').where('id', req.params.id).update({ status, notes, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Widget Cache Engine ──────────────────────────────────────────
const widgetCache = {};
function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  if (widgetCache[key] && now - widgetCache[key].ts < ttlMs) {
    return Promise.resolve(widgetCache[key].data);
  }
  return fetcher().then(data => {
    widgetCache[key] = { data, ts: now };
    return data;
  });
}

// ─── Live Dynamic Widget Routes ───────────────────────────────────
app.get('/api/widgets/quote', requireAuth, async (req, res) => {
  try {
    const data = await getCached('quote', 3600000, () =>
    fetch('https://zenquotes.io/api/today').then(r => r.json())
    );
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/widgets/history', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const data = await getCached('history', 3600000, () =>
    fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`)
    .then(r => r.json())
    );
    const events = data.events.sort(() => 0.5 - Math.random()).slice(0, 3);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/widgets/weather', requireAuth, async (req, res) => {
  try {
    const data = await getCached('weather', 1800000, () =>
    fetch('https://api.open-meteo.com/v1/forecast?latitude=40.0948&longitude=-75.1224&daily=temperature_2m_max,precipitation_probability_max&temperature_unit=fahrenheit&forecast_days=3&timezone=America/New_York')
    .then(r => r.json())
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Live Sports Routes ───────────────────────────────────────────
app.get('/api/widgets/scores/:team', requireAuth, async (req, res) => {
  const configs = {
    dodgers: { sport: 'baseball',  league: 'mlb', abbr: 'LAD', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
    lakers:  { sport: 'basketball', league: 'nba', abbr: 'LAL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png' },
    kings:   { sport: 'hockey',     league: 'nhl', abbr: 'LA',  logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/la.png'  },
    niners:  { sport: 'football',   league: 'nfl', abbr: 'SF',  logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png'  },
  };
  const cfg = configs[req.params.team];
  if (!cfg) return res.status(404).json({ error: 'Unknown team' });
  try {
    const dateRanges = [];
    const now = new Date();
    for (let i = -3; i <= 2; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i * 7);
      dateRanges.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
    }
    const boards = await getCached(`scores_${req.params.team}`, 300000, async () => {
      const all = [];
      for (const dateStr of dateRanges) {
        try {
          const d = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard?dates=${dateStr}`
          ).then(r => r.json());
          if (d.events) all.push(...d.events);
        } catch (e) {}
      }
      return all;
    });
    const ourGames = boards.filter(e =>
    e.competitions?.[0]?.competitors?.some(c => c.team?.abbreviation === cfg.abbr)
    );
    const done = ourGames.filter(e => e.competitions?.[0]?.status?.type?.completed).slice(-3);
    const next = ourGames.filter(e => !e.competitions?.[0]?.status?.type?.completed).slice(0, 2);
    const pool = (done.length || next.length) ? [...done, ...next] : ourGames.slice(-5);
    const games = pool.map(e => {
      const comp = e.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      const hScore = home?.score !== undefined && home?.score !== null ? parseInt(home.score) : null;
      const aScore = away?.score !== undefined && away?.score !== null ? parseInt(away.score) : null;
      const ourSide = home?.team?.abbreviation === cfg.abbr ? home : away;
      return {
        date: e.date,
        shortName: e.shortName || (away?.team?.abbreviation + ' @ ' + home?.team?.abbreviation),
                           completed: comp.status.type.completed,
                           inProgress: comp.status.type.name === 'STATUS_IN_PROGRESS',
                           statusDetail: comp.status.type.shortDetail || comp.status.type.detail || 'Scheduled',
                           homeTeam: home?.team?.abbreviation,
                           awayTeam: away?.team?.abbreviation,
                           homeScore: hScore,
                           awayScore: aScore,
                           won: ourSide?.winner === true,
      };
    });
    res.json({ logo: cfg.logo, games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Live News Routes ─────────────────────────────────────────────
app.get('/api/widgets/news/:team', requireAuth, async (req, res) => {
  const configs = {
    dodgers: { sport: 'baseball',  league: 'mlb', abbr: 'lad' },
    lakers:  { sport: 'basketball', league: 'nba', abbr: 'lal' },
    kings:   { sport: 'hockey',     league: 'nhl', abbr: 'la'  },
    niners:  { sport: 'football',   league: 'nfl', abbr: 'sf'  },
  };
  const cfg = configs[req.params.team];
  if (!cfg) return res.status(404).json({ error: 'Unknown team' });
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/news?team=${cfg.abbr}&limit=5`;
    const data = await getCached(`news_${req.params.team}`, 1800000, () =>
    fetch(url).then(r => r.json())
    );
    const articles = (data.articles || []).map(a => ({
      title: a.headline,
      blurb: a.description || a.summary || '',
      url: a.links?.web?.href || '#',
      date: a.published,
      byline: a.byline || 'ESPN',
    }));
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── High-Level Dashboard Routes ──────────────────────────────────
app.get('/api/client/quick-info', requireAuth, (req, res) => {
  const quickInfo = {
    quote: '"The only way to do great work is to love what you do." — Steve Jobs',
    weather: '72°F, Clear',
    history: [
      'June 5, 2026: Mars rover discovers organic compounds in subsurface samples.',
    ],
  };
  res.json(quickInfo);
});

app.get('/api/client/goals', requireAuth, async (req, res) => {
  try {
    const goals = await db('goals').select('*');
    const milestones = await db('milestones').select('*');

    res.json({
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        category: g.category,
        progress: g.progress || 0,
        status: g.status,
      })),
      milestones,
      summary: {
        totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
      },
    });
  } catch (err) {
    console.error('Goals fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/client/sports', requireAuth, (req, res) => {
  const sportsData = [
    { team: 'LAD', record: '52-28', lastGame: 'W 4-2', nextGame: 'Jun 7, 7:10p', icon: '⚾' },
    { team: 'LAL', record: '45-37', lastGame: 'W 112-108', nextGame: 'Offseason', icon: '🏀' },
    { team: 'LAK', record: '39-32-11', lastGame: 'L 2-3', nextGame: 'Offseason', icon: '🏒' },
    { team: 'SF49ERS', record: '12-5', lastGame: 'W 32-19', nextGame: 'Sep 7, 2026', icon: '🏈' },
  ];
  res.json({ sports: sportsData });
});

app.get('/api/client/dashboard', requireAuth, async (req, res) => {
  try {
    const goals = await db('goals').select('*');
    const sportsData = [
      { team: 'LAD', record: '52-28', lastGame: 'W 4-2', nextGame: 'Jun 7, 7:10p', icon: '⚾' },
      { team: 'LAL', record: '45-37', lastGame: 'W 112-108', nextGame: 'Offseason', icon: '🏀' },
      { team: 'LAK', record: '39-32-11', lastGame: 'L 2-3', nextGame: 'Offseason', icon: '🏒' },
      { team: 'SF49ERS', record: '12-5', lastGame: 'W 32-19', nextGame: 'Sep 7, 2026', icon: '🏈' },
    ];

    res.json({
      quote: '"The only way to do great work is to love what you do." — Steve Jobs',
      weather: '72°F, Clear',
      history: ['June 5, 2026: Mars rover discovers organic compounds in subsurface samples.'],
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        progress: g.progress || 0,
        status: g.status,
      })),
      sports: sportsData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Database Initialization & Startup ─────────────────────────────
async function initDB() {
  const hasGoals = await db.schema.hasTable('goals');
  if (!hasGoals) {
    await db.schema.createTable('goals', t => {
      t.increments('id');
      t.string('name').notNullable();
      t.text('description');
      t.string('category');
      t.string('start_date');
      t.string('end_date');
      t.integer('progress').defaultTo(0);
      t.string('status').defaultTo('needs_attention');
      t.timestamps(true, true);
    });
  }
  const hasMilestones = await db.schema.hasTable('milestones');
  if (!hasMilestones) {
    await db.schema.createTable('milestones', t => {
      t.increments('id');
      t.integer('goal_id').references('id').inTable('goals').onDelete('CASCADE');
      t.text('name').notNullable();
      t.string('status').defaultTo('not_started');
      t.text('notes');
      t.timestamps(true, true);
    });
  }
  const hasData = await db('goals').count('id as cnt').first();
  if (parseInt(hasData.cnt) === 0) {
    const [g1] = await db('goals').insert({ name: 'Advanced Technical Perception & CD Application', category: '6. Personal Development', start_date: '03/12/2026', end_date: '12/31/2026', status: 'needs_attention', progress: 0, description: 'Deepen technical understanding of the ServiceNow platform following Citizen Developer Micro-certification.' }).returning('id');
    const [g2] = await db('goals').insert({ name: "Lincoln's Core Values & Leadership Attributes in Project Delivery", category: '7. Core Values & Leadership Attributes', start_date: '01/01/2026', end_date: '12/31/2026', status: 'needs_attention', progress: 0, description: 'Intentionally apply Lincoln core values and leadership attributes to improve project outcomes.' }).returning('id');
    const [g3] = await db('goals').insert({ name: 'Define Functional Data Requirements to Support Security and BCDR Visibility', category: '5. Service Excellence', start_date: '03/24/2026', end_date: '12/31/2026', status: 'needs_attention', progress: 0, description: 'Provide technical teams with clear functional requirements for Keyfactor and Nametag data integration.' }).returning('id');
    const [g4] = await db('goals').insert({ name: 'Improve Requirements & Story Readiness', category: '3. Invest in our Infrastructure', start_date: '03/24/2026', end_date: '12/31/2026', status: 'needs_attention', progress: 0, description: 'Advance demand planning maturity and improve analytics user story clarity to reduce blockers.' }).returning('id');
    const [g5] = await db('goals').insert({ name: 'Improve Alignment Across Product, Tech, and Business Partners via ServiceNow Governance', category: '1. Foundational Capital', start_date: '03/24/2026', end_date: '12/31/2026', status: 'needs_attention', progress: 0, description: 'Establish a formalized ServiceNow Product/Process ownership model and decentralize backlogs.' }).returning('id');

    const g1Id = g1.id || g1;
    const g2Id = g2.id || g2;
    const g3Id = g3.id || g3;
    const g4Id = g4.id || g4;
    const g5Id = g5.id || g5;

    await db('milestones').insert([
      { goal_id: g1Id, name: 'Attend at least one AI-related training to understand how and where it can benefit LFG', status: 'not_started' },
      { goal_id: g1Id, name: 'Collaborate with technical teams to review inner workings of complex integrations', status: 'not_started' },
      { goal_id: g2Id, name: "Demonstrate an Always Learning mindset by applying insights from AI training and Citizen Development", status: 'not_started' },
      { goal_id: g2Id, name: 'Ensure all analytics-related user stories meet clarity and completeness standards before development', status: 'not_started' },
      { goal_id: g2Id, name: 'Facilitate structured checkpoints with technical and business partners to reduce rework', status: 'not_started' },
      { goal_id: g3Id, name: 'Identify and submit data requirements for Keyfactor and Nametag for leadership analytics dashboards', status: 'not_started' },
      { goal_id: g3Id, name: 'Collaborate with technical team to confirm services are mapped to BCDR attributes', status: 'not_started' },
      { goal_id: g3Id, name: 'Provide SME support to address audit findings related to security and service mapping', status: 'not_started' },
      { goal_id: g4Id, name: 'Identify and implement at least two Shift Left opportunities to optimize resource allocation', status: 'not_started' },
      { goal_id: g4Id, name: 'Establish a structured demand planning cadence with monthly stakeholder transparency', status: 'not_started' },
      { goal_id: g4Id, name: 'Reduce development blockers by 10% through enhanced requirements gathering', status: 'not_started' },
      { goal_id: g5Id, name: 'Establish the Product/Process ownership model and decentralize product backlogs to individual owners', status: 'not_started' }
    ]);
  }
  console.log('DB initialized');
}

initDB().then(() => {
  app.listen(PORT, () => console.log('RedSquatch API running on port ' + PORT));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
