'use strict';

const fs   = require('fs');
const path = require('path');

const OUT_FILE = path.join(__dirname, 'public', 'sports.json');

const TEAMS = [
  { key: 'LAD', sport: 'baseball',   league: 'mlb', espnId: '19', name: 'Los Angeles Dodgers',    fallbackColor: 'b87333' },
  { key: 'LAL', sport: 'basketball', league: 'nba', espnId: '13', name: 'Los Angeles Lakers',     fallbackColor: '552583' },
  { key: 'LAK', sport: 'hockey',     league: 'nhl', espnId: '8',  name: 'Los Angeles Kings',      fallbackColor: '111111' },
  { key: 'SF',  sport: 'football',   league: 'nfl', espnId: '25', name: 'San Francisco 49ers',    fallbackColor: 'aa0000' },
];

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const FETCH_OPTS = {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RedSquatch/1.0)' },
  signal: AbortSignal.timeout(12000),
};

async function fetchJSON(url) {
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function scoreDisplay(competitor) {
  const s = competitor?.score;
  if (!s) return null;
  return typeof s === 'object' ? (s.displayValue ?? String(s.value)) : String(s);
}

function parseSchedule(events, espnId, now) {
  const completed = [];
  const upcoming  = [];

  for (const e of events) {
    const comp = e.competitions?.[0];
    if (!comp) continue;
    const done = comp.status?.type?.completed === true;
    const gameDate = new Date(e.date);

    const competitors = comp.competitors ?? [];
    const us   = competitors.find(c => c.id === espnId);
    const them = competitors.find(c => c.id !== espnId);

    if (!us || !them) continue;

    const ourScore   = scoreDisplay(us);
    const theirScore = scoreDisplay(them);

    const base = {
      date:         e.date.slice(0, 10),
      dateTime:     e.date,
      opponent:     them.team?.displayName ?? 'Unknown',
      opponentAbbr: them.team?.abbreviation ?? '?',
      isHome:       us.homeAway === 'home',
    };

    if (done) {
      completed.push({
        ...base,
        score:  ourScore && theirScore ? `${ourScore}-${theirScore}` : null,
        result: us.winner === true ? 'W' : us.winner === false ? 'L' : '?',
      });
    } else if (gameDate > now) {
      // Format time in ET
      const timeStr = new Date(e.date).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
      }) + ' ET';
      upcoming.push({ ...base, time: timeStr });
    }
  }

  // Return last 5 completed (most recent first) and next 7 upcoming
  return {
    recentGames:   completed.slice(-5).reverse(),
    upcomingGames: upcoming.slice(0, 7),
    lastGame:      completed.length ? completed[completed.length - 1] : null,
    nextGame:      upcoming.length  ? upcoming[0] : null,
  };
}

async function scrapeTeam(team, now) {
  const scheduleUrl = `${ESPN_BASE}/${team.sport}/${team.league}/teams/${team.espnId}/schedule`;
  const teamUrl     = `${ESPN_BASE}/${team.sport}/${team.league}/teams/${team.espnId}`;
  const newsUrl     = `${ESPN_BASE}/${team.sport}/${team.league}/news?team=${team.espnId}&limit=5`;

  const [schedData, teamData, newsData] = await Promise.all([
    fetchJSON(scheduleUrl),
    fetchJSON(teamUrl),
    fetchJSON(newsUrl).catch(() => ({ articles: [] })),
  ]);

  const teamInfo = teamData.team ?? {};
  const schedTeam = schedData.team ?? {};

  const logo   = teamInfo.logo   || schedTeam.logo   || `https://a.espncdn.com/i/teamlogos/${team.league}/500/${team.key.toLowerCase()}.png`;
  const color  = teamInfo.color  || schedTeam.color  || team.fallbackColor;
  const record = schedTeam.recordSummary || teamInfo.recordSummary || null;

  const { recentGames, upcomingGames, lastGame, nextGame } =
    parseSchedule(schedData.events ?? [], team.espnId, now);

  const news = (newsData.articles ?? []).slice(0, 5).map(a => ({
    title: a.headline || a.title || 'No title',
    url:   a.links?.web?.href || a.links?.mobile?.href || '#',
    date:  a.published ? a.published.slice(0, 10) : null,
  }));

  return {
    key:          team.key,
    name:         team.name,
    abbreviation: team.key,
    sport:        team.league.toUpperCase(),
    logo,
    color:        color ? `#${color.replace('#', '')}` : null,
    record,
    lastGame,
    nextGame,
    recentGames,
    upcomingGames,
    news,
  };
}

async function scrapeAll() {
  const now = new Date();
  console.log(`[sports-scraper] Running at ${now.toISOString()}`);

  const results = await Promise.allSettled(TEAMS.map(t => scrapeTeam(t, now)));

  const teams = {};
  for (let i = 0; i < TEAMS.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      teams[TEAMS[i].key] = r.value;
      console.log(`  ✓ ${TEAMS[i].key} scraped`);
    } else {
      console.error(`  ✗ ${TEAMS[i].key} failed: ${r.reason?.message}`);
      // Keep existing data for this team if available
      teams[TEAMS[i].key] = { key: TEAMS[i].key, name: TEAMS[i].name, sport: TEAMS[i].league.toUpperCase(), error: r.reason?.message };
    }
  }

  // Merge with existing file so a single team failure doesn't wipe others
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch { /* first run */ }

  const output = {
    updated: now.toISOString(),
    teams: Object.fromEntries(
      TEAMS.map(t => [t.key, teams[t.key]?.error ? (existing.teams?.[t.key] ?? teams[t.key]) : teams[t.key]])
    ),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`[sports-scraper] Written to ${OUT_FILE}`);
  return output;
}

module.exports = { scrapeAll };

// Run standalone: node sports-scraper.js
if (require.main === module) {
  scrapeAll()
    .then(data => {
      const teams = Object.values(data.teams);
      console.log(`\nSummary (${data.updated}):`);
      for (const t of teams) {
        console.log(`  ${t.key}: record=${t.record ?? 'N/A'} lastGame=${t.lastGame?.date ?? 'N/A'} nextGame=${t.nextGame?.date ?? 'N/A'} news=${t.news?.length ?? 0}`);
      }
    })
    .catch(err => { console.error('Fatal:', err); process.exit(1); });
}
