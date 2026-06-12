/**
 * middleware/error-handler.js — Centralized Express error handling.
 * Owns: global error middleware, structured error responses, payment event logging.
 * Does NOT own: request logging (request-logger.js), rate limiting (rate-limiter.js).
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Maps error codes/types to HTTP status codes.
 */
function statusFromError(err) {
  if (err.status || err.statusCode) return err.status || err.statusCode;
  if (err.code === 'ECONNREFUSED') return 503;
  if (err.code === '23505') return 409; // Postgres unique violation
  if (err.code === '23503') return 409; // Postgres FK violation
  return 500;
}

/**
 * 404 handler — mount after all routes.
 */
function notFoundHandler(req, res, _next) {
  // Prevent CDN/proxy negative caching of error pages (fixes 502 stale cache during deploys)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    requestId: req.id || 'unknown',
  });
}

/**
 * Global error middleware — mount last, after notFoundHandler.
 * Emits structured error log server-side; never exposes stack traces in prod.
 */
function globalErrorHandler(err, req, res, _next) {
  const status = statusFromError(err);
  const requestId = req.id || 'unknown';

  // Structured server-side log (full details, stack in dev)
  const logEntry = {
    level: status >= 500 ? 'error' : 'warn',
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.path,
    statusCode: status,
    errorMessage: err.message,
    errorCode: err.code || null,
    userId: req.user?.id || null,
    stack: isProd ? undefined : err.stack,
  };
  console.error(JSON.stringify(logEntry));

  // Safe client response — no stack, no internal details in prod
  const body = {
    error: isProd && status >= 500 ? 'Internal server error' : err.message,
    code: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    requestId,
  };

  // Prevent CDN/proxy negative caching of error pages (fixes 502 stale cache during deploys)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.status(status).json(body);
}

module.exports = { notFoundHandler, globalErrorHandler };
