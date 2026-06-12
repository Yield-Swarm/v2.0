// services/env-config.js — Validates critical environment variables
// Exits process if DATABASE_URL or ADMIN_SECRET is missing in production

function validateEnv() {
  const critical = ['DATABASE_URL', 'ADMIN_SECRET'];
  const missing = critical.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error('[env-config] Missing critical env vars:', missing.join(', '));
    if (process.env.NODE_ENV === 'production') {
      console.error('[env-config] Exiting — production requires all critical env vars');
      process.exit(1);
    } else {
      console.warn('[env-config] Development mode — continuing with degraded functionality');
    }
  } else {
    console.log('[env-config] All critical env vars present');
  }
}

validateEnv();
module.exports = {};
