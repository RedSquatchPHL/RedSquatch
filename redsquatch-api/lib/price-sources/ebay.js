'use strict';

// eBay Browse API via OAuth2 client-credentials. Requires EBAY_CLIENT_ID / EBAY_CLIENT_SECRET
// (production keys from a free developer.ebay.com app) — without them this source is skipped.
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('EBAY_CLIENT_ID/EBAY_CLIENT_SECRET not configured');

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`eBay token request failed: HTTP ${res.status}`);

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function searchEbay(query) {
  const token = await getAccessToken();
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=20`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`eBay search failed: HTTP ${res.status}`);

  const data = await res.json();
  return (data.itemSummaries ?? []).map(item => ({
    source: 'eBay',
    title: item.title,
    price: item.price?.value != null ? Number(item.price.value) : null,
    currency: item.price?.currency ?? 'USD',
    condition: item.condition ?? null,
    url: item.itemWebUrl,
    image: item.image?.imageUrl ?? null,
  })).filter(item => item.price !== null);
}

module.exports = { searchEbay };
