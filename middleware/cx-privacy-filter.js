/**
 * middleware/cx-privacy-filter.js — SwarmLayer CX privacy + auth layer.
 * Owns: HMAC signature validation, PII stripping, customer ID hashing,
 *       amount bucketing, per-key rate limiting, filter audit logging.
 * Does NOT own: query routing (services/cx-router.js), response generation.
 *
 * AEGIS requirement: ALL PII must be stripped before any CX processing.
 * Nothing reversible crosses the boundary — only SHA-256 hashes and bucketed ranges.
 */
'use strict';

const crypto = require('crypto');
const { validateApiKey } = require('../db/cx');

// ── PII Pattern Registry ──────────────────────────────────────────────────────

const PII_PATTERNS = [
  {
    type: 'email',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    // ETH: 0x + 40 hex
    type: 'wallet_eth',
    regex: /\b0x[a-fA-F0-9]{40}\b/g,
    replacement: '[WALLET_ETH_REDACTED]',
  },
  {
    // ZEC transparent (t1/t3) + shielded (zs/zu)
    type: 'wallet_zec',
    regex: /\b(?:t[13][a-zA-Z0-9]{33}|z[su][a-z0-9]{75,})\b/g,
    replacement: '[WALLET_ZEC_REDACTED]',
  },
  {
    // SOL: base58 32–44 chars
    type: 'wallet_sol',
    regex: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    replacement: '[WALLET_SOL_REDACTED]',
  },
  {
    // BTC: 1/3/bc1 prefix
    type: 'wallet_btc',
    regex: /\b(?:1[a-zA-HJ-NP-Z0-9]{24,33}|3[a-zA-HJ-NP-Z0-9]{24,33}|bc1[a-z0-9]{6,87})\b/g,
    replacement: '[WALLET_BTC_REDACTED]',
  },
  {
    // Phone numbers — various formats
    type: 'phone',
    regex: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    // IPv4 addresses
    type: 'ip',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    replacement: '[IP_REDACTED]',
  },
];

/**
 * Strip all PII from a text string.
 * Returns { cleaned, actions[] } where actions describe what was stripped.
 */
function stripPii(text, fieldName) {
  if (typeof text !== 'string') return { cleaned: text, actions: [] };
  let cleaned = text;
  const actions = [];

  for (const { type, regex, replacement } of PII_PATTERNS) {
    const matches = cleaned.match(new RegExp(regex.source, 'g'));
    if (matches && matches.length > 0) {
      cleaned = cleaned.replace(new RegExp(regex.source, 'g'), replacement);
      actions.push({ fieldName, stripType: type, itemsFound: matches.length });
    }
  }

  return { cleaned, actions };
}

/**
 * Bucket a dollar amount into a range string — no raw amounts cross the boundary.
 * Returns e.g. "$1K-$5K" or "< $100" or "> $100K"
 */
function bucketAmount(amount) {
  const n = parseFloat(amount);
  if (isNaN(n)) return 'unknown';
  if (n < 100) return '< $100';
  if (n < 500) return '$100-$500';
  if (n < 1000) return '$500-$1K';
  if (n < 5000) return '$1K-$5K';
  if (n < 10000) return '$5K-$10K';
  if (n < 25000) return '$10K-$25K';
  if (n < 50000) return '$25K-$50K';
  if (n < 100000) return '$50K-$100K';
  return '> $100K';
}

/**
 * Deep-clean a context_metadata object.
 * Strips known PII fields and recurses into nested objects.
 */
function sanitizeContextMetadata(obj, actions, prefix = '') {
  if (!obj || typeof obj !== 'object') return obj;

  const BLOCKED_KEYS = ['email', 'phone', 'ip', 'ip_address', 'wallet', 'wallet_address',
    'balance', 'account_balance', 'raw_amount'];
  const AMOUNT_KEYS = ['investment_amount', 'amount', 'total', 'committed'];

  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${k}` : k;

    // Block keys that are always PII
    if (BLOCKED_KEYS.some(bk => k.toLowerCase().includes(bk))) {
      actions.push({ fieldName: fieldPath, stripType: 'pii_field', itemsFound: 1 });
      continue; // drop entirely
    }

    // Bucket amount fields
    if (AMOUNT_KEYS.some(ak => k.toLowerCase().includes(ak))) {
      clean[k] = bucketAmount(v);
      actions.push({ fieldName: fieldPath, stripType: 'amount', itemsFound: 1 });
      continue;
    }

    if (typeof v === 'string') {
      const { cleaned, actions: piiActions } = stripPii(v, fieldPath);
      clean[k] = cleaned;
      actions.push(...piiActions);
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = sanitizeContextMetadata(v, actions, fieldPath);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ── Per-Key Rate Limiter (in-memory sliding window) ───────────────────────────
// 100 req/min per key, 1000/hour hard cap

const keyBuckets = new Map(); // keyId:window → timestamps[]

setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [k, ts] of keyBuckets) {
    const fresh = ts.filter(t => t > cutoff);
    if (!fresh.length) keyBuckets.delete(k);
    else keyBuckets.set(k, fresh);
  }
}, 300000).unref();

function checkKeyRateLimit(keyId) {
  const now = Date.now();
  const minKey = `${keyId}:min`;
  const hrKey = `${keyId}:hr`;

  const minTs = (keyBuckets.get(minKey) || []).filter(t => now - t < 60000);
  const hrTs = (keyBuckets.get(hrKey) || []).filter(t => now - t < 3600000);

  if (minTs.length >= 100) return { allowed: false, reason: 'rate_limit_minute' };
  if (hrTs.length >= 1000) return { allowed: false, reason: 'rate_limit_hour' };

  minTs.push(now); hrTs.push(now);
  keyBuckets.set(minKey, minTs);
  keyBuckets.set(hrKey, hrTs);
  return { allowed: true };
}

// ── HMAC Signature Validation ─────────────────────────────────────────────────
// SwarmLayer signs requests: HMAC-SHA256(method + path + timestamp + bodyHash, secret)
// Secret is the CX_HMAC_SECRET env var (shared with SwarmLayer).

function validateHmacSignature(req) {
  const secret = process.env.CX_HMAC_SECRET;
  if (!secret) return true; // not configured → skip (log warning on startup)

  const signature = req.headers['x-cx-signature'];
  const timestamp = req.headers['x-cx-timestamp'];
  if (!signature || !timestamp) return false;

  // Reject requests older than 5 minutes (replay protection)
  if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 300000) return false;

  const bodyHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${req.method}${req.path}${timestamp}${bodyHash}`)
    .digest('hex');

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── Customer ID Hashing ───────────────────────────────────────────────────────

function hashCustomerId(rawId) {
  if (!rawId) return crypto.randomBytes(16).toString('hex');
  return crypto.createHash('sha256').update(String(rawId)).digest('hex');
}

// ── Express Middleware ────────────────────────────────────────────────────────

/**
 * cxAuth — validates API key + HMAC signature, attaches req.cxApiKey.
 * Must run before cxPrivacyFilter.
 */
async function cxAuth(req, res, next) {
  // Accept key as Bearer token or X-CX-API-Key header
  const rawKey =
    req.headers['x-cx-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  if (!rawKey) {
    return res.status(401).json({ error: 'Missing CX API key', code: 'AUTH_REQUIRED' });
  }

  const keyRecord = await validateApiKey(rawKey).catch(() => null);
  if (!keyRecord) {
    return res.status(403).json({ error: 'Invalid or inactive CX API key', code: 'AUTH_INVALID' });
  }

  if (!validateHmacSignature(req)) {
    return res.status(403).json({ error: 'Invalid request signature', code: 'SIGNATURE_INVALID' });
  }

  const rateLimitResult = checkKeyRateLimit(keyRecord.id);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'CX API rate limit exceeded', code: rateLimitResult.reason });
  }

  req.cxApiKey = keyRecord;
  next();
}

/**
 * cxPrivacyFilter — strips all PII from the request body before handlers see it.
 * Attaches req.cxFiltered with cleaned fields + req.cxPrivacyActions for audit logging.
 * Must run after cxAuth so we have req.cxApiKey.
 */
function cxPrivacyFilter(req, _res, next) {
  const { customer_id, query_text, query_type, context_metadata } = req.body || {};
  const allActions = [];

  // Hash customer_id — never store raw
  const customerHash = hashCustomerId(customer_id);
  if (customer_id) {
    allActions.push({ fieldName: 'customer_id', stripType: 'hash', itemsFound: 1 });
  }

  // Strip PII from query_text
  const { cleaned: cleanedText, actions: textActions } = stripPii(query_text || '', 'query_text');
  allActions.push(...textActions);

  // Clean context_metadata
  const cleanedMeta = sanitizeContextMetadata(context_metadata || {}, allActions);

  req.cxFiltered = {
    customerHash,
    queryType: query_type || 'unknown',
    queryText: cleanedText,
    contextMetadata: cleanedMeta,
  };
  req.cxPrivacyActions = allActions;

  next();
}

/**
 * cxCorsLock — CORS restricted to SwarmLayer's domain only.
 * Applied only to /api/cx/* routes.
 */
function cxCorsLock(req, res, next) {
  const swarmOrigin = process.env.SWARM_LAYER_ORIGIN || 'https://swarm.swarm-layer.com';
  const origin = req.headers.origin;

  if (origin) {
    if (origin === swarmOrigin ||
        (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CX-API-Key, X-CX-Signature, X-CX-Timestamp');
      res.setHeader('Vary', 'Origin');
    } else {
      // Reject — no CORS headers emitted for unlisted origins
    }
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

module.exports = { cxAuth, cxPrivacyFilter, cxCorsLock, stripPii, hashCustomerId, bucketAmount };
