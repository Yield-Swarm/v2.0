// server.js — Express entry point. Owns: middleware, route mounts, app.listen.
// Does NOT own: query logic (db/), route handlers (routes/).
// PAINE_PREFLIGHT: routes/paine-preflight.js added 2026-06-09.
// KYROS_FIX: mountGroup4 safe require wrappers (2026-06-12)
console.log('[BOOT] Starting server.js...');
require('./lib/memory-guard'); // MUST be first — monkey-patches setInterval for OOM protection
console.log('[BOOT] memory-guard loaded');
const Sentry = require('./sentry.server.config');
global.Sentry = Sentry;
console.log('[BOOT] Sentry loaded');

const express = require('express');
console.log('[BOOT] express loaded');
const path = require('path');
const { requestLogger } = require('./middleware/request-logger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/error-handler');
const { limiters } = require('./middleware/rate-limiter');
const { securityHeaders, corsMiddleware, sanitizeBody, bodyLimitAuth } = require('./middleware/security-headers');
const { requireAdmin, adminLoginRouter } = require('./middleware/admin-auth');
const { homepageHandler, warmHomepageCache } = require('./lib/homepage-handler');
const { compress } = require('./middleware/compress');
const { ouroborosCache } = require('./middleware/ouroboros-cache');
const { runicDecoder } = require('./middleware/runic-decoder');
const { adminAccelerator } = require('./middleware/admin-accelerator');
const { i18nMiddleware, buildT, SUPPORTED_LOCALES } = require('./middleware/i18n');
const { envBadgeMiddleware } = require('./middleware/env-badge');
const { memoryPressureMiddleware } = require('./middleware/memory-pressure');
const { mountAllRoutes } = require('./routes/index');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// Global crash guards
process.on('unhandledRejection', (reason) => {
  console.error('[crash-guard] Unhandled rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[crash-guard] Uncaught exception:', err.message, err.stack?.split('\n')[1]?.trim());
  if (err.code === 'ERR_SOCKET_CANNOT_SEND' || err.message?.includes('ENOMEM')) process.exit(1);
});

// Routes/DB/env guard — exits process on critical failures before Express starts
require('./lib/startup-guard').runStartupGuard().catch(err => {
  console.error('[BOOT] startup-guard fatal:', err.message);
  process.exit(1);
});

require('./services/env-config'); // validates DATABASE_URL + ADMIN_SECRET or exits

// Raw body for Square webhooks (must precede express.json)
app.use('/api/webhooks/square', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/square/earnings', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/square/franchise', require('./routes/franchise-webhook'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parser
app.use((req, _res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    header.split(';').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const key = pair.slice(0, idx).trim();
        const val = decodeURIComponent(pair.slice(idx + 1).trim());
        req.cookies[key] = val;
      }
    });
  }
  next();
});
// EJS view engine — enable template caching to avoid re-compiling 13+ partials per request
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', true);
app.use((_req, res, next) => {
  res.locals.ga4Id = process.env.GA4_MEASUREMENT_ID || '';
  res.locals.baseUrl = `https://${_req.headers.host}`;
  res.locals.tawkPropertyId = process.env.ADMIN_TAWKTO_PROPERTY_ID || null;
  res.locals.sentryDsn = process.env.SENTRY_DSN || '';
  next();
});
app.use(envBadgeMiddleware); // TESTNET/MAINNET classification + network banner

// www redirect
app.use((req, res, next) => {
  if (req.hostname === 'www.yieldswarm.polsia.app') {
    return res.redirect(301, `https://yieldswarm.polsia.app${req.originalUrl}`);
  }
  next();
});

app.use(i18nMiddleware); // locale detection (cookie → IP geo → Accept-Language → 'en') + t() helper
app.use(requestLogger); app.use(securityHeaders); app.use(corsMiddleware); // request logging; CSP/HSTS/X-Frame + CORS whitelist
app.use(sanitizeBody); app.use(ouroborosCache); app.use(runicDecoder); // strip XSS; Ouroboros cache; RUNIC DSL decoder
if (process.env.SENTRY_DSN) app.use(Sentry.requestHandler()); // Sentry request capture (only if DSN configured)

// Static files + custom headers
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  setHeaders(res, fp) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (/\b(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)\b/i.test(fp)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\b(xml|txt|json)\b/i.test(fp)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// Helix cache + memory guard + rate limits
app.use(require('./services/helix-optimizer').helixCacheMiddleware);
app.use(memoryPressureMiddleware);
app.use('/api', limiters.general);
app.use(compress);

// Mount all routes (extracted to routes/index.js)
console.log('[BOOT] mounting routes...');
// A single broken route mount must not take down the whole server. Without
// this guard a throw in mountAllRoutes (e.g. an undefined router or a bad
// app.use arg) skips app.listen entirely → the port never binds → 502.
// Mount best-effort and keep booting so /health + app.listen still run.
try {
  mountAllRoutes(app);
} catch (err) {
  console.error(
    '[crash-guard] mountAllRoutes failed; continuing with partial routes:',
    err && err.message,
    err && err.stack && err.stack.split('\n')[1] && err.stack.split('\n')[1].trim()
  );
}
// DePIN Prong B — Desktop Node Controller download page (inline, avoids crash-guard boundary)
app.get('/depin/download', (req, res) => {
  res.render('depin-download', {
    title: 'Download YieldSwarm Node Controller — Desktop',
    installerUrl: '/files/yieldswarm-depin-desktop-setup.exe',
  });
});
console.log('[BOOT] /depin/download registered');

// Yield Optimizer — autonomous vault migration with Council gate
app.use('/', require('./routes/yield-optimizer'));
console.log('[BOOT] yield-optimizer mounted');
console.log('[BOOT] routes mounted');

// Lightweight health endpoint — responds without any DB calls for Render health probes
// /api/health mirrors /health for Render YAML healthCheckPath compatibility
const healthHandler = (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.set('Connection', 'close');
  res.json({ status: 'ok', ts: Date.now() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// CI/CD status endpoint — public deployment status (no auth required)
const ciStatusRouter = require('./routes/ci-status');
app.use('/api/ci', ciStatusRouter);

// Download endpoints — code tarball + smart sync script for Azure VM sync
const downloadRouter = require('./routes/download');
app.use('/api', downloadRouter); // mounts: /api/download/code + /api/download/sync

// Multi-Cloud Infrastructure Status — GET /api/infrastructure/status
const infrastructureDb = require('./db/cloud-infrastructure');
app.get('/api/infrastructure/status', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const rows = await infrastructureDb.getInfrastructureStatus().catch(() => []);
    const COSTS = { azure: 249, gcp: 89, aws: 450, akash: 180, ovh: 39 };
    res.json({
      azure:  { status: rows.find(r => r.provider === 'azure')?.status || 'unknown', region: 'East US', service: 'Primary VM' },
      gcp:    { status: rows.find(r => r.provider === 'gcp')?.status || 'unknown', region: 'us-central1', service: 'Cloud SQL' },
      aws:    { status: rows.find(r => r.provider === 'aws')?.status || 'unknown', region: 'us-east-1', service: 'SageMaker LLM' },
      akash:  { status: rows.find(r => r.provider === 'akash')?.status || 'unknown', region: 'Chain 8', service: 'GPU Compute' },
      ovh:    { status: rows.find(r => r.provider === 'ovhcloud')?.status || 'unknown', region: 'Gravelines (GRA)', service: 'Backup VM' },
      total_cost_mo: Object.values(COSTS).reduce((a, b) => a + b, 0),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: e.message });
  }
});
console.log('[BOOT] infrastructure status endpoint registered');

// Error handlers
app.use((err, req, res, next) => {
  if (!res.headersSent) {
    const s = err.status || err.statusCode || 500;
    if (s >= 400) console.log('[error-tracked]', s, req.path);
  }
  if (Sentry && Sentry.captureException) {
    Sentry.captureException(err, { extra: { path: req.path, method: req.method } });
  }
  next(err);
});
app.use(notFoundHandler);
app.use(globalErrorHandler);

const httpServer = app.listen(port, () => {
  // Signal PM2 that the app is ready (wait_ready: true in ecosystem.config.js)
  if (process.send) {
    process.send('ready');
    console.log('[PM2] ready signal sent');
  }
  if (process.env.SOCKET_IO_ENABLED !== 'false') {
    try {
      const { Server } = require('socket.io');
      const io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingTimeout: 60000,
      });
      io.on('connection', (socket) => {
        console.log('[socket.io] client connected:', socket.id);
        socket.join('all');
        socket.on('subscribe', (room) => {
          if (['vaults', 'mining', 'analytics', 'chain', 'agents', 'transparency'].includes(room)) {
            socket.join(room);
            console.log(`[socket.io] ${socket.id} joined: ${room}`);
          }
        });
        socket.on('unsubscribe', (room) => socket.leave(room));
        socket.on('disconnect', () => console.log('[socket.io] disconnected:', socket.id));
      });
      global.__socketIO = io;
      app.set('_io', io);
      console.log('[socket.io] initialized — rooms: vaults, mining, analytics, chain, agents, transparency, all');
    } catch (err) {
      console.warn('[socket.io] init failed:', err.message, '— continuing without WebSocket');
    }
  } else {
    console.log('[socket.io] disabled via SOCKET_IO_ENABLED=false');
  }

  require('./services/startup-migrate').catch(err => console.error('[migrate] fatal:', err.message));
  // Non-blocking bittensor wallet seed — Papa Odin TAO Vault via Taostats
  (async () => {
    try {
      const { seedDefaultWallets } = require('./db/bittensor');
      await seedDefaultWallets();
      console.log('[BOOT] Bittensor wallets seeded — Papa Odin TAO Vault ready');
    } catch (err) {
      console.warn('[BOOT] Bittensor seed skipped:', err.message);
    }
  })();
  console.log(`[READY] Server running on port ${port}`);
  warmHomepageCache(app, { buildT, SUPPORTED_LOCALES }).finally(() => {
    try {
      require('./services/boot-manager').startBootSequence(httpServer).catch(err => console.error('[boot-manager] fatal:', err.message));
    } catch (err) {
      console.error('[boot-manager] sync fatal:', err.message);
    }
  });
});