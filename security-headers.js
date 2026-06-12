/**
 * middleware/security-headers.js — Comprehensive HTTP security headers.
 * Owns: CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy,
 *       CORS whitelist, body size limits, bot detection, input sanitization helpers.
 * Does NOT own: rate limiting (rate-limiter.js), auth (account.js), request logging.
 */

const ALLOWED_ORIGINS = [
  'https://yieldswarm.polsia.app',
  'https://www.yieldswarm.polsia.app',
  'https://yieldswarm.polsia.app',
  'https://www.yieldswarm.polsia.app',
  'https://yieldswarm.xyz',
  'https://www.yieldswarm.xyz',
];

// Dynamically add APP_URL/SITE_URL if set (for custom domain support)
const _appUrl = process.env.APP_URL || process.env.SITE_URL;
if (_appUrl) {
  try {
    const _origin = new URL(_appUrl).origin;
    if (!ALLOWED_ORIGINS.includes(_origin)) ALLOWED_ORIGINS.push(_origin);
  } catch (_) {}
}

// In dev, also allow localhost
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

/**
 * Full security header suite — replaces helmet.
 * Strict CSP, HSTS (1yr + preload), deny framing, block MIME sniff,
 * strict referrer, permissions policy, CORP/COOP.
 */
function securityHeaders(req, res, next) {
  // HSTS — 1 year, include subdomains, preload
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Deny framing everywhere (clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');

  // Block MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict referrer — send origin only, no path
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser features we don't use
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=(self)',
    'usb=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', '));

  // Cross-Origin policies — use cross-origin CORP to allow social crawlers
  // (Twitterbot, facebookexternalhit) to fetch OG images and meta.json
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Content Security Policy — nonce + unsafe-inline/hashes for EJS inline scripts
  const nonce = generateNonce();
  res.locals.cspNonce = nonce;

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-hashes' https://web.squarecdn.com https://connect.squareup.com https://connect.facebook.net https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://connect.squareup.com https://zec.2miners.com https://api.kraken.com wss://yieldswarm.polsia.app wss://yieldswarm.xyz https://yieldswarm.polsia.app https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://connect.facebook.net https://www.facebook.com",
    "frame-src https://connect.squareup.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}

/**
 * CORS middleware — whitelist only. Rejects all other origins for API routes.
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

/**
 * Body size limiter for auth endpoints — 10KB max to prevent DoS via large payloads.
 * Apply to POST /account/login, /account/register, /api/invest.
 */
function bodyLimitAuth(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10240) { // 10KB
    return res.status(413).json({ error: 'Request body too large', code: 'BODY_TOO_LARGE' });
  }
  next();
}

/**
 * Bot detection for /shop and /invest — block obvious scraper signatures.
 * Not a full WAF, but catches curl, python-requests, headless patterns at no cost.
 */
function botDetection(req, res, next) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const blockedPatterns = [
    'python-requests', 'curl/', 'wget/', 'scrapy', 'java/', 'go-http-client',
    'libwww', 'axios/', 'node-fetch', 'got/',
  ];

  const isBot = blockedPatterns.some(p => ua.includes(p));

  // Allow legitimate APIs (Square/BTCPay webhooks, etc.) — skip for POST to webhooks
  if (isBot && !req.path.includes('webhook') && !req.path.includes('health')) {
    return res.status(403).json({ error: 'Automated access not permitted', code: 'BOT_DETECTED' });
  }

  next();
}

/**
 * Input sanitizer — strips XSS vectors from string values in req.body.
 * Applied to all POST/PUT/PATCH requests.
 * Does NOT validate business logic — use express-validator for that.
 */
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      // Block prototype pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      clean[k] = deepSanitize(v);
    }
    return clean;
  }
  return obj;
}

/**
 * Generate a cryptographically random nonce for CSP.
 * Uses crypto.randomBytes — NOT Math.random() which is a predictable PRNG.
 */
function generateNonce() {
  return require('crypto').randomBytes(16).toString('base64');
}

/**
 * Sanitize a value for safe use in SQL via parameterized queries.
 * This is defensive-only — all queries MUST still use parameterized statements.
 */
function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  return value.replace(/[<>"'`]/g, '').trim().slice(0, maxLength);
}

/**
 * Validate an email address format.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Validate a crypto wallet address (basic format check).
 */
function isValidWalletAddress(addr) {
  if (!addr || typeof addr !== 'string') return true; // optional field
  // ETH: 0x + 40 hex, SOL: base58 32-44 chars, ZEC: t1/t3/zs prefix
  return /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|t[13][a-zA-Z0-9]{33}|zs[a-z0-9]{76})$/.test(addr);
}

module.exports = {
  securityHeaders,
  corsMiddleware,
  bodyLimitAuth,
  botDetection,
  sanitizeBody,
  sanitizeString,
  isValidEmail,
  isValidWalletAddress,
  ALLOWED_ORIGINS,
};
