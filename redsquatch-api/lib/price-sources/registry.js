'use strict';

const { searchEbay } = require('./ebay');
const { searchNewegg } = require('./newegg');
const { searchZappos } = require('./zappos');
const { searchSixpm } = require('./sixpm');
const { searchFlipp } = require('./flipp');

// eBay works for any item, so it's in every category. Category-specific sources
// were picked by actually test-fetching each candidate retailer from this box —
// Amazon/Micro Center/Costco/Adorama/Best Buy 403 or 503 on server requests, and
// DSW/Famous Footwear/Foot Locker/Shoe Carnival/TigerDirect render their results
// client-side (no product data in the raw HTML) or are simply defunct — so this
// list reflects what's actually scrapable today, not the full wishlist.
//
// Every source's run() takes (query, ctx) — ctx currently only carries `zip`, which
// only Flipp uses (its results are inherently store/location-specific); the rest
// just ignore it.
const SOURCES = {
  ebay:   { name: 'eBay',   run: (q) => searchEbay(q) },
  newegg: { name: 'Newegg', run: (q) => searchNewegg(q) },
  zappos: { name: 'Zappos', run: (q) => searchZappos(q) },
  sixpm:  { name: '6pm',    run: (q) => searchSixpm(q) },
  flipp:  { name: 'Flipp (local circulars)', run: (q, ctx) => searchFlipp(q, ctx?.zip) },
};

const CATEGORIES = {
  general:     { label: 'General',     sourceIds: ['ebay'] },
  electronics: { label: 'Electronics', sourceIds: ['ebay', 'newegg'] },
  shoes:       { label: 'Shoes',       sourceIds: ['ebay', 'zappos', 'sixpm'] },
  grocery:     { label: 'Grocery',     sourceIds: ['flipp'], needsZip: true },
};

module.exports = { SOURCES, CATEGORIES };
