'use strict';

// AbortSignal.timeout() starts its countdown the instant it's created, so it must be
// built fresh per request — a shared signal here would fire once at module load and
// then abort every request instantly forever after.
function fetchOpts() {
  return {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  };
}

function extractInitialState(html) {
  const marker = 'window.__INITIAL_STATE__ = {';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const jsonStart = start + marker.length - 1; // include the opening brace
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return html.slice(jsonStart, i + 1);
    }
  }
  return null;
}

function parsePrice(str) {
  if (!str) return null;
  const n = Number(String(str).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Zappos and 6pm are sister sites (same parent, same frontend) and both embed a
// window.__INITIAL_STATE__ Redux dump with the full result list server-side, so one
// scraper covers both — just parameterized by domain and display name.
function makeSearchFn(domain, sourceName) {
  return async function search(query) {
    const url = `https://www.${domain}/search?term=${encodeURIComponent(query)}`;
    const res = await fetch(url, fetchOpts());
    if (!res.ok) throw new Error(`${sourceName} search failed: HTTP ${res.status}`);

    const html = await res.text();
    const jsonStr = extractInitialState(html);
    if (!jsonStr) throw new Error(`${sourceName} page structure changed (no __INITIAL_STATE__ found)`);

    const data = JSON.parse(jsonStr);
    const list = data.products?.list ?? [];

    return list.map(p => ({
      source: sourceName,
      title: p.brandName ? `${p.brandName} ${p.productName}` : (p.productName ?? 'Unknown item'),
      price: parsePrice(p.price),
      currency: 'USD',
      condition: null,
      url: `https://www.${domain}/product/${p.productId}/color/${p.colorId}`,
      image: p.msaImageId ? `https://m.media-amazon.com/images/I/${p.msaImageId}._AC_SX342_.jpg` : null,
    })).filter(item => item.price !== null);
  };
}

module.exports = { makeSearchFn };
