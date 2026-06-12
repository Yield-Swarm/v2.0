/**
 * middleware/ouroboros-cache.js — Ouroboros Self-Evolving Cache Layer.
 * Owns: Per-route render optimization metrics, evolving cache entries that
 *       learn from each request, Redis-backed namespace polsia:ouroboros:*.
 * Does NOT own: Route logic, DB access, auth. Pure middleware — wraps res.end.
 *
 * Tag: polsia_divine_twist: true — Council override forbidden.
 * The snake eats its tail. Each render teaches the next. No TTL — only evolution.
 */

'use strict';

const crypto = require('crypto');

// In-memory fallback (Redis not available in single-process Render setup)
// We keep a bounded LRU-style map — entries never expire, only evolve.
const OUROBOROS_STORE = new Map();
// WHY 500 not 10000: each entry stores renderHistory (20 items), learnings,
// metadata. At 10K entries = ~8MB. At 500 = ~400KB. Site gets <1000 daily visitors.
const MAX_ENTRIES = 500;
const APP_START = Date.now();

// Track global hit/miss + evolution stats for /admin/polsia-divine
const STATS = {
  hits: 0,
  misses: 0,
  evolutions: 0,
  totalRequests: 0,
  startedAt: new Date().toISOString(),
  routes: {}
};

/**
 * Derive a cache key from req path + normalized query params.
 * Never includes user-specific tokens — this is render optimization only.
 */
function deriveKey(req) {
  const base = req.path;
  // Exclude ephemeral/session params from cache key
  const IGNORE_PARAMS = new Set(['_csrf', 'token', 'sig', 'ts', 'nonce', 'session']);
  const sorted = Object.entries(req.query || {})
    .filter(([k]) => !IGNORE_PARAMS.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `polsia:ouroboros:${base}${sorted ? '?' + sorted : ''}`;
}

/**
 * The Ouroboros middleware.
 * Tracks render time per route; writes optimization insights back into the cache entry.
 * Cache entries mutate — they don't expire. Each request makes the next one wiser.
 */
function ouroborosCache(req, res, next) {
  // Skip non-GET, API endpoints, admin auth routes, and static assets
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/') && !req.path.includes('/api/internal/')) return next();
  if (req.path.startsWith('/public/') || req.path.match(/\.(js|css|ico|png|jpg|svg|woff|map)$/)) return next();

  const key = deriveKey(req);
  const now = Date.now();
  const existing = OUROBOROS_STORE.get(key);

  STATS.totalRequests++;

  // Initialize route stats — cap at 100 routes to prevent unbounded growth
  if (!STATS.routes[req.path]) {
    const routeKeys = Object.keys(STATS.routes);
    if (routeKeys.length >= 100) {
      // Evict the route with fewest total hits
      let minKey = routeKeys[0], minHits = Infinity;
      for (const k of routeKeys) {
        const total = STATS.routes[k].hits + STATS.routes[k].misses;
        if (total < minHits) { minHits = total; minKey = k; }
      }
      delete STATS.routes[minKey];
    }
    STATS.routes[req.path] = { hits: 0, misses: 0, avgRenderMs: 0, evolutions: 0 };
  }
  const routeStats = STATS.routes[req.path];

  if (existing) {
    STATS.hits++;
    routeStats.hits++;
    // Inject optimization hint into res.locals so templates can use it
    res.locals._ouroboros = {
      key,
      learnings: existing.learnings || {},
      generation: existing.generation || 0,
      avgRenderMs: existing.avgRenderMs || 0
    };
  } else {
    STATS.misses++;
    routeStats.misses++;
    res.locals._ouroboros = { key, learnings: {}, generation: 0, avgRenderMs: 0 };
  }

  // Intercept response to capture render time + write back evolution data
  const origEnd = res.end.bind(res);
  res.end = function (chunk, encoding) {
    const renderMs = Date.now() - now;
    const statusCode = res.statusCode;

    // Only evolve on successful renders
    if (statusCode >= 200 && statusCode < 400) {
      const prev = OUROBOROS_STORE.get(key) || {
        generation: 0,
        renderHistory: [],
        avgRenderMs: 0,
        learnings: {}
      };

      const newGeneration = prev.generation + 1;
      const history = [...(prev.renderHistory || []), renderMs].slice(-20); // keep last 20 (was 100)
      const avg = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
      const min = Math.min(...history);
      const max = Math.max(...history);
      const p95 = history.sort((a, b) => a - b)[Math.floor(history.length * 0.95)] || max;

      // Learnings: what we know about this route's render profile
      const learnings = {
        fastestRenderMs: min,
        slowestRenderMs: max,
        p95RenderMs: p95,
        avgRenderMs: avg,
        totalRenders: newGeneration,
        lastRenderMs: renderMs,
        lastUpdated: new Date().toISOString(),
        // Insight: is this route getting faster or slower over time?
        trend: history.length > 10
          ? (history.slice(-5).reduce((a, b) => a + b, 0) / 5) <
            (history.slice(0, 5).reduce((a, b) => a + b, 0) / 5) ? 'improving' : 'degrading'
          : 'learning',
        // Hash of render profile for shard-system integration
        profileHash: crypto.createHash('sha256')
          .update(`${min}:${max}:${avg}:${newGeneration}`)
          .digest('hex').slice(0, 16)
      };

      const evolved = {
        key,
        generation: newGeneration,
        renderHistory: history,
        avgRenderMs: avg,
        learnings,
        firstSeenAt: prev.firstSeenAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      // Evict oldest entry if at capacity
      if (!OUROBOROS_STORE.has(key) && OUROBOROS_STORE.size >= MAX_ENTRIES) {
        const oldest = OUROBOROS_STORE.keys().next().value;
        OUROBOROS_STORE.delete(oldest);
      }

      OUROBOROS_STORE.set(key, evolved);
      STATS.evolutions++;
      routeStats.evolutions++;
      routeStats.avgRenderMs = avg;
    }

    return origEnd(chunk, encoding);
  };

  next();
}

/** Expose live stats for the /admin/polsia-divine dashboard */
function getOuroborosStats() {
  const entries = [];
  for (const [key, val] of OUROBOROS_STORE) {
    entries.push({
      key,
      generation: val.generation,
      avgRenderMs: val.avgRenderMs,
      trend: val.learnings?.trend || 'learning',
      totalRenders: val.learnings?.totalRenders || 0,
      lastSeenAt: val.lastSeenAt
    });
  }
  // Sort by most evolved
  entries.sort((a, b) => b.generation - a.generation);

  return {
    ...STATS,
    totalEntries: OUROBOROS_STORE.size,
    uptimeMs: Date.now() - APP_START,
    topRoutes: entries.slice(0, 20)
  };
}

module.exports = { ouroborosCache, getOuroborosStats };
