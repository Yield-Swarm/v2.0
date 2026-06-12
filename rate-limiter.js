/**
 * middleware/rate-limiter.js — In-memory sliding-window rate limiting.
 * Owns: IP-based rate limit buckets, per-endpoint limit configs, cleanup cron.
 * Does NOT own: auth (account.js), request logging (request-logger.js).
 *
 * Uses a sliding window (not fixed buckets) to prevent burst exploitation at
 * window boundaries. Memory-only — resets on restart, acceptable for single-process.
 */

const buckets = new Map(); // key: `${limitKey}:${ip}` → timestamps[]

/**
 * Prune expired timestamps from all buckets every 10 minutes.
 * Prevents unbounded memory growth under sustained traffic.
 */
setInterval(() => {
  const cutoff = Date.now() - 3600000; // keep max 1h worth
  for (const [key, times] of buckets) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, 600000).unref(); // don't block process exit

/**
 * Returns Express middleware that limits `max` requests per `windowMs` per IP.
 *
 * @param {object} opts
 * @param {string} opts.limitKey  — stable key for this limit (e.g. 'login')
 * @param {number} opts.max       — max requests allowed in window
 * @param {number} opts.windowMs  — window length in ms
 * @param {string} [opts.message] — human-readable message in 429 response
 */
function createLimiter({ limitKey, max, windowMs, message }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${limitKey}:${ip}`;
    const now = Date.now();

    const existing = buckets.get(bucketKey) || [];
    const windowHits = existing.filter(t => now - t < windowMs);

    if (windowHits.length >= max) {
      const oldest = windowHits[0];
      const retryAfterMs = windowMs - (now - oldest);
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000));
      return res.status(429).json({
        error: message || 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      });
    }

    windowHits.push(now);
    buckets.set(bucketKey, windowHits);
    next();
  };
}

// Pre-built limiters for each sensitive endpoint group
const limiters = {
  // /api/shop/purchase — 5/IP/hour
  purchase: createLimiter({ limitKey: 'purchase', max: 5, windowMs: 3600000, message: 'Purchase rate limit exceeded. Try again later.' }),

  // /account/login — 10/IP/hour
  login: createLimiter({ limitKey: 'login', max: 10, windowMs: 3600000, message: 'Too many login attempts. Try again later.' }),

  // /account/register — 3/IP/hour
  register: createLimiter({ limitKey: 'register', max: 3, windowMs: 3600000, message: 'Too many registration attempts. Try again later.' }),

  // /api/marketing/* — 20/IP/hour (admin endpoints)
  marketing: createLimiter({ limitKey: 'marketing', max: 20, windowMs: 3600000, message: 'Marketing API rate limit exceeded.' }),

  // General API — 100/IP/minute
  general: createLimiter({ limitKey: 'api', max: 100, windowMs: 60000, message: 'API rate limit exceeded. Slow down.' }),
};

module.exports = { createLimiter, limiters };
