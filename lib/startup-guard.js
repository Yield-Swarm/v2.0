// lib/startup-guard.js — Validates routes, DB, env before Express starts
// Prevents silent boot failures that result in 502 errors

const fs = require('fs');
const path = require('path');

async function runStartupGuard() {
  const issues = [];

  // 1. Check required env vars
  const required = ['DATABASE_URL', 'ADMIN_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      issues.push(`Missing env: ${key}`);
    }
  }

  // 2. Check views directory exists
  const viewsDir = path.join(__dirname, '../views');
  if (!fs.existsSync(viewsDir)) {
    issues.push('views/ directory missing — EJS templates will fail');
  }

  // 3. Check public directory exists
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    issues.push('public/ directory missing — static assets will fail');
  }

  // 4. Check critical routes files exist
  const criticalRoutes = [
    'routes/index.js',
    'routes/yield-optimizer.js',
  ];
  for (const file of criticalRoutes) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) {
      issues.push(`Missing route: ${file}`);
    }
  }

  if (issues.length > 0) {
    console.warn('[startup-guard] Issues found:');
    issues.forEach(i => console.warn('  -', i));
    console.warn('[startup-guard] Continuing boot with degraded functionality');
  } else {
    console.log('[startup-guard] All checks passed');
  }
}

module.exports = { runStartupGuard };
