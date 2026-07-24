'use strict';

// Flipp aggregates weekly circulars/flyers from local grocery & retail chains, keyed by
// zip code — backflipp.wishabi.com is the plain JSON endpoint their own web frontend
// calls, so no HTML parsing is needed. Unlike the other sources here, results are
// current sale/circular prices tied to a specific store and date range, not a
// standing "buy it now" price.
const DEFAULT_POSTAL_CODE = '19046';

function parsePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function searchFlipp(query, postalCode) {
  const zip = (postalCode ?? '').trim() || DEFAULT_POSTAL_CODE;
  const url = `https://backflipp.wishabi.com/flipp/items/search?locale=en-us&postal_code=${encodeURIComponent(zip)}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Flipp search failed: HTTP ${res.status}`);

  const data = await res.json();
  const searchFallbackUrl = `https://flipp.com/en-us/search?q=${encodeURIComponent(query)}&postal_code=${encodeURIComponent(zip)}`;

  const fromFlyer = (data.items ?? []).map(it => ({
    source: it.merchant_name ? `Flipp · ${it.merchant_name}` : 'Flipp',
    title: it.name ?? 'Unknown item',
    price: parsePrice(it.current_price),
    currency: 'USD',
    condition: it.valid_to ? `sale thru ${it.valid_to.slice(0, 10)}` : null,
    url: it.flyer_id ? `https://flipp.com/en-us/flyers/${it.flyer_id}` : searchFallbackUrl,
    image: it.clean_image_url ?? null,
  }));

  const fromEcom = (data.ecom_items ?? []).map(it => ({
    source: it.merchant ? `Flipp · ${it.merchant}` : 'Flipp',
    title: it.name ?? 'Unknown item',
    price: parsePrice(it.current_price),
    currency: 'USD',
    condition: null,
    url: searchFallbackUrl,
    image: it.image_url ?? null,
  }));

  return [...fromFlyer, ...fromEcom].filter(item => item.price !== null);
}

module.exports = { searchFlipp, DEFAULT_POSTAL_CODE };
