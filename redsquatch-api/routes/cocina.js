'use strict';

// Cocina de Salsa: pantry tracker + salsa recipe book + shopping list.
// Follows the same { runMigrations(db), makeRouter(db) } shape as the other
// route modules (see fan-tracker.js / citizenship.js) — local `auth`
// middleware and a local `getClientId` helper, no shared cross-file utility.

const VALID_HEAT = ['mild', 'medium', 'hot'];
const VALID_STORAGE = ['fresh', 'dried', 'jarred', 'frozen'];

// ---- Recipe import (schema.org JSON-LD) ----

const HEAT_HOT_WORDS = ['hot', 'spicy', 'habanero', 'ghost pepper', 'scotch bonnet', 'fiery', 'scorpion'];
const HEAT_MILD_WORDS = ['mild', 'gentle', 'sweet'];

function parseIsoDurationMinutes(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.match(/^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const minutes = Number(match[1] || 0) * 60 + Number(match[2] || 0);
  return minutes > 0 ? minutes : null;
}

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return (
    h === 'localhost' || h === '0.0.0.0' || h === '::1' ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h) || /^169\.254\./.test(h)
  );
}

function extractJsonLdRecipes(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const recipes = [];
  for (const [, raw] of scripts) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    const items = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
    for (const item of items) {
      const types = Array.isArray(item?.['@type']) ? item['@type'] : [item?.['@type']];
      if (types.includes('Recipe')) recipes.push(item);
    }
  }
  return recipes;
}

function normalizeImage(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return normalizeImage(image[0]);
  if (typeof image === 'object' && image.url) return image.url;
  return null;
}

function flattenInstructions(instructions) {
  if (!instructions) return [];
  const list = Array.isArray(instructions) ? instructions : [instructions];
  const steps = [];
  for (const entry of list) {
    if (typeof entry === 'string') steps.push(entry);
    else if (entry?.['@type'] === 'HowToSection' && Array.isArray(entry.itemListElement)) steps.push(...flattenInstructions(entry.itemListElement));
    else if (entry?.text) steps.push(entry.text);
  }
  return steps.map(s => String(s).trim()).filter(Boolean);
}

function guessHeatLevel(text) {
  const lower = text.toLowerCase();
  if (HEAT_HOT_WORDS.some(w => lower.includes(w))) return 'hot';
  if (HEAT_MILD_WORDS.some(w => lower.includes(w))) return 'mild';
  return 'medium';
}

function draftFromJsonLdRecipe(recipe) {
  const title = recipe.name ? String(recipe.name).trim() : 'Imported recipe';
  const description = recipe.description ? String(recipe.description).trim() : null;
  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
    .map(line => String(line).trim())
    .filter(Boolean)
    .map(name => ({ name, quantity: null }));
  const steps = flattenInstructions(recipe.recipeInstructions).map(instruction => ({ instruction, minutes: null }));

  const prepMinutes = parseIsoDurationMinutes(recipe.totalTime) ?? (() => {
    const sum = (parseIsoDurationMinutes(recipe.prepTime) || 0) + (parseIsoDurationMinutes(recipe.cookTime) || 0);
    return sum > 0 ? sum : null;
  })();

  const keywordsRaw = [recipe.recipeCategory, recipe.keywords].filter(Boolean).join(', ');
  const tags = keywordsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 8);

  return {
    title,
    description,
    heat_level: guessHeatLevel(`${title} ${description || ''} ${keywordsRaw}`),
    prep_minutes: prepMinutes,
    tags,
    image_url: normalizeImage(recipe.image),
    ingredients,
    steps,
  };
}

// ---- Recipe import fallback: no JSON-LD Recipe (e.g. sites whose theme
// renders recipes as plain semantic HTML with no schema.org markup at all,
// like rickbayless.com). Scrapes common patterns instead: og: meta tags for
// title/image/description, and any container whose class or itemprop names
// "ingredient"/"instruction" for the ingredient and step lists.

const HTML_ENTITY_MAP = {
  amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', apos: "'",
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  hellip: '…', mdash: '—', ndash: '–',
};

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|nbsp|apos|rsquo|lsquo|rdquo|ldquo|hellip|mdash|ndash);/g, (_, name) => HTML_ENTITY_MAP[name] || '');
}

function stripTags(fragment) {
  return decodeHtmlEntities(fragment.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Manually depth-counts <div>/</div> from just after an opening tag to find
// its true matching close — a plain non-greedy regex can't do this correctly
// once the container has nested divs, which recipe markup always does.
function findMatchingDivEnd(html, openTagEndIndex) {
  let depth = 1;
  const re = /<div\b[^>]*>|<\/div\s*>/gi;
  re.lastIndex = openTagEndIndex;
  let match;
  while ((match = re.exec(html))) {
    if (match[0].startsWith('</')) depth--;
    else depth++;
    if (depth === 0) return match.index;
  }
  return html.length;
}

function extractDivContainer(html, markerRegex) {
  const m = markerRegex.exec(html);
  if (!m) return null;
  const openTagEnd = m.index + m[0].length;
  return html.slice(openTagEnd, findMatchingDivEnd(html, openTagEnd));
}

function extractListItems(containerHtml, minLength = 1) {
  return [...containerHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(m => stripTags(m[1]))
    .filter(t => t.length >= minLength);
}

function extractParagraphSteps(containerHtml) {
  // Strip embeds first so an iframe-only paragraph (e.g. an embedded video)
  // doesn't become an empty "step".
  const cleaned = containerHtml.replace(/<iframe[\s\S]*?<\/iframe>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const paras = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => stripTags(m[1]));
  const items = paras.length > 0 ? paras : extractListItems(cleaned);
  return items.filter(t => t.length >= 8);
}

function scrapeGenericRecipe(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (h1 && stripTags(h1[1])) || (ogTitle && decodeHtmlEntities(ogTitle[1])) || (titleTag && stripTags(titleTag[1])) || 'Imported recipe';

  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const image_url = ogImage ? ogImage[1] : null;

  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const descContainer = extractDivContainer(html, /<div[^>]*class=["'][^"']*\bdescription\b[^"']*["'][^>]*>/i);
  const description = (metaDesc && decodeHtmlEntities(metaDesc[1])) || (descContainer && stripTags(descContainer).slice(0, 600)) || null;

  const ingredientsContainer = extractDivContainer(
    html,
    /<div[^>]*(?:class=["'][^"']*ingredient[^"']*["']|itemprop=["'](?:ingredients|recipeIngredient)["'])[^>]*>/i
  );
  const ingredients = ingredientsContainer ? extractListItems(ingredientsContainer).map(name => ({ name, quantity: null })) : [];

  const instructionsContainer = extractDivContainer(
    html,
    /<div[^>]*(?:class=["'][^"']*(?:instruction|direction)[^"']*["']|itemprop=["']recipeInstructions["'])[^>]*>/i
  );
  const steps = instructionsContainer ? extractParagraphSteps(instructionsContainer).map(instruction => ({ instruction, minutes: null })) : [];

  const metaKeywords = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  const tags = metaKeywords ? decodeHtmlEntities(metaKeywords[1]).split(',').map(t => t.trim()).filter(Boolean).slice(0, 8) : [];

  return {
    title,
    description,
    heat_level: guessHeatLevel(`${title} ${description || ''} ${tags.join(' ')}`),
    prep_minutes: null,
    tags,
    image_url,
    ingredients,
    steps,
  };
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cocina_pantry_items (
    id                SERIAL PRIMARY KEY,
    client_id         INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    category          VARCHAR(100),
    quantity          VARCHAR(50),
    unit              VARCHAR(50),
    storage_condition VARCHAR(20) NOT NULL DEFAULT 'fresh',
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_pantry_items_client_id ON cocina_pantry_items(client_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsas (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    heat_level    VARCHAR(10) NOT NULL DEFAULT 'medium',
    prep_minutes  INTEGER,
    rating        INTEGER,
    tags          JSONB NOT NULL DEFAULT '[]',
    image_url     TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsas_client_id ON cocina_salsas(client_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsa_ingredients (
    id          SERIAL PRIMARY KEY,
    salsa_id    INTEGER NOT NULL REFERENCES cocina_salsas(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    VARCHAR(100),
    sort_order  INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsa_ingredients_salsa_id ON cocina_salsa_ingredients(salsa_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_salsa_steps (
    id            SERIAL PRIMARY KEY,
    salsa_id      INTEGER NOT NULL REFERENCES cocina_salsas(id) ON DELETE CASCADE,
    step_number   INTEGER NOT NULL,
    instruction   TEXT NOT NULL,
    minutes       INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_salsa_steps_salsa_id ON cocina_salsa_steps(salsa_id)`,

  `CREATE TABLE IF NOT EXISTS cocina_shopping_items (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    VARCHAR(100),
    checked     BOOLEAN NOT NULL DEFAULT FALSE,
    source      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cocina_shopping_items_client_id ON cocina_shopping_items(client_id)`,
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

// Case-insensitive, trimmed name match — good enough at personal-pantry scale
// (a few dozen rows), so this stays plain JS instead of a fuzzy-match SQL join.
function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

async function attachPantryMatch(db, clientId, salsas) {
  if (salsas.length === 0) return [];

  const salsaIds = salsas.map(s => s.id);
  const [ingredientsResult, pantryResult] = await Promise.all([
    db.query(
      `SELECT id, salsa_id, name, quantity, sort_order FROM cocina_salsa_ingredients
       WHERE salsa_id = ANY($1::int[]) ORDER BY salsa_id, sort_order, id`,
      [salsaIds]
    ),
    db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
  ]);

  const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
  const ingredientsBySalsa = new Map();
  for (const ing of ingredientsResult.rows) {
    if (!ingredientsBySalsa.has(ing.salsa_id)) ingredientsBySalsa.set(ing.salsa_id, []);
    ingredientsBySalsa.get(ing.salsa_id).push(ing);
  }

  return salsas.map(salsa => {
    const ingredients = ingredientsBySalsa.get(salsa.id) || [];
    const total = ingredients.length;
    const inPantry = ingredients.filter(ing => pantryNames.has(normalizeName(ing.name))).length;
    return {
      ...salsa,
      ingredient_count: total,
      pantry_match_pct: total === 0 ? 0 : Math.round((inPantry / total) * 100),
      missing_count: total - inPantry,
    };
  });
}

async function replaceIngredientsAndSteps(client, salsaId, ingredients, steps) {
  await client.query(`DELETE FROM cocina_salsa_ingredients WHERE salsa_id = $1`, [salsaId]);
  await client.query(`DELETE FROM cocina_salsa_steps WHERE salsa_id = $1`, [salsaId]);

  const ingredientRows = Array.isArray(ingredients) ? ingredients : [];
  for (let i = 0; i < ingredientRows.length; i++) {
    const ing = ingredientRows[i];
    if (!ing?.name || !String(ing.name).trim()) continue;
    await client.query(
      `INSERT INTO cocina_salsa_ingredients (salsa_id, name, quantity, sort_order) VALUES ($1, $2, $3, $4)`,
      [salsaId, String(ing.name).trim(), ing.quantity || null, i]
    );
  }

  const stepRows = Array.isArray(steps) ? steps : [];
  for (let i = 0; i < stepRows.length; i++) {
    const step = stepRows[i];
    if (!step?.instruction || !String(step.instruction).trim()) continue;
    await client.query(
      `INSERT INTO cocina_salsa_steps (salsa_id, step_number, instruction, minutes) VALUES ($1, $2, $3, $4)`,
      [salsaId, i + 1, String(step.instruction).trim(), step.minutes ?? null]
    );
  }
}

function makeRouter(db) {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ---- Pantry ----

  router.get('/pantry', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM cocina_pantry_items WHERE client_id = $1 ORDER BY created_at DESC, id DESC`,
        [clientId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Cocina pantry fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch pantry' });
    }
  });

  router.post('/pantry', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, category, quantity, unit, storage_condition } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      const storage = VALID_STORAGE.includes(storage_condition) ? storage_condition : 'fresh';

      const result = await db.query(
        `INSERT INTO cocina_pantry_items (client_id, name, category, quantity, unit, storage_condition)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [clientId, String(name).trim(), category || null, quantity || null, unit || null, storage]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Cocina pantry create error:', err.message);
      res.status(500).json({ error: 'Failed to add pantry item' });
    }
  });

  router.put('/pantry/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, category, quantity, unit, storage_condition } = req.body || {};
      const storage = storage_condition !== undefined
        ? (VALID_STORAGE.includes(storage_condition) ? storage_condition : 'fresh')
        : undefined;

      const result = await db.query(
        `UPDATE cocina_pantry_items SET
           name = COALESCE($1, name),
           category = COALESCE($2, category),
           quantity = COALESCE($3, quantity),
           unit = COALESCE($4, unit),
           storage_condition = COALESCE($5, storage_condition),
           updated_at = NOW()
         WHERE id = $6 AND client_id = $7 RETURNING *`,
        [name ?? null, category ?? null, quantity ?? null, unit ?? null, storage ?? null, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pantry item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina pantry update error:', err.message);
      res.status(500).json({ error: 'Failed to update pantry item' });
    }
  });

  router.delete('/pantry/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_pantry_items WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pantry item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina pantry delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete pantry item' });
    }
  });

  // ---- Salsas ----

  // POST /salsas/import — body: { url }. Fetches the page server-side (browser
  // CORS would block this client-side) and pulls schema.org Recipe JSON-LD,
  // which nearly every recipe site publishes. Returns a draft in the same
  // shape POST /salsas accepts, for the frontend to prefill and let the user
  // review/edit before saving — nothing is written to the DB here.
  router.post('/salsas/import', auth, async (req, res) => {
    const rawUrl = req.body?.url;
    if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).json({ error: 'url is required' });

    let target;
    try {
      target = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'That doesn\'t look like a valid URL' });
    }
    if (!['http:', 'https:'].includes(target.protocol) || isPrivateHost(target.hostname)) {
      return res.status(400).json({ error: 'That URL is not allowed' });
    }

    try {
      const response = await fetch(target.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CocinaRecipeImporter/1.0)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return res.status(422).json({ error: `Could not fetch that page (HTTP ${response.status})` });
      if (isPrivateHost(new URL(response.url).hostname)) {
        return res.status(400).json({ error: 'That URL is not allowed' });
      }

      const html = await response.text();
      const recipes = extractJsonLdRecipes(html);
      if (recipes.length > 0) return res.json(draftFromJsonLdRecipe(recipes[0]));

      // No schema.org Recipe JSON-LD — fall back to scraping common semantic
      // HTML patterns (og: meta tags, ingredient/instruction containers).
      const fallback = scrapeGenericRecipe(html);
      if (fallback.ingredients.length === 0 && fallback.steps.length === 0) {
        return res.status(422).json({ error: 'No recipe data found on that page' });
      }
      res.json(fallback);
    } catch (err) {
      console.error('Cocina recipe import error:', err.message);
      res.status(502).json({ error: 'Failed to import that recipe' });
    }
  });

  router.get('/salsas', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { heat, maxMinutes } = req.query;

      const conditions = ['client_id = $1'];
      const params = [clientId];
      if (heat && VALID_HEAT.includes(heat)) {
        params.push(heat);
        conditions.push(`heat_level = $${params.length}`);
      }
      if (maxMinutes && !Number.isNaN(Number(maxMinutes))) {
        params.push(Number(maxMinutes));
        conditions.push(`prep_minutes IS NOT NULL AND prep_minutes <= $${params.length}`);
      }

      const result = await db.query(
        `SELECT * FROM cocina_salsas WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC, id DESC`,
        params
      );
      const salsas = await attachPantryMatch(db, clientId, result.rows);
      res.json({ salsas });
    } catch (err) {
      console.error('Cocina salsas fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch salsas' });
    }
  });

  router.get('/salsas/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const salsaResult = await db.query(
        `SELECT * FROM cocina_salsas WHERE id = $1 AND client_id = $2`,
        [req.params.id, clientId]
      );
      if (salsaResult.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });

      const [ingredientsResult, stepsResult, pantryResult] = await Promise.all([
        db.query(
          `SELECT * FROM cocina_salsa_ingredients WHERE salsa_id = $1 ORDER BY sort_order, id`,
          [req.params.id]
        ),
        db.query(
          `SELECT * FROM cocina_salsa_steps WHERE salsa_id = $1 ORDER BY step_number, id`,
          [req.params.id]
        ),
        db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
      ]);

      const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
      const ingredients = ingredientsResult.rows.map(ing => ({
        ...ing,
        in_pantry: pantryNames.has(normalizeName(ing.name)),
      }));

      res.json({ ...salsaResult.rows[0], ingredients, steps: stepsResult.rows });
    } catch (err) {
      console.error('Cocina salsa detail fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch salsa' });
    }
  });

  router.post('/salsas', auth, async (req, res) => {
    const { title, description, heat_level, prep_minutes, tags, ingredients, steps } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    const heat = VALID_HEAT.includes(heat_level) ? heat_level : 'medium';

    const client = await db.connect();
    try {
      const clientId = await getClientId(db, req);
      await client.query('BEGIN');
      const salsaResult = await client.query(
        `INSERT INTO cocina_salsas (client_id, title, description, heat_level, prep_minutes, tags, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          clientId,
          String(title).trim(),
          description || null,
          heat,
          prep_minutes ?? null,
          JSON.stringify(Array.isArray(tags) ? tags : []),
          req.body?.image_url || null,
        ]
      );
      const salsa = salsaResult.rows[0];
      await replaceIngredientsAndSteps(client, salsa.id, ingredients, steps);
      await client.query('COMMIT');
      res.status(201).json(salsa);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Cocina salsa create error:', err.message);
      res.status(500).json({ error: 'Failed to create salsa' });
    } finally {
      client.release();
    }
  });

  router.put('/salsas/:id', auth, async (req, res) => {
    const { title, description, heat_level, prep_minutes, tags, ingredients, steps } = req.body || {};
    const heat = VALID_HEAT.includes(heat_level) ? heat_level : undefined;

    const client = await db.connect();
    try {
      const clientId = await getClientId(db, req);
      await client.query('BEGIN');
      const salsaResult = await client.query(
        `UPDATE cocina_salsas SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           heat_level = COALESCE($3, heat_level),
           prep_minutes = COALESCE($4, prep_minutes),
           tags = COALESCE($5, tags),
           image_url = COALESCE($6, image_url),
           updated_at = NOW()
         WHERE id = $7 AND client_id = $8 RETURNING *`,
        [
          title ? String(title).trim() : null,
          description ?? null,
          heat ?? null,
          prep_minutes ?? null,
          tags ? JSON.stringify(tags) : null,
          req.body?.image_url ?? null,
          req.params.id,
          clientId,
        ]
      );
      if (salsaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Salsa not found' });
      }
      const salsa = salsaResult.rows[0];
      if (ingredients !== undefined || steps !== undefined) {
        await replaceIngredientsAndSteps(client, salsa.id, ingredients, steps);
      }
      await client.query('COMMIT');
      res.json(salsa);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Cocina salsa update error:', err.message);
      res.status(500).json({ error: 'Failed to update salsa' });
    } finally {
      client.release();
    }
  });

  router.delete('/salsas/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_salsas WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina salsa delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete salsa' });
    }
  });

  router.put('/salsas/:id/rating', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'rating must be an integer 1-5' });
      }
      const result = await db.query(
        `UPDATE cocina_salsas SET rating = $1, updated_at = NOW() WHERE id = $2 AND client_id = $3 RETURNING *`,
        [rating, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina salsa rating error:', err.message);
      res.status(500).json({ error: 'Failed to rate salsa' });
    }
  });

  // ---- Shopping list ----

  router.get('/shopping', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `SELECT * FROM cocina_shopping_items WHERE client_id = $1 ORDER BY checked, created_at, id`,
        [clientId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      console.error('Cocina shopping fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
  });

  router.post('/shopping', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, quantity, source } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      const result = await db.query(
        `INSERT INTO cocina_shopping_items (client_id, name, quantity, source) VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, String(name).trim(), quantity || null, source || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Cocina shopping create error:', err.message);
      res.status(500).json({ error: 'Failed to add shopping item' });
    }
  });

  // POST /shopping/from-salsa/:salsaId — bulk-adds the salsa's ingredients that
  // aren't currently in the pantry, tagging each with the salsa title as `source`.
  router.post('/shopping/from-salsa/:salsaId', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const salsaResult = await db.query(
        `SELECT title FROM cocina_salsas WHERE id = $1 AND client_id = $2`,
        [req.params.salsaId, clientId]
      );
      if (salsaResult.rows.length === 0) return res.status(404).json({ error: 'Salsa not found' });
      const salsaTitle = salsaResult.rows[0].title;

      const [ingredientsResult, pantryResult] = await Promise.all([
        db.query(
          `SELECT name, quantity FROM cocina_salsa_ingredients WHERE salsa_id = $1 ORDER BY sort_order, id`,
          [req.params.salsaId]
        ),
        db.query(`SELECT name FROM cocina_pantry_items WHERE client_id = $1`, [clientId]),
      ]);
      const pantryNames = new Set(pantryResult.rows.map(r => normalizeName(r.name)));
      const missing = ingredientsResult.rows.filter(ing => !pantryNames.has(normalizeName(ing.name)));

      const added = [];
      for (const ing of missing) {
        const result = await db.query(
          `INSERT INTO cocina_shopping_items (client_id, name, quantity, source) VALUES ($1, $2, $3, $4) RETURNING *`,
          [clientId, ing.name, ing.quantity || null, salsaTitle]
        );
        added.push(result.rows[0]);
      }
      res.status(201).json({ added });
    } catch (err) {
      console.error('Cocina shopping from-salsa error:', err.message);
      res.status(500).json({ error: 'Failed to add missing ingredients' });
    }
  });

  router.put('/shopping/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const { name, quantity, checked } = req.body || {};
      const result = await db.query(
        `UPDATE cocina_shopping_items SET
           name = COALESCE($1, name),
           quantity = COALESCE($2, quantity),
           checked = COALESCE($3, checked)
         WHERE id = $4 AND client_id = $5 RETURNING *`,
        [name ?? null, quantity ?? null, typeof checked === 'boolean' ? checked : null, req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Cocina shopping update error:', err.message);
      res.status(500).json({ error: 'Failed to update shopping item' });
    }
  });

  router.delete('/shopping/:id', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE id = $1 AND client_id = $2 RETURNING id`,
        [req.params.id, clientId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping item not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Cocina shopping delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete shopping item' });
    }
  });

  // "Finalize shopping trip" — checked items were bought, so they clear; anything
  // left unchecked stays on the list for next time.
  router.post('/shopping/finalize', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE client_id = $1 AND checked = TRUE RETURNING id`,
        [clientId]
      );
      res.json({ removed: result.rowCount });
    } catch (err) {
      console.error('Cocina shopping finalize error:', err.message);
      res.status(500).json({ error: 'Failed to finalize shopping trip' });
    }
  });

  router.post('/shopping/clear', auth, async (req, res) => {
    try {
      const clientId = await getClientId(db, req);
      const result = await db.query(
        `DELETE FROM cocina_shopping_items WHERE client_id = $1 RETURNING id`,
        [clientId]
      );
      res.json({ removed: result.rowCount });
    } catch (err) {
      console.error('Cocina shopping clear error:', err.message);
      res.status(500).json({ error: 'Failed to clear shopping list' });
    }
  });

  return router;
}

module.exports = { runMigrations, makeRouter };
