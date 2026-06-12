// sentry.server.config.js — Sentry server-side initialization for Express/Node.js
// Owns: global error capture, request tracing, performance monitoring
// Does NOT own: client-side browser errors (see sentry.client.config.js)
// Graceful fallback when @sentry/node is unavailable (e.g., npm blocked in sandbox)

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  console.log('[Sentry] @sentry/node not available — using mock fallback. ' +
    'Install it via: npm install @sentry/node');
  // Mock Sentry object so server.js references don't crash
  Sentry = {
    captureException: (err, extra) => {
      console.error('[sentry-mock] Unhandled exception:', err.message);
      if (process.env.SENTRY_DSN) {
        // Fallback: send to internal error capture endpoint
        const http = require('http');
        const payload = JSON.stringify({
          type: 'exception',
          error: { message: err.message, stack: err.stack },
          extra: extra || {},
          timestamp: new Date().toISOString(),
          platform: 'express'
        });
        try {
          const url = new URL(process.env.SENTRY_DSN);
          const req = http.request({
            hostname: url.hostname,
            path: '/api/' + (process.env.SENTRY_PROJECT_ID || 'store'),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, () => {});
          req.on('error', () => {});
          req.write(payload);
          req.end();
        } catch (_) {}
      }
      return null;
    },
    requestHandler: () => (req, _res, next) => next(),
    errorHandler: () => (err, _req, res, next) => next(err),
    init: () => {},
  };
}

if (process.env.SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      stackParser: Sentry.defaultStackParser || undefined,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      release: process.env.RENDER_GIT_COMMIT || process.env.HEROKU_SLUG_COMMIT || undefined,
      normalizeDepth: 5,
      includeLocalVariables: process.env.NODE_ENV !== 'production',
      ignoreErrors: [/ResizeObserver loop/, /Non-Error promise rejection/],
      initialScope: {
        tags: { app: 'yieldswarm', platform: 'express' },
      },
    });
    console.log('[Sentry] Server-side monitoring initialized (DSN: ' +
      process.env.SENTRY_DSN.split('@')[0] + '@sentry.io)');
  } catch (e) {
    console.log('[Sentry] init failed:', e.message, '— continuing without server-side Sentry');
  }
} else {
  console.log('[Sentry] SENTRY_DSN not set — server-side error tracking disabled');
}

module.exports = Sentry;