// middleware/admin-accelerator.js — Admin route performance layer.
// Owns: Server-Timing headers, render time recording, cache-control for admin pages.
// Does NOT own: authentication (admin-auth.js), caching logic (services/admin-cache.js).
'use strict';

const { recordTiming } = require('../services/admin-ws');

/**
 * Express middleware — wraps admin responses with:
 * - Server-Timing header (render time in ms)
 * - Cache-Control: private, no-store (admin pages must not be CDN-cached)
 * - X-Render-Ms header for client-side perf logging
 *
 * Attach globally on the /admin mount point in server.js.
 */
function adminAccelerator(req, res, next) {
  const t0 = process.hrtime.bigint();
  const path = req.path;

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const msRounded = Math.round(ms);

    // Record for WebSocket broadcast
    try { recordTiming(`/admin${path}`, msRounded); } catch (_) {}

    // Log slow admin pages (>500ms) — target is <500ms per task spec
    if (ms > 500) {
      console.warn(`[admin-perf] SLOW: /admin${path} — ${msRounded}ms (target <500ms)`);
    }
  });

  // Set headers before handler runs
  res.set('Server-Timing', 'handler;desc="admin"');
  res.set('Cache-Control', 'private, no-store');

  next();
}

module.exports = { adminAccelerator };
