'use strict';

const { SOURCES, CATEGORIES } = require('../lib/price-sources/registry');

function makeRouter() {
  const router = require('express').Router();

  function auth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  router.get('/categories', auth, (req, res) => {
    const categories = Object.entries(CATEGORIES).map(([id, cat]) => ({
      id,
      label: cat.label,
      needsZip: !!cat.needsZip,
      sources: cat.sourceIds.map(sid => ({ id: sid, name: SOURCES[sid].name })),
    }));
    res.json({ categories });
  });

  router.get('/search', auth, async (req, res) => {
    const q = (req.query.q ?? '').toString().trim();
    if (!q) return res.status(400).json({ error: 'q is required' });

    const categoryId = CATEGORIES[req.query.category] ? req.query.category : 'general';
    const allowedIds = CATEGORIES[categoryId].sourceIds;

    const requested = typeof req.query.sources === 'string'
      ? req.query.sources.split(',').filter(Boolean)
      : null;
    // Always intersect with the category's allow-list, so a manipulated `sources`
    // param can only narrow the search, never reach a source outside this category.
    const activeIds = (requested ?? allowedIds).filter(id => allowedIds.includes(id));

    if (activeIds.length === 0) {
      return res.json({ query: q, category: categoryId, results: [], errors: [] });
    }

    const ctx = { zip: (req.query.zip ?? '').toString().trim() || undefined };
    const settled = await Promise.allSettled(activeIds.map(id => SOURCES[id].run(q, ctx)));

    const results = [];
    const errors = [];
    settled.forEach((r, i) => {
      const id = activeIds[i];
      if (r.status === 'fulfilled') {
        results.push(...r.value);
      } else {
        console.error(`Price search (${SOURCES[id].name}) failed:`, r.reason?.message);
        errors.push({ source: SOURCES[id].name, message: r.reason?.message ?? 'Unknown error' });
      }
    });

    results.sort((a, b) => a.price - b.price);

    res.json({ query: q, category: categoryId, results, errors });
  });

  return router;
}

module.exports = { makeRouter };
