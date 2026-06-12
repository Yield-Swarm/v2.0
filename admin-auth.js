/**
 * middleware/admin-auth.js — Admin route authentication.
 * Owns: requireAdmin middleware (ADMIN_SECRET env var), JWT-like session tokens for admin,
 *       adminLoginRouter (GET/POST /admin/login — dedicated login page).
 * Does NOT own: investor auth (investors.js), user sessions (account.js), rate limiting.
 *
 * ADMIN_SECRET unset = hard deny (not open access). Zero-configuration secure default.
 * Admin session stored in httpOnly cookie 'ys_admin_token' — 24hr TTL. Updated 2026-05-19.
 *
 * ADMIN_ACCESS_TOKEN: secret token bypass for /admin?token=<TOKEN> — off-record access.
 * Token access is logged to audit_logs for security audit trail. Falls through silently
 * if token is wrong/missing (no indication the route accepts tokens).
 *
 * LOGIN FLOW: unauthenticated /admin/* → 302 → /admin/login → POST → cookie → /admin
 */

const crypto = require('crypto');
const express = require('express');
const { pool } = require('../db/index');

const ADMIN_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_STORE = new Map(); // token → { expiresAt, ip }

// Prune expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of SESSION_STORE) {
    if (session.expiresAt < now) SESSION_STORE.delete(token);
  }
}, 30 * 60 * 1000).unref();

/**
 * Generate a signed admin session token.
 */
function createAdminSession(ip) {
  const token = crypto.randomBytes(32).toString('hex');
  SESSION_STORE.set(token, { expiresAt: Date.now() + ADMIN_TOKEN_TTL, ip });
  return token;
}

/**
 * Parse admin token from cookie or Authorization header.
 */
function getAdminToken(req) {
  // Cookie-based (preferred for browser sessions)
  const raw = req.headers.cookie || '';
  const match = raw.match(/(?:^|;\s*)ys_admin_token=([a-f0-9]{64})/);
  if (match) return match[1];

  // Bearer token (for programmatic API access)
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();

  return null;
}

/**
 * Express middleware — denies all requests without valid admin session.
 * ADMIN_SECRET unset → hard deny (fail closed, not fail open).
 */
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;

  // Fail closed — no secret set means admin is not configured. Hard deny ALL /admin/*
  // to prevent any accidental exposure. Set ADMIN_SECRET to enable admin access.
  if (!secret) {
    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      const returnPath = encodeURIComponent(req.originalUrl.split('?')[0]);
      return res.redirect(302, `/admin/login?return=${returnPath}`);
    }
    return res.status(401).json({
      error: 'Admin access not configured. Set ADMIN_SECRET to enable.',
      code: 'ADMIN_NOT_CONFIGURED',
    });
  }

  // Secret token bypass — /admin?token=<ADMIN_ACCESS_TOKEN>
  // Falls through silently if token is wrong/missing (no indication the route exists)
  const bypassToken = req.query.token;
  if (bypassToken) {
    const accessToken = process.env.ADMIN_ACCESS_TOKEN;
    if (accessToken && safeEquals(bypassToken, accessToken)) {
      const ip = getIp(req);
      const sessionToken = createAdminSession(ip);

      // Log token-based access for security audit (fire-and-forget)
      logTokenAccess(req.path, ip).catch(() => {});

      res.cookie('ys_admin_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_TOKEN_TTL,
      });

      // Strip token and redirect explicitly to /admin
      const cleanParams = Object.fromEntries(
        Object.entries(req.query).filter(([k]) => k !== 'token')
      );
      const qs = Object.keys(cleanParams).length
        ? '?' + new URLSearchParams(cleanParams).toString()
        : '';
      return res.redirect('/admin' + qs);
    }
    // Token wrong/missing — fall through silently to normal auth (no hint)
  }

  // Check query param auth (initial login, GET-safe)
  const querySecret = req.query.secret;
  if (querySecret) {
    // Constant-time compare to prevent timing attacks
    if (safeEquals(querySecret, secret)) {
      const token = createAdminSession(getIp(req));
      res.cookie('ys_admin_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: ADMIN_TOKEN_TTL,
      });
      // Strip secret and redirect explicitly to /admin
      const cleanParams = Object.fromEntries(
        Object.entries(req.query).filter(([k]) => k !== 'secret')
      );
      const qs = Object.keys(cleanParams).length
        ? '?' + new URLSearchParams(cleanParams).toString()
        : '';
      return res.redirect('/admin' + qs);
    }
    return res.status(401).json({ error: 'Invalid admin secret', code: 'UNAUTHORIZED' });
  }

  // Check POST body secret (for login forms)
  if (req.method === 'POST' && req.body && req.body.admin_secret) {
    if (safeEquals(req.body.admin_secret, secret)) {
      const token = createAdminSession(getIp(req));
      res.cookie('ys_admin_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: ADMIN_TOKEN_TTL,
      });
      return res.redirect('/admin');
    }
    return res.status(401).json({ error: 'Invalid admin secret', code: 'UNAUTHORIZED' });
  }

  // Validate session token
  const token = getAdminToken(req);
  if (token) {
    const session = SESSION_STORE.get(token);
    if (session && session.expiresAt > Date.now()) {
      req.adminSession = { token, ip: session.ip };
      return next();
    }
  }

  // No valid auth — redirect browser to /admin/login, 401 for API/JSON requests
  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    const returnPath = encodeURIComponent(req.originalUrl.split('?')[0]);
    return res.redirect(302, `/admin/login?return=${returnPath}`);
  }
  return res.status(401).json({ error: 'Admin authentication required', code: 'UNAUTHORIZED' });
}

/**
 * Constant-time string comparison — prevents timing attacks on secret comparison.
 */
function safeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still do a comparison to prevent length-based timing leak
    crypto.timingSafeEqual(Buffer.alloc(b.length), Buffer.alloc(b.length));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function adminLoginPage(returnPath, errorMsg) {
  const safeReturn = escapeHtml(decodeURIComponent(returnPath || '/admin'));
  const errorHtml = errorMsg ? `<div class="err">${escapeHtml(errorMsg)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YieldSwarm — Admin Login</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#07080c;color:#eceef5;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background-image:radial-gradient(ellipse at 50% 0%,rgba(0,255,136,0.06) 0%,transparent 60%);}
    .box{background:#0d0e14;border:1px solid rgba(0,255,136,0.12);border-radius:16px;padding:2.5rem;max-width:380px;width:100%;box-shadow:0 0 40px rgba(0,255,136,0.05);}
    .rune{text-align:center;font-size:2rem;margin-bottom:1rem;opacity:0.7;}
    .logo{color:#00ff88;font-family:monospace;font-size:0.75rem;letter-spacing:0.12em;margin-bottom:0.5rem;text-align:center;text-transform:uppercase;}
    h1{font-size:1.15rem;font-weight:700;margin-bottom:0.3rem;color:#eceef5;text-align:center;}
    .sub{color:#8a8ea6;font-size:0.82rem;margin-bottom:1.6rem;text-align:center;}
    label{display:block;font-size:0.75rem;color:#8a8ea6;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:0.35rem;}
    input[type=password]{width:100%;background:#13151e;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:0.75rem 1rem;color:#eceef5;font-size:0.9rem;margin-bottom:1.2rem;outline:none;font-family:monospace;transition:border-color 0.2s;}
    input[type=password]:focus{border-color:#00ff88;}
    button{width:100%;background:#00ff88;color:#07080c;font-weight:800;font-size:0.9rem;padding:0.78rem;border:none;border-radius:8px;cursor:pointer;letter-spacing:0.04em;transition:opacity 0.15s;}
    button:hover{opacity:0.88;}
    .err{background:rgba(255,80,80,0.12);border:1px solid rgba(255,80,80,0.3);border-radius:8px;padding:0.6rem 0.9rem;color:#ff6b6b;font-size:0.82rem;margin-bottom:1rem;text-align:center;}
    .divider{border:none;border-top:1px solid rgba(255,255,255,0.05);margin:1.5rem 0;}
    .footer{color:#4a4e6a;font-size:0.75rem;text-align:center;font-family:monospace;}
  </style>
</head>
<body>
  <div class="box">
    <div class="rune">ᚢ</div>
    <div class="logo">YIELDSWARM ✦ NORNWEAVE</div>
    <h1>Admin Access</h1>
    <p class="sub">Authenticated by NORNWEAVE 5-layer encryption</p>
    ${errorHtml}
    <form method="POST" action="/admin/login">
      <input type="hidden" name="return_path" value="${safeReturn}">
      <label for="pw">Admin Password</label>
      <input type="password" id="pw" name="admin_secret" placeholder="••••••••••••••••••••••••••••••••" autofocus required autocomplete="current-password">
      <button type="submit">Authenticate →</button>
    </form>
    <hr class="divider">
    <div class="footer">RUNIC DSL ✦ SOVEREIGN STACK ✦ AEGIS PROTECTED</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));
}

/**
 * Log token-based admin access to audit_logs for security audit trail.
 * Fire-and-forget — failures don't block the response.
 */
async function logTokenAccess(path, ip) {
  const p = pool;
  if (!p) return;
  await p.query(
    `INSERT INTO audit_logs (actor_type, actor_ip, action, resource_type, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    ['admin_bypass_token', ip, 'admin_token_access', 'admin_panel',
     JSON.stringify({ path, bypass_method: 'ADMIN_ACCESS_TOKEN', occurred_at: new Date().toISOString() })]
  );
}

/**
 * Dedicated login router — mounted at /admin BEFORE requireAdmin.
 * GET  /admin/login  → 200 login page (no auth gate — avoids redirect loop)
 * POST /admin/login  → validate secret, set cookie, redirect to /admin (or ?return=)
 */
const adminLoginRouter = express.Router();

adminLoginRouter.get('/login', (req, res) => {
  // Already authenticated — skip to admin home
  const token = getAdminToken(req);
  if (token) {
    const session = SESSION_STORE.get(token);
    if (session && session.expiresAt > Date.now()) return res.redirect('/admin');
  }
  res.status(200).send(adminLoginPage(req.query.return || '/admin'));
});

adminLoginRouter.post('/login', (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).send('Admin not configured');

  const submitted = (req.body && req.body.admin_secret) || '';
  const returnTo = (req.body && req.body.return_path) || '/admin';

  if (!safeEquals(submitted, secret)) {
    return res.status(401).send(adminLoginPage(returnTo, 'Invalid password. Try again.'));
  }

  const token = createAdminSession(getIp(req));
  res.cookie('ys_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_TOKEN_TTL,
  });
  // Sanitize returnTo — only allow internal /admin/* paths
  const safe = /^\/admin(\/|$)/.test(returnTo) ? returnTo : '/admin';
  return res.redirect(302, safe);
});

module.exports = { requireAdmin, createAdminSession, adminLoginRouter };
