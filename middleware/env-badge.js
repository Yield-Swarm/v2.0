/**
 * middleware/env-badge.js — MAINNET/TESTNET Environment Badge + Network Banner Injector
 * Owns: Detecting environment mode + URL-path classification, injecting envMode + envBadgeHtml
 *       + networkBanner + networkToastScript into res.locals.
 * Does NOT own: route mounting (server.js), nav partial rendering.
 *
 * SOP: Every new page/dashboard/component MUST include the env badge + network banner
 * (nav partial handles this automatically). Zero cross-contamination between environments.
 */
'use strict';

const { classifyNetwork, badgeHtml, bannerHtml, toastScript } = require('../lib/network-banner');

// Resolve current environment mode
// Priority: admin cookie override → NODE_ENV → default MAINNET
function resolveMode(req) {
  // Admin cookie allows forced toggle (set by /admin/environment)
  const cookieOverride = req.cookies && req.cookies['ys_env_mode'];
  if (cookieOverride === 'TESTNET' || cookieOverride === 'MAINNET') return cookieOverride;

  const nodeEnv = (process.env.NODE_ENV || 'production').toLowerCase();
  if (nodeEnv === 'test' || nodeEnv === 'testing' || nodeEnv === 'staging') return 'TESTNET';
  return 'MAINNET';
}

// Build badge HTML inline (no template dep — safe for use before EJS render)
function buildBadgeHtml(mode) {
  if (mode === 'TESTNET') {
    return `<span class="ys-env-badge ys-env-testnet" title="Test/staging environment — data is not live" aria-label="Testnet environment">` +
      `🟡 TESTNET</span>`;
  }
  return `<span class="ys-env-badge ys-env-mainnet" title="Live production environment" aria-label="Mainnet environment">` +
    `🟢 MAINNET</span>`;
}

// CSS injected once via res.locals — embed in layout or partials
const ENV_BADGE_CSS = `
<style>
.ys-env-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;
  font-family:'Space Grotesk',monospace;font-size:11px;font-weight:700;letter-spacing:.04em;
  vertical-align:middle;user-select:none;white-space:nowrap;}
.ys-env-mainnet{background:rgba(0,255,100,0.12);color:#00ff88;border:1px solid rgba(0,255,136,0.3);}
.ys-env-testnet{background:rgba(255,220,0,0.12);color:#ffd700;border:1px solid rgba(255,210,0,0.35);}
</style>`;

/**
 * Express middleware — call app.use(envBadgeMiddleware) before route mounts.
 * Injects into res.locals:
 *   envMode          — 'MAINNET' | 'TESTNET'
 *   envBadgeHtml     — ready-to-render badge HTML string (includes icon + label)
 *   envBadgeCss      — badge stylesheet (embed once in layout <head>)
 *   isMainnet        — boolean shorthand
 *   isTestnet        — boolean shorthand
 *   envMode          — 'MAINNET' | 'TESTNET' (aliases networkMode for lib compat)
 *   networkBanner    — sticky banner HTML (testnet/mixed/mainnet classification)
 *   networkToastScript — JS toast to fire on page load
 *   envMode          — 'mainnet'|'testnet'|'mixed' (URL-path classification, EJS compat)
 *   envBadgeHtml     — nav badge HTML (EJS compat)
 */
function envBadgeMiddleware(req, res, next) {
  const mode = resolveMode(req);
  res.locals.envMode = mode;
  res.locals.envBadgeHtml = buildBadgeHtml(mode);
  res.locals.envBadgeCss = ENV_BADGE_CSS;
  res.locals.isMainnet = mode === 'MAINNET';
  res.locals.isTestnet = mode === 'TESTNET';

  // URL-path based classification for network banner
  const netMode = classifyNetwork(req.path || req.originalUrl || '');
  res.locals.networkBanner = bannerHtml(netMode);
  res.locals.networkToastScript = toastScript(netMode);

  next();
}

module.exports = { envBadgeMiddleware, resolveMode, buildBadgeHtml, ENV_BADGE_CSS };
