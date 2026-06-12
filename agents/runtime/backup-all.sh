#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-all.sh — Master backup orchestrator for CO-Springs deploy
# Run this BEFORE every push_to_prod.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "═══════════════════════════════════════════════════════"
echo "  YieldSwarm CO-Springs Pre-Deploy Backup"
echo "  $(date -u +'%Y-%m-%d %H:%M UTC')"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Database snapshot ──────────────────────────────────────
echo "[1/4] Snapshotting Neon Postgres..."
if [ -z "${DATABASE_URL:-}" ]; then
  echo "  ⚠️  DATABASE_URL not set — skipping DB snapshot"
  echo "  Set it with: export DATABASE_URL='REDACTED do
  if [ -f "${file}" ]; then
    git ls-files --error-unmatch "${file}" >/dev/null 2>&1 && echo "  ✓ ${file}" || { echo "  ⚠️  ${file} not tracked in git"; ALL_PRESENT=false; }
  else
    echo "  ✗ ${file} MISSING"
    ALL_PRESENT=false
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Backup complete — $(date -u +'%Y-%m-%d %H:%M UTC')"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Ready to push. To rollback:"
echo "  git revert HEAD && git push origin main"
echo ""
echo "To restore DB (requires DATABASE_URL):"
ls -t backups/yieldswarm_pre_co_springs_*.sql 2>/dev/null | head -1 | xargs -I{} echo "  psql \""${DATABASE_URL:-<set DATABASE_URL>}"\" < {}"