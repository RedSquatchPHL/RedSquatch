'use strict';

// Newegg has no public search API, so we pull the __initialState__ blob Newegg embeds
// in every search-results page (same data their own React frontend renders from) rather
// than parsing DOM markup, which is far more likely to shift between page redesigns.
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
  const marker = '__initialState__ = {';
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

async function searchNewegg(query) {
  const url = `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}`;
  const res = await fetch(url, fetchOpts());
  if (!res.ok) throw new Error(`Newegg search failed: HTTP ${res.status}`);

  const html = await res.text();
  const jsonStr = extractInitialState(html);
  if (!jsonStr) throw new Error('Newegg page structure changed (no __initialState__ found)');

  const data = JSON.parse(jsonStr);
  const products = data.Products ?? [];

  return products.map(p => {
    const cell = p.ItemCell ?? {};
    const imageName = cell.NewImage?.ImageName || cell.Image?.Normal?.ImageName || null;
    return {
      source: 'Newegg',
      title: cell.Description?.Title ?? cell.Description?.ProductName ?? 'Unknown item',
      price: typeof cell.FinalPrice === 'number' ? cell.FinalPrice : null,
      currency: 'USD',
      condition: null,
      url: `https://www.newegg.com/p/N82E168${(cell.Item ?? '').replace(/-/g, '')}`,
      image: imageName ? `https://c1.neweggimages.com/productimage/nb300/${imageName}` : null,
    };
  }).filter(item => item.price !== null);
}

module.exports = { searchNewegg };
