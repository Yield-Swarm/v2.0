/**
 * middleware/request-logger.js — Structured JSON request logging.
 * Owns: requestId injection, response-time tracking, payment/admin event logging.
 * Does NOT own: error logging (error-handler.js), rate limiting (rate-limiter.js).
 */

let _counter = 0;

/**
 * Generates a lightweight request ID: timestamp-hex + counter.
 * Not a UUID — just needs to be unique within a process lifetime.
 */
function makeRequestId() {
  _counter = (_counter + 1) % 1000000;
  return `${Date.now().toString(36)}-${_counter.toString(36)}`;
}

/**
 * Injects req.id and logs structured JSON on response finish.
 * Logs all payment-related paths and admin paths at INFO regardless of status.
 * Skips logging health checks to reduce noise.
 */
function requestLogger(req, res, next) {
  req.id = makeRequestId();
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const path = req.path || '/';

    // Suppress health check noise
    if (path === '/api/health' || path === '/health') return;

    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    const entry = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path,
      statusCode: res.statusCode,
      responseTimeMs: Math.round(durationMs),
      userId: req.user?.id || null,
    };

    // Flag payment events explicitly for easy filtering
    const isPayment = /\/(stripe|checkout|purchase|crypto|confirm)/i.test(path);
    const isAdmin = path.startsWith('/admin') || path.includes('/api/admin');

    if (isPayment) entry.eventType = 'payment';
    if (isAdmin) entry.eventType = 'admin';
    if (isAdmin && req.user?.id) entry.actorId = req.user.id;

    // Use warn for 4xx+, info otherwise
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    console[level === 'warn' ? 'warn' : 'log'](JSON.stringify({ level, ...entry }));
  });

  next();
}

module.exports = { requestLogger };
