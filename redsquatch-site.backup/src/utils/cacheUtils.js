/**
 * Cache utilities with TTL (Time-to-Live) support
 * Stores data in localStorage with expiration timestamps
 */

const CACHE_KEYS = {
  QUICK_INFO: 'rs_quick_info',
  SPORTS_DATA: 'rs_sports_data',
  QUOTE: 'rs_quote',
  WEATHER: 'rs_weather',
  HISTORY: 'rs_history',
};

const TTL = {
  QUICK_INFO: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  SPORTS: 8 * 60 * 60 * 1000,     // 8 hours
};

/**
 * Set a cached value with expiration timestamp
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time-to-live in milliseconds
 */
export const setCacheWithTTL = (key, value, ttl) => {
  const now = Date.now();
  const expiration = now + ttl;
  
  const cacheData = {
    value,
    expiration,
    createdAt: now,
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (err) {
    console.error(`Failed to cache ${key}:`, err);
  }
};

/**
 * Get a cached value if it hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if expired/not found
 */
export const getCacheWithTTL = (key) => {
  try {
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired
    if (now > cacheData.expiration) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheData.value;
  } catch (err) {
    console.error(`Failed to retrieve cache ${key}:`, err);
    return null;
  }
};

/**
 * Clear a specific cache entry
 * @param {string} key - Cache key
 */
export const clearCache = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Failed to clear cache ${key}:`, err);
  }
};

/**
 * Clear all RedSquatch caches
 */
export const clearAllCaches = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    clearCache(key);
  });
};

/**
 * Get time remaining until cache expires (in seconds)
 * @param {string} key - Cache key
 * @returns {number} Seconds remaining, or -1 if expired/not found
 */
export const getCacheTimeRemaining = (key) => {
  try {
    const cached = localStorage.getItem(key);
    
    if (!cached) return -1;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    const timeRemaining = (cacheData.expiration - now) / 1000;
    
    return timeRemaining > 0 ? Math.round(timeRemaining) : -1;
  } catch (err) {
    console.error(`Failed to check cache time ${key}:`, err);
    return -1;
  }
};

export { CACHE_KEYS, TTL };
