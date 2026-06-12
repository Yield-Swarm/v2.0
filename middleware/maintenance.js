/**
 * middleware/maintenance.js — Maintenance mode + deploy gate.
 * Owns: maintenance banner HTML, mode toggle, deploy status tracking.
 * Does NOT own: health endpoints (always bypass), route logic.
 */

const { pool } = require('../db/index');

// In-memory state (reset on process restart, which is fine — we want to re-evaluate on deploy)
let _maintenanceMode = false;
let _maintenanceReason = 'Deploying update — back in ~2 minutes';
let _deployStatus = {
  status: 'live',           // 'live' | 'deploying' | 'maintenance'
  last_deploy: null,
  next_deploy_eta: null,
  commit: process.env.COMMIT_SHA || 'unknown',
  uptime_start: new Date().toISOString(),
};

// Paths that always bypass maintenance mode
const BYPASS_PATHS = [
  '/health', '/healthz', '/api/health', '/api/deploy-status', '/status',
  '/api/internal/state', '/api/admin/maintenance-mode',
];

function maintenanceMiddleware(req, res, next) {
  // Always allow bypass paths
  if (BYPASS_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }
  // Allow admin login so operators can toggle off
  if (req.path === '/admin/login') return next();

  if (!_maintenanceMode) return next();

  // Serve maintenance page
  res.status(503).set('Retry-After', '120').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YieldSwarm — Updating</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#08090d;color:#e8eaf0;font-family:'Space Grotesk',system-ui,sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
          border-radius:16px;padding:3rem 2.5rem;max-width:480px;width:100%;text-align:center}
    .logo{width:48px;height:48px;border-radius:10px;margin:0 auto 1.5rem}
    .spinner{width:36px;height:36px;border:3px solid rgba(0,255,136,0.2);
             border-top-color:#00ff88;border-radius:50%;animation:spin 1s linear infinite;margin:1.5rem auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:1.4rem;font-weight:700;color:#e8eaf0;margin-bottom:.75rem}
    p{color:#8b8fa3;font-size:.95rem;line-height:1.6;margin-bottom:1rem}
    .badge{display:inline-block;padding:.3rem .8rem;background:rgba(0,255,136,0.1);
           border:1px solid rgba(0,255,136,0.25);border-radius:20px;color:#00ff88;
           font-size:.8rem;font-weight:600}
    .timer{margin-top:1.5rem;color:#8b8fa3;font-size:.82rem}
  </style>
  <meta http-equiv="refresh" content="30">
</head>
<body>
  <div class="card">
    <img class="logo" src="https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/company_122611/images/2d250401-ff8e-4eb2-a3c1-b66e57f8bd24.png" alt="YieldSwarm">
    <div class="spinner"></div>
    <h1>🔱 Deploying Update</h1>
    <p>${_maintenanceReason}</p>
    <span class="badge">⚡ Auto-refreshing in 30s</span>
    <p class="timer">The swarm continues working in the background.</p>
  </div>
</body>
</html>`);
}

function setMaintenanceMode(enabled, reason) {
  _maintenanceMode = !!enabled;
  if (reason) _maintenanceReason = reason;
  _deployStatus.status = enabled ? 'maintenance' : 'live';
}

function setDeployStatus(update) {
  Object.assign(_deployStatus, update);
}

function getDeployStatus() {
  return { ..._deployStatus };
}

module.exports = { maintenanceMiddleware, setMaintenanceMode, setDeployStatus, getDeployStatus };
