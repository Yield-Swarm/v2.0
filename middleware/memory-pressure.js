/**
 * middleware/memory-pressure.js — Returns 503 on non-critical routes when heap is dangerously high.
 * Owns: request shedding to prevent OOM crash during memory spikes.
 * Does NOT own: memory guard (lib/memory-guard.js), boot phases (services/boot-manager.js).
 *
 * WHY 280MB: V8 heap is capped at 250MB. When heap hits 280MB, GC runs aggressively.
 * Serving complex pages (EJS + DB) at that level pushes heap toward the 300MB ceiling,
 * which can cause V8 to stall mid-GC and push RSS past 350MB. Returning 503 when
 * heap > 280MB prevents requests from contributing to the spike.
 * Prevents the final push past 512MB that triggers Render's OOM kill.
 * Critical paths (health checks, static assets) always pass through.
 */
'use strict';

// Cached heap reading — updated at most every 2 seconds to avoid memoryUsage() overhead
let _cachedHeapMB = 0;
let _lastCheck = 0;

function getHeapMB() {
  const now = Date.now();
  if (now - _lastCheck > 2000) {
    _cachedHeapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    _lastCheck = now;
  }
  return _cachedHeapMB;
}

// Paths that ALWAYS pass through — health checks, static files, critical APIs
const ALWAYS_ALLOW = ['/health', '/api/health', '/api/deploy-status', '/status'];

function memoryPressureMiddleware(req, res, next) {
  // Always allow critical paths
  if (ALWAYS_ALLOW.some(p => req.path.startsWith(p))) return next();
  // Always allow static file requests (served by express.static before this middleware)
  if (req.path.match(/\.(css|js|png|jpg|ico|woff2?|svg|json|xml|txt)$/i)) return next();

  const heapMB = getHeapMB();
  // 280MB: V8 heap cap is 250MB. At 280MB heap, GC is imminent. Serving complex
  // pages (EJS render + DB queries) at this level risks pushing past the cap.
  // Return 503 to let upstream retry after GC completes (usually 50-150ms).
  if (heapMB > 280) {
    res.setHeader('Retry-After', '30');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'Service temporarily unavailable — memory pressure',
      heapMB,
      retryAfterSeconds: 30,
    });
  }

  next();
}

module.exports = { memoryPressureMiddleware };
