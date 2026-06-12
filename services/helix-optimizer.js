// services/helix-optimizer.js — Helix cache middleware
// In-memory LRU cache with TTL for API responses

const cache = new Map();
const MAX_SIZE = 1000;
const DEFAULT_TTL = 60000; // 1 minute

function helixCacheMiddleware(req, res, next) {
  // Skip cache for non-GET or authenticated requests
  if (req.method !== 'GET' || req.headers.authorization) {
    return next();
  }

  const key = `${req.method}:${req.originalUrl}`;
  const entry = cache.get(key);

  if (entry && entry.expires > Date.now()) {
    res.setHeader('X-Helix-Cache', 'HIT');
    return res.json(entry.data);
  }

  // Override res.json to capture and cache the response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, { data, expires: Date.now() + DEFAULT_TTL });
      // Evict oldest if over max
      if (cache.size > MAX_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }
    res.setHeader('X-Helix-Cache', 'MISS');
    return originalJson(data);
  };

  next();
}

function clearCache() {
  cache.clear();
}

module.exports = { helixCacheMiddleware, clearCache };
